import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  async createFreeSubscription(tx: any, userId: string) {
    const freePlan = await tx.plan.upsert({
      where: {
        type: 'FREE',
      },
      update: {},
      create: {
        type: 'FREE',
        name: 'Free',
        monthlyLimit: 50,
      },
    });

    const now = new Date();

    const periodStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );

    const periodEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    );

    return tx.subscription.create({
      data: {
        userId,
        planId: freePlan.id,
        status: 'ACTIVE',
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
    });
  }

  async getPlans() {
    return this.prisma.plan.findMany({
      orderBy: {
        monthlyLimit: 'asc',
      },
    });
  }

  async getSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: {
        userId,
      },
      include: {
        plan: true,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }

  async getStatus(userId: string) {
    const subscription = await this.getSubscription(userId);

    return {
      status: subscription.status,
      plan: subscription.plan.type,
      planName: subscription.plan.name,
      monthlyLimit: subscription.plan.monthlyLimit,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
    };
  }

  async getUsage(userId: string) {
    const subscription = await this.getSubscription(userId);

    const usage = await this.prisma.usageRecord.findUnique({
      where: {
        userId_periodStart: {
          userId,
          periodStart: subscription.currentPeriodStart,
        },
      },
    });

    const used = usage?.requestCount ?? 0;
    const limit = subscription.plan.monthlyLimit;

    return {
      plan: subscription.plan.type,
      limit,
      used,
      remaining: Math.max(limit - used, 0),
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
    };
  }

  async getRemainingRequests(userId: string) {
    const usage = await this.getUsage(userId);

    return {
      remaining: usage.remaining,
      limit: usage.limit,
      used: usage.used,
      periodStart: usage.periodStart,
      periodEnd: usage.periodEnd,
    };
  }

  async upgrade(userId: string) {
    await this.getSubscription(userId);

    const premiumPlan = await this.prisma.plan.findUnique({
      where: {
        type: 'PREMIUM',
      },
    });

    if (!premiumPlan) {
      throw new NotFoundException('Premium plan not found');
    }

    return this.prisma.subscription.update({
      where: {
        userId,
      },
      data: {
        planId: premiumPlan.id,
        status: 'ACTIVE',
      },
      include: {
        plan: true,
      },
    });
  }

  async downgrade(userId: string) {
    await this.getSubscription(userId);

    const freePlan = await this.prisma.plan.findUnique({
      where: {
        type: 'FREE',
      },
    });

    if (!freePlan) {
      throw new NotFoundException('Free plan not found');
    }

    return this.prisma.subscription.update({
      where: {
        userId,
      },
      data: {
        planId: freePlan.id,
        status: 'ACTIVE',
      },
      include: {
        plan: true,
      },
    });
  }

  async consumeRequest(userId: string) {
    const subscription = await this.getSubscription(userId);

    if (subscription.status !== 'ACTIVE') {
      throw new ForbiddenException('Subscription is not active');
    }

    const limit = subscription.plan.monthlyLimit;

    await this.prisma.usageRecord.createMany({
      data: {
        userId,
        periodStart: subscription.currentPeriodStart,
        periodEnd: subscription.currentPeriodEnd,
      },
      skipDuplicates: true,
    });

    const result = await this.prisma.usageRecord.updateMany({
      where: {
        userId,
        periodStart: subscription.currentPeriodStart,
        requestCount: {
          lt: limit,
        },
      },
      data: {
        requestCount: {
          increment: 1,
        },
      },
    });

    if (result.count === 0) {
      throw new BadRequestException('Monthly request limit reached');
    }

    return true;
  }
}
