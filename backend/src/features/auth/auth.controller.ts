import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyTotpDto } from './dto/verify-totp.dto';
import { VerifyTotpLoginDto } from './dto/verify-totp-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  // Email / Password 

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('local'))
  login(@Req() req: { user: User }) {
    return this.authService.login(req.user);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    const decoded = this.authService.decodeRefreshToken(dto.refreshToken);
    return this.authService.refreshTokens(decoded.sub, dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  logout(@CurrentUser() user: User) {
    return this.authService.logout(user.id);
  }

  // Forgot / Reset Password

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  //Profile 

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: User) {
    const {
      password,
      refreshToken,
      totpSecret,
      passwordResetToken,
      passwordResetExpires,
      ...safe
    } = user;
    return safe;
  }

  //  TOTP 2FA

  @Post('totp/generate')
  @UseGuards(JwtAuthGuard)
  generateTotp(@CurrentUser() user: User) {
    return this.authService.generateTotpSecret(user.id);
  }

  @Post('totp/enable')
  @UseGuards(JwtAuthGuard)
  enableTotp(@CurrentUser() user: User, @Body() dto: VerifyTotpDto) {
    return this.authService.enableTotp(user.id, dto.code);
  }

  @Post('totp/verify')
  @HttpCode(HttpStatus.OK)
  verifyTotp(@Body() dto: VerifyTotpLoginDto) {
    return this.authService.verifyTotpAndLogin(dto.tempToken, dto.code);
  }

  @Post('totp/disable')
  @UseGuards(JwtAuthGuard)
  disableTotp(@CurrentUser() user: User) {
    return this.authService.disableTotp(user.id);
  }

  //Google OAuth

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin() {
    // Passport redirects to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: { user: any }, @Res() res: Response) {
    const result = await this.authService.handleSocialLogin(req.user);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    res.redirect(
      `${frontendUrl}/auth/social-callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`,
    );
  }


  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  facebookLogin() {
    // Passport redirects to Facebook
  }

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookCallback(@Req() req: { user: any }, @Res() res: Response) {
    const result = await this.authService.handleSocialLogin(req.user);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    res.redirect(
      `${frontendUrl}/auth/social-callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`,
    );
  }

  //Instagram OAuth

  @Get('instagram')
  @UseGuards(AuthGuard('instagram'))
  instagramLogin() {
    // Passport redirects to Instagram
  }

  @Get('instagram/callback')
  @UseGuards(AuthGuard('instagram'))
  async instagramCallback(@Req() req: { user: any }, @Res() res: Response) {
    const result = await this.authService.handleSocialLogin(req.user);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    res.redirect(
      `${frontendUrl}/auth/social-callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`,
    );
  }
}
