import { Alert, Button } from '@/components/antd';

const DEFAULT_MESSAGE = 'Something went wrong';

export interface RetryProps {
  message?: string;
  error?: Error | string | null;
  onRetry: () => void;
}

export function Retry({ message, error, onRetry }: RetryProps) {
  return (
    <Alert
      message={message ?? DEFAULT_MESSAGE}
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
