import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { DelegationService } from './delegation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';

@UseGuards(JwtAuthGuard)
@Controller('delegations')
export class DelegationController {
  constructor(private readonly delegationService: DelegationService) {}

  @Post()
  createDelegation(@GetUser() user: JwtPayload, @Body() body: any) {
    return this.delegationService.createDelegation(user, body);
  }

  @Get('my')
  getMyDelegations(@GetUser() user: JwtPayload) {
    return this.delegationService.getDelegationsGiven(user.userId);
  }

  @Get('received')
  getReceivedDelegations(@GetUser() user: JwtPayload) {
    return this.delegationService.getDelegationsReceived(user.userId);
  }

  @Post(':id/revoke')
  revokeDelegation(@GetUser() user: JwtPayload, @Param('id') id: string) {
    return this.delegationService.revokeDelegation(user.userId, id);
  }
}
