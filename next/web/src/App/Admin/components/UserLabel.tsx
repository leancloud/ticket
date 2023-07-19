import cx from 'classnames';

export interface UserLabelProps {
  className?: string;
  user: {
    nickname: string;
    avatarUrl: string;
    username: string;
  };
  displayUsername?: boolean;
}

export function UserLabel({ className, user, displayUsername }: UserLabelProps) {
  return (
    <div className={cx('flex items-center', className)}>
      <img className="w-4 h-4 rounded-sm" src={user.avatarUrl} />
      <div className="ml-1">{user.nickname}</div>
      {displayUsername && user.username !== user.nickname && (
        <div className="ml-1">({user.username})</div>
      )}
    </div>
  );
}
