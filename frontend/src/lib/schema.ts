import * as z from "zod";

export const leaveApplicationSchema = z.object({
  leaveTypeId: z.string().min(1, "Please select a leave type"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  isHalfDay: z.boolean().optional(),
  reason: z.string().min(10, "Please provide a detailed reason (min 10 characters)"),
  dutyAdjustedTo: z.string().optional(),
  document: z.any().optional(), // In a real app, refine this for File objects
}).superRefine((data, ctx) => {
  // If leave requires duty adjustment (e.g. academic leave), ensure it's selected.
  // For the prototype, we can enforce it conditionally on the client or let backend handle it.
  if (data.leaveTypeId === 'academic_leave' && !data.dutyAdjustedTo) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please select a colleague to cover your duty",
      path: ["dutyAdjustedTo"]
    });
  }
  
  if (new Date(data.startDate) > new Date(data.endDate)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "End date cannot be before start date",
      path: ["endDate"]
    });
  }
});

export type LeaveApplicationFormValues = z.infer<typeof leaveApplicationSchema>;
