import { useContext } from 'react';
import { AppContext } from '../App';

export function useCurrentUser() {
  const { currentUser } = useContext(AppContext);
  return currentUser;
}
