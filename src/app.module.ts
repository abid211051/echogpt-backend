import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { SubscriptionModule } from './subscriptions/subscription.module.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './database/prisma.module.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    SubscriptionModule,
    HealthModule,
  ],
})
export class AppModule {}
