import { gql, graphqlMutation, graphqlQuery } from '../../../shared/api/graphql';
import type {
  AuthResponse,
  ForgotPasswordResponse,
  LoginResponse,
  ResetPasswordPayload,
  TotpSetupResponse,
  User,
} from '../types/auth.types';

const AUTH_REGISTER = gql`
  mutation AuthRegister($input: JSONObject!) {
    authRegister(input: $input)
  }
`;

const AUTH_LOGIN = gql`
  mutation AuthLogin($input: JSONObject!) {
    authLogin(input: $input)
  }
`;

const AUTH_REFRESH = gql`
  mutation AuthRefresh($input: JSONObject!) {
    authRefresh(input: $input)
  }
`;

const AUTH_LOGOUT = gql`
  mutation AuthLogout {
    authLogout
  }
`;

const AUTH_FORGOT_PASSWORD = gql`
  mutation AuthForgotPassword($input: JSONObject!) {
    authForgotPassword(input: $input)
  }
`;

const AUTH_RESET_PASSWORD = gql`
  mutation AuthResetPassword($input: JSONObject!) {
    authResetPassword(input: $input)
  }
`;

const AUTH_PROFILE = gql`
  query AuthProfile {
    authProfile
  }
`;

const AUTH_GENERATE_TOTP = gql`
  mutation AuthGenerateTotp {
    authGenerateTotp
  }
`;

const AUTH_ENABLE_TOTP = gql`
  mutation AuthEnableTotp($input: JSONObject!) {
    authEnableTotp(input: $input)
  }
`;

const AUTH_VERIFY_TOTP = gql`
  mutation AuthVerifyTotp($input: JSONObject!) {
    authVerifyTotp(input: $input)
  }
`;

const AUTH_DISABLE_TOTP = gql`
  mutation AuthDisableTotp {
    authDisableTotp
  }
`;

export const authService = {
  async register(data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }): Promise<AuthResponse> {
    const result = await graphqlMutation<
      { authRegister: AuthResponse },
      { input: typeof data }
    >(AUTH_REGISTER, { input: data });
    return result.authRegister;
  },

  async login(data: { email: string; password: string }): Promise<LoginResponse> {
    const result = await graphqlMutation<
      { authLogin: LoginResponse },
      { input: typeof data }
    >(AUTH_LOGIN, { input: data });
    return result.authLogin;
  },

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const result = await graphqlMutation<
      { authRefresh: AuthResponse },
      { input: { refreshToken: string } }
    >(
      AUTH_REFRESH,
      {
        input: { refreshToken },
      },
      { skipAuthRefresh: true },
    );
    return result.authRefresh;
  },

  async logout(): Promise<void> {
    await graphqlMutation<{ authLogout: { message: string } }>(AUTH_LOGOUT);
  },

  async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    const result = await graphqlMutation<
      { authForgotPassword: ForgotPasswordResponse },
      { input: { email: string } }
    >(AUTH_FORGOT_PASSWORD, { input: { email } });
    return result.authForgotPassword;
  },

  async resetPassword(data: ResetPasswordPayload): Promise<{ message: string }> {
    const result = await graphqlMutation<
      { authResetPassword: { message: string } },
      { input: ResetPasswordPayload }
    >(AUTH_RESET_PASSWORD, { input: data });
    return result.authResetPassword;
  },

  async getProfile(): Promise<User> {
    const result = await graphqlQuery<{ authProfile: User }>(AUTH_PROFILE);
    return result.authProfile;
  },

  async generateTotp(): Promise<TotpSetupResponse> {
    const result = await graphqlMutation<
      { authGenerateTotp: TotpSetupResponse }
    >(AUTH_GENERATE_TOTP);
    return result.authGenerateTotp;
  },

  async enableTotp(code: string): Promise<{ message: string }> {
    const result = await graphqlMutation<
      { authEnableTotp: { message: string } },
      { input: { code: string } }
    >(AUTH_ENABLE_TOTP, { input: { code } });
    return result.authEnableTotp;
  },

  async verifyTotp(tempToken: string, code: string): Promise<AuthResponse> {
    const result = await graphqlMutation<
      { authVerifyTotp: AuthResponse },
      { input: { tempToken: string; code: string } }
    >(AUTH_VERIFY_TOTP, { input: { tempToken, code } });
    return result.authVerifyTotp;
  },

  async disableTotp(): Promise<{ message: string }> {
    const result = await graphqlMutation<
      { authDisableTotp: { message: string } }
    >(AUTH_DISABLE_TOTP);
    return result.authDisableTotp;
  },
};
