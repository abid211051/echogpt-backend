import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../common/guards/jwt-auth.guard.js';
import { SubscriptionService } from './subscription.service.js';

@Controller('subscription')
@UseGuards(AuthGuard)
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('plans')
  getPlans() {
    return this.subscriptionService.getPlans();
  }

  @Get()
  getSubscription(@Req() req: any) {
    return this.subscriptionService.getSubscription(req.user.sub);
  }

  @Get('status')
  getStatus(@Req() req: any) {
    return this.subscriptionService.getStatus(req.user.sub);
  }

  @Get('usage')
  getUsage(@Req() req: any) {
    return this.subscriptionService.getUsage(req.user.sub);
  }

  @Get('remaining')
  getRemainingRequests(@Req() req: any) {
    return this.subscriptionService.getRemainingRequests(req.user.sub);
  }

  @Post('upgrade')
  upgrade(@Req() req: any) {
    return this.subscriptionService.upgrade(req.user.sub);
  }

  @Post('downgrade')
  downgrade(@Req() req: any) {
    return this.subscriptionService.downgrade(req.user.sub);
  }
}
