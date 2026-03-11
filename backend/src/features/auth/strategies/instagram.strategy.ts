import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InstagramStrategy extends PassportStrategy(Strategy, 'instagram') {
  constructor(configService: ConfigService) {
    super({
      authorizationURL: 'https://api.instagram.com/oauth/authorize',
      tokenURL: 'https://api.instagram.com/oauth/access_token',
      clientID: configService.get<string>('INSTAGRAM_CLIENT_ID', 'not-configured'),
      clientSecret: configService.get<string>('INSTAGRAM_CLIENT_SECRET', 'not-configured'),
      callbackURL: configService.get<string>('INSTAGRAM_CALLBACK_URL'),
      scope: ['user_profile'],
    });
  }

  async validate(
    accessToken: string,
    _refreshToken: string,
    _profile: any,
  ): Promise<any> {
    // Instagram Graph API — fetch basic profile
    const res = await fetch(
      `https://graph.instagram.com/me?fields=id,username&access_token=${encodeURIComponent(accessToken)}`,
    );
    const data = await res.json();
    return {
      instagramId: data.id,
      email: null,
      firstName: data.username || '',
      lastName: '',
    };
  }
}
