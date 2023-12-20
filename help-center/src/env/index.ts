import { LocalStorage } from './local-storage';

export const localStorage = window.localStorage ?? new LocalStorage();
