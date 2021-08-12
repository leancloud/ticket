import { useEffect } from 'react';

export default function Settings() {
  useEffect(() => {
    history.replaceState({}, '', '/settings');
  }, []);

  return <>'Redirecting...'</>;
}
