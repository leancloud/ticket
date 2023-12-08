import { User } from 'open-leancloud-storage/auth';
import { atom, useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';

interface AuthState {
  user?: User;
  loading?: boolean;
  error?: Error;
}

const authState = atom<AuthState>({
  key: 'auth',
  default: {
    loading: true,
  },
});

export function useAuthState() {
  return useRecoilState(authState);
}

export function useSetAuth() {
  return useSetRecoilState(authState);
}

export function useAuth() {
  return useRecoilValue(authState);
}
