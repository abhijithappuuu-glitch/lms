import { Module } from '@nestjs/common';
import { DelegationController } from './delegation.controller';
import { DelegationService } from './delegation.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DelegationController],
  providers: [DelegationService],
  exports: [DelegationService],
})
export class DelegationModule {}
