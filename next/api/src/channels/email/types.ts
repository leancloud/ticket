export interface CheckNewMessageJobData {
  type: 'checkNewMessage';
}

export interface ProcessMessageJobData {
  type: 'processMessage';
  email: string;
  uid: number;
  categoryId: string;
}

export type JobData = CheckNewMessageJobData | ProcessMessageJobData;
