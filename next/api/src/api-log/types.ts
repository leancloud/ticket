export interface ApiLog {
  timestamp: string;
  method: string;
  route: string;
  url: string;
  host: string;
  statusCode: number;
  processTime: number;
  appId: string;
  productId?: string;
  userId?: string;
  userAgent?: string;
  referer?: string;
}
