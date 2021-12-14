import { ComponentPropsWithoutRef } from 'react';
import cx from 'classnames';

import { useCustomerService } from 'api/user';

function CurrentUserSection(props: ComponentPropsWithoutRef<'section'>) {
  const { data, isLoading } = useCustomerService('me', {
    staleTime: Infinity,
  });

  return (
    <section {...props}>
      {isLoading && 'Loading...'}
      {data && (
        <a href="/settings/profile">
          <img className="w-8 h-8 rounded-md border border-gray-300" src={data.avatarUrl} />
        </a>
      )}
    </section>
  );
}

export function Topbar(props: ComponentPropsWithoutRef<'header'>) {
  return (
    <header
      {...props}
      className={cx('flex items-center h-16 border-b px-4 bg-white', props.className)}
    >
      <section id="custom-section" className="grow"></section>
      <CurrentUserSection className="shrink-0" />
    </header>
  );
}
