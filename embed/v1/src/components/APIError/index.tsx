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
    <div className="text-red-600">
      <h1>Something went wrong.</h1>
      {error && <div>{getErrorMessage(error)}</div>}
    </div>
  );
}
