import { ExclamationCircleIcon } from '@heroicons/react/solid';

function getErrorMessage(error: any): string | null {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return null;
}

export function APIError({ error }: { error?: any }) {
  return (
    <div className="flex flex-col items-center text-red-500">
      <ExclamationCircleIcon className="w-12 h-12 m-8" />
      {error && <div>{getErrorMessage(error)}</div>}
    </div>
  );
}
