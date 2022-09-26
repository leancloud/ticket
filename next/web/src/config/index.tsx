import { setConfig } from './config';

setConfig('ticketDetail.userLabelOverlay', (user) => {
  return (
    <a href={`https://www.taptap.com/admin/user/edit/${user.username}`} target="__blank">
      TapTap 用户信息
    </a>
  );
});
