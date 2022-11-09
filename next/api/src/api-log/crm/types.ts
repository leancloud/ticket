export interface CrmLog {
  service: 'lean-ticket';
  timestamp: string;
  method: string;
  route: string;
  url: string;
  host: string;
  status_code: number;
  process_time: number;
  app_id: string;
  product_id?: string;
  user_id?: string;
  user_agent?: string;
  referer?: string;
}
