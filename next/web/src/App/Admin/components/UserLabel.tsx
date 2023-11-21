import cx from 'classnames';
import { ComponentPropsWithoutRef, forwardRef } from 'react';

export interface UserLabelProps extends ComponentPropsWithoutRef<'div'> {
  user: {
    nickname: string;
    avatarUrl: string;
    username: string;
  };
  displayUsername?: boolean;
}

export const UserLabel = forwardRef<HTMLDivElement, UserLabelProps>(
  ({ user, displayUsername, ...props }, ref) => {
    return (
      <div {...props} ref={ref} className={cx('flex items-center', props.className)}>
        <img className="w-4 h-4 rounded-sm" src={user.avatarUrl} />
        <div className="ml-1">{user.nickname}</div>
        {displayUsername && user.username !== user.nickname && (
          <div className="ml-1">({user.username})</div>
        )}
      </div>
    );
  }
);
