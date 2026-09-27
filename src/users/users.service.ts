import { Injectable, UnauthorizedException } from '@nestjs/common';

import argon2 from 'argon2';

import { PrismaService } from '../database/prisma.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        fname: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    try {
      return await this.prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          ...(dto.email && {
            email: dto.email.trim().toLowerCase(),
          }),

          ...(dto.fname !== undefined && {
            fname: dto.fname.trim(),
          }),
        },
        select: {
          id: true,
          email: true,
          fname: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const valid = await argon2.verify(user.password, dto.currentPassword);

    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const newPasswordHash = await argon2.hash(dto.newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          password: newPasswordHash,
        },
      }),

      this.prisma.session.updateMany({
        where: {
          userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      }),
    ]);

    return {
      message: 'Password changed successfully. Please log in again.',
    };
  }

  async deleteAccount(userId: string) {
    const result = await this.prisma.user.deleteMany({
      where: {
        id: userId,
      },
    });

    if (result.count === 0) {
      throw new UnauthorizedException('User not found');
    }

    return {
      message: 'Account deleted successfully',
    };
  }
}
