import { FormEvent, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { auth } from '@/leancloud';
import { PageContent, PageHeader } from '@/components/Page';
import { Input } from '@/components/Form';
import { Button } from '@/components/Button';

function LogInForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    auth.login(username, password).then(() => location.reload());
  };

  return (
    <form className="m-auto" onSubmit={handleSubmit}>
      <div>
        <Input
          value={username}
          placeholder="Username"
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>
      <div className="mt-1">
        <Input
          type="password"
          value={password}
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <Button className="mt-1" type="submit" disabled={!username || !password}>
        Sign in
      </Button>
    </form>
  );
}

export default function LogIn() {
  const { t } = useTranslation();

  const showLoginForm = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.has('showLoginForm');
  }, []);

  if (auth.currentUser) {
    return <Navigate to="/" />;
  }
  return (
    <>
      <PageHeader />
      <PageContent className="flex-1">
        {showLoginForm ? (
          <LogInForm />
        ) : (
          <div className="mx-auto mt-28 sm:my-auto text-[#666]">{t('auth.not_logged_in_text')}</div>
        )}
      </PageContent>
    </>
  );
}
