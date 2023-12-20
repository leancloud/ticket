import { atom, useRecoilState } from 'recoil';

interface AppState {
  topicIndex: number;
  historyIndex: number;
}

const appState = atom<AppState>({
  key: 'app',
  default: {
    topicIndex: 0,
    historyIndex: 0,
  },
});

export function useAppState() {
  return useRecoilState(appState);
}
