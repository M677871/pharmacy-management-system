import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User } from '../types/auth.types';

interface AuthState {
  user: User | null;
  loading: boolean;
}

const initialState: AuthState = {
  user: null,
  loading: true,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthUser(state, action: PayloadAction<User | null>) {
      state.user = action.payload;
    },
    setAuthLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    clearAuthState(state) {
      state.user = null;
      state.loading = false;
    },
  },
});

export const { clearAuthState, setAuthLoading, setAuthUser } =
  authSlice.actions;

export default authSlice.reducer;
