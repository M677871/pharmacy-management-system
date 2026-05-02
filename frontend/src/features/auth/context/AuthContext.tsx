import {
  createContext,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { User } from '../types/auth.types';
import { authService } from '../services/auth.service';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import {
  clearAuthState,
  setAuthLoading,
  setAuthUser,
} from '../state/authSlice';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  register: (data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  setAuthTokens: (accessToken: string, refreshToken: string) => void;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>(
  {} as AuthContextType,
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const { user, loading } = useAppSelector((state) => state.auth);

  const refreshProfile = useCallback(async () => {
    try {
      const profile = await authService.getProfile();
      dispatch(setAuthUser(profile));
    } catch {
      dispatch(setAuthUser(null));
    }
  }, [dispatch]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      refreshProfile().finally(() => dispatch(setAuthLoading(false)));
    } else {
      dispatch(setAuthLoading(false));
    }
  }, [dispatch, refreshProfile]);

  const setAuthTokens = useCallback(
    (accessToken: string, refreshToken: string) => {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    },
    [],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await authService.login({ email, password });
      if ('requiresTwoFactor' in result) {
        return result;
      }
      setAuthTokens(result.accessToken, result.refreshToken);
      dispatch(setAuthUser(result.user));
      return result;
    },
    [dispatch, setAuthTokens],
  );

  const register = useCallback(
    async (data: {
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
    }) => {
      const result = await authService.register(data);
      setAuthTokens(result.accessToken, result.refreshToken);
      dispatch(setAuthUser(result.user));
    },
    [dispatch, setAuthTokens],
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      dispatch(clearAuthState());
    }
  }, [dispatch]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        setAuthTokens,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
