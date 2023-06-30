import cx from 'classnames';

export interface UserLabelProps {
  className?: string;
  user: {
    nickname: string;
    avatarUrl: string;
  };
}

export function UserLabel({ className, user }: UserLabelProps) {
  return (
    <div className={cx('flex items-center', className)}>
      <img className="w-4 h-4 rounded-sm" src={user.avatarUrl} />
      <div className="ml-1 truncate">{user.nickname}</div>
    </div>
  );
}
