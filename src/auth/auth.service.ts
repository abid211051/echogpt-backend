import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service.js';

import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshDto } from './dto/refresh.dto.js';

import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const email = registerDto.email.toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await argon2.hash(registerDto.password);

    const user = await this.prisma.user.create({
      data: {
        email,
        fname: registerDto.fname,
        password: hashedPassword,
        role: 'USER',
      },
    });

    return this.createTokens(user);
  }

  async login(loginDto: LoginDto) {
    const email = loginDto.email.toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await argon2.verify(user.password, loginDto.password);

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.createTokens(user);
  }

  async refresh(refreshDto: RefreshDto) {
    const session = await this.prisma.session.findUnique({
      where: {
        refreshToken: refreshDto.refreshToken,
      },
      include: {
        user: true,
      },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (session.revokedAt) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: session.user.id,
      email: session.user.email,
      role: session.user.role,
      sid: session.id,
    });

    return {
      accessToken,
    };
  }

  async logout(refreshDto: RefreshDto) {
    await this.prisma.session.updateMany({
      where: {
        refreshToken: refreshDto.refreshToken,
        revokedAt: null,
      },

      data: {
        revokedAt: new Date(),
      },
    });

    return {
      message: 'Logged out successfully',
    };
  }

  private async createTokens(user: {
    id: string;
    email: string;
    role: string;
  }) {
    const refreshToken = randomBytes(32).toString('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 15);

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt,
      },
    });

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
      sid: session.id,
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
