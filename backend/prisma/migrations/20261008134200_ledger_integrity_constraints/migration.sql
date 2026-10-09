-- =====================================================================
-- Ledger & policy integrity constraints (not expressible in Prisma schema)
--
-- Prisma Migrate does not diff CHECK constraints, functions or triggers,
-- so these survive future `prisma migrate dev` runs untouched.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. LeaveTransaction: valid transaction types and sign convention
--    CREDIT / DEBIT / REVERSAL -> amount > 0 (direction implied by type)
--    ADJUSTMENT                -> signed, non-zero
-- ---------------------------------------------------------------------
ALTER TABLE "LeaveTransaction"
  ADD CONSTRAINT "LeaveTransaction_transactionType_check"
  CHECK ("transactionType" IN ('CREDIT', 'DEBIT', 'REVERSAL', 'ADJUSTMENT'));

ALTER TABLE "LeaveTransaction"
  ADD CONSTRAINT "LeaveTransaction_amount_sign_check"
  CHECK (
    ("transactionType" IN ('CREDIT', 'DEBIT', 'REVERSAL') AND "amount" > 0)
    OR ("transactionType" = 'ADJUSTMENT' AND "amount" <> 0)
  );

-- ---------------------------------------------------------------------
-- 2. LeaveTransaction is append-only (immutable ledger)
--    Corrections must be posted as REVERSAL / ADJUSTMENT rows.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION lms_prevent_ledger_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'LeaveTransaction is append-only: % is not permitted. Post a REVERSAL or ADJUSTMENT instead.', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER "LeaveTransaction_immutable_row"
  BEFORE UPDATE OR DELETE ON "LeaveTransaction"
  FOR EACH ROW EXECUTE FUNCTION lms_prevent_ledger_mutation();

CREATE TRIGGER "LeaveTransaction_immutable_truncate"
  BEFORE TRUNCATE ON "LeaveTransaction"
  FOR EACH STATEMENT EXECUTE FUNCTION lms_prevent_ledger_mutation();

-- ---------------------------------------------------------------------
-- 3. A leave application can be debited at most once
--    (defence in depth behind LedgerService's advisory lock + check)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION lms_prevent_duplicate_debit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."transactionType" = 'DEBIT' AND NEW."applicationId" IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext('ledger-debit:' || NEW."applicationId"));
    IF EXISTS (
      SELECT 1 FROM "LeaveTransaction"
      WHERE "applicationId" = NEW."applicationId" AND "transactionType" = 'DEBIT'
    ) THEN
      RAISE EXCEPTION 'Application % has already been debited from the ledger.', NEW."applicationId"
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "LeaveTransaction_single_debit"
  BEFORE INSERT ON "LeaveTransaction"
  FOR EACH ROW EXECUTE FUNCTION lms_prevent_duplicate_debit();

-- ---------------------------------------------------------------------
-- 4. LeavePolicy: effective-dated windows must not overlap for the same
--    (leaveTypeId, employeeCategory). effectiveFrom inclusive, effectiveTo
--    exclusive, NULL effectiveTo = open-ended (currently active).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION lms_prevent_policy_overlap()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."effectiveTo" IS NOT NULL AND NEW."effectiveTo" <= NEW."effectiveFrom" THEN
    RAISE EXCEPTION 'LeavePolicy effectiveTo (%) must be after effectiveFrom (%).',
      NEW."effectiveTo", NEW."effectiveFrom"
      USING ERRCODE = 'check_violation';
  END IF;

  -- Serialise concurrent writers for the same policy key.
  PERFORM pg_advisory_xact_lock(
    hashtext('leave-policy:' || NEW."leaveTypeId" || ':' || NEW."employeeCategory")
  );

  IF EXISTS (
    SELECT 1 FROM "LeavePolicy" p
    WHERE p."leaveTypeId" = NEW."leaveTypeId"
      AND p."employeeCategory" = NEW."employeeCategory"
      AND p."id" <> NEW."id"
      AND tsrange(p."effectiveFrom", COALESCE(p."effectiveTo", 'infinity'::timestamp), '[)')
       && tsrange(NEW."effectiveFrom", COALESCE(NEW."effectiveTo", 'infinity'::timestamp), '[)')
  ) THEN
    RAISE EXCEPTION 'Overlapping LeavePolicy window for leaveType % / category %. Close the current policy (set effectiveTo) before adding a new one.',
      NEW."leaveTypeId", NEW."employeeCategory"
      USING ERRCODE = 'exclusion_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "LeavePolicy_no_overlap"
  BEFORE INSERT OR UPDATE ON "LeavePolicy"
  FOR EACH ROW EXECUTE FUNCTION lms_prevent_policy_overlap();