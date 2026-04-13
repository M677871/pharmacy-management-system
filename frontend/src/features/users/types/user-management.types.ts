import type { User } from '../../auth/types/auth.types';

export type ManagedUser = User;

export interface CreateManagedUserPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: User['role'];
}
