import { atom, useRecoilValue, useSetRecoilState } from 'recoil';

interface TicketInfo {
  meta?: Record<string, any>;
  fields?: Record<string, any>;
}

const ticketInfoState = atom<TicketInfo>({
  key: 'ticketInfo',
  default: {},
});

export function useSetTicketInfo() {
  return useSetRecoilState(ticketInfoState);
}

export function useTicketInfo() {
  return useRecoilValue(ticketInfoState);
}
