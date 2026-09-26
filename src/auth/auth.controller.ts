import { Body, Controller, Post } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshDto } from './dto/refresh.dto.js';
import { LogoutDto } from './dto/logout.dto.js';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto) {}
  @Post('login')
  login(@Body() loginDto: LoginDto) {}
  @Post('refresh')
  refresh(@Body() refreshDto: RefreshDto) {}
  @Post('logout')
  logout(@Body() logoutDto: LogoutDto) {}
}
