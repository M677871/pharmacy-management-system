import { UnauthorizedException, UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyTotpLoginDto } from './dto/verify-totp-login.dto';
import { VerifyTotpDto } from './dto/verify-totp.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import {
  JsonObject,
  toValidatedDto,
} from '../../common/graphql/graphql-dto.util';

@Resolver()
export class AuthResolver {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Query(() => GraphQLJSON, { name: 'authProfile' })
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: User) {
    return this.usersService.sanitizeUser(user);
  }

  @Mutation(() => GraphQLJSON, { name: 'authRegister' })
  async register(
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(RegisterDto, input);
    return this.authService.register(dto);
  }

  @Mutation(() => GraphQLJSON, { name: 'authLogin' })
  async login(
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(LoginDto, input);
    const user = await this.authService.validateUser(dto.email, dto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.authService.login(user);
  }

  @Mutation(() => GraphQLJSON, { name: 'authRefresh' })
  async refresh(
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(RefreshTokenDto, input);
    const decoded = this.authService.decodeRefreshToken(dto.refreshToken);
    return this.authService.refreshTokens(decoded.sub, dto.refreshToken);
  }

  @Mutation(() => GraphQLJSON, { name: 'authLogout' })
  @UseGuards(JwtAuthGuard)
  logout(@CurrentUser() user: User) {
    return this.authService.logout(user.id);
  }

  @Mutation(() => GraphQLJSON, { name: 'authForgotPassword' })
  async forgotPassword(
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(ForgotPasswordDto, input);
    return this.authService.forgotPassword(dto.email);
  }

  @Mutation(() => GraphQLJSON, { name: 'authResetPassword' })
  async resetPassword(
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(ResetPasswordDto, input);
    return this.authService.resetPassword(dto);
  }

  @Mutation(() => GraphQLJSON, { name: 'authGenerateTotp' })
  @UseGuards(JwtAuthGuard)
  generateTotp(@CurrentUser() user: User) {
    return this.authService.generateTotpSecret(user.id);
  }

  @Mutation(() => GraphQLJSON, { name: 'authEnableTotp' })
  @UseGuards(JwtAuthGuard)
  async enableTotp(
    @CurrentUser() user: User,
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(VerifyTotpDto, input);
    return this.authService.enableTotp(user.id, dto.code);
  }

  @Mutation(() => GraphQLJSON, { name: 'authVerifyTotp' })
  async verifyTotp(
    @Args('input', { type: () => GraphQLJSONObject }) input: JsonObject,
  ) {
    const dto = await toValidatedDto(VerifyTotpLoginDto, input);
    return this.authService.verifyTotpAndLogin(dto.tempToken, dto.code);
  }

  @Mutation(() => GraphQLJSON, { name: 'authDisableTotp' })
  @UseGuards(JwtAuthGuard)
  disableTotp(@CurrentUser() user: User) {
    return this.authService.disableTotp(user.id);
  }
}
