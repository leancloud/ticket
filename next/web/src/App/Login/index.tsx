import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Redirect } from 'react-router-dom';

import { auth } from '../../leancloud';

interface LoginFormData {
  username: string;
  password: string;
}

export default function Login() {
  const { register, handleSubmit } = useForm<LoginFormData>();
  const [errorMessage, setErrorMessage] = useState('');

  const onSubmit = handleSubmit((data) => {
    auth
      .login(data.username, data.password)
      .then(() => location.reload())
      .catch((error) => {
        console.error(error);
        setErrorMessage(error.message);
      });
  });

  if (auth.currentUser) {
    return <Redirect to="/" />;
  }

  return (
    <div className="flex h-full">
      <div className="m-auto">
        <form className="flex flex-col w-64" onSubmit={onSubmit}>
          <label>Username</label>
          <input className="border border-primary" {...register('username', { required: true })} />
          <label>Password</label>
          <input
            className="border border-primary"
            type="password"
            {...register('password', { required: true })}
          />
          <button className="bg-primary text-white mt-4" type="submit">
            Login
          </button>
        </form>
        {errorMessage && <p className="text-red-500">{errorMessage}</p>}
      </div>
    </div>
  );
}
