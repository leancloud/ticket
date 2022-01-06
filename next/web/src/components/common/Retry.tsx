import { Alert, Button } from '@/components/antd';

export interface RetryProps {
  message: string;
  error?: Error | string;
  onRetry: () => void;
}

export function Retry({ message, error, onRetry }: RetryProps) {
  return (
    <Alert
      message={message}
      type="error"
      showIcon
      description={error && (typeof error === 'string' ? error : error.message)}
      action={
        <Button size="small" danger onClick={() => onRetry()}>
          Retry
        </Button>
      }
    />
  );
}
