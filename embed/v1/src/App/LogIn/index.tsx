import { FormEvent, useState } from 'react';
import { useHistory } from 'react-router-dom';

import { auth } from 'leancloud';
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
      history.push('/home');
    });
  };

  return (
    <form onSubmit={handleSubmit}>
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
  return (
    <Page>
      <div className="h-full flex justify-center items-center">
        {/* <div className="text-gray-500">检测到你未登录账号，请登录后重试。</div> */}
        <LogInForm />
      </div>
    </Page>
  );
}
