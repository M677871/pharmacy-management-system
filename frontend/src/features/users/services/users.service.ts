import api from '../../../shared/api/axios';
import type {
  CreateManagedUserPayload,
  ManagedUser,
} from '../types/user-management.types';

export const usersService = {
  async listUsers() {
    const { data } = await api.get<ManagedUser[]>('/users');
    return data;
  },

  async createUser(payload: CreateManagedUserPayload) {
    const { data } = await api.post<ManagedUser>('/users', payload);
    return data;
  },
};
