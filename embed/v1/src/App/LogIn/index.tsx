import { FormEvent, useState } from 'react';
import { Redirect, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { auth, http } from 'leancloud';
import { Page } from 'components/Page';
import { Input } from 'components/Form';
import { Button } from 'components/Button';

function LogInForm() {
  const history = useHistory();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    auth.login(username, password).then((user) => {
      http.defaults.headers['X-LC-Session'] = user.sessionToken;
      history.push('/home');
    });
  };

  return (
    <form className="absolute" onSubmit={handleSubmit}>
      <div>
        <Input
          value={username}
          placeholder="Username"
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>
      <div>
        <Input
          type="password"
          value={password}
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={!username || !password}>
        Sign in
      </Button>
    </form>
  );
}

export default function LogIn() {
  const { t } = useTranslation();

  if (auth.currentUser) {
    return <Redirect to="/home" />;
  }
  return (
    <Page>
      <div className="h-full flex justify-center items-center">
        <div className="text-gray-500">{t('auth.not_logged_in_text')}</div>
        <LogInForm />
      </div>
    </Page>
  );
}
