import { useQuery } from 'react-query';

import { db, getLeanCloudApp, getLeanCloudAppUrl } from '@/leancloud';
import { Button } from '@/components/antd';

interface LeanCloudAppProps {
  ticketId: string;
  username: string;
}

export function LeanCloudApp({ ticketId, username }: LeanCloudAppProps) {
  const { data: appId, isLoading: loadingAppId } = useQuery({
    queryKey: ['ticketAppId', ticketId],
    queryFn: () => getTicketAppId(ticketId),
  });

  const { data: app, isLoading: loadingApp } = useQuery({
    queryKey: ['LeanCloudApp', ticketId, username],
    queryFn: () => getLeanCloudApp(appId!, username),
    enabled: !!appId,
  });

  const { data: appUrl } = useQuery({
    queryKey: ['LeanCloudAppUrl', app?.appId, app?.region],
    queryFn: () => getLeanCloudAppUrl(app!.appId, app!.region),
    enabled: !!app,
  });

  if (loadingAppId || loadingApp) {
    return <Button loading>加载中</Button>;
  }

  if (!appId || !app) {
    return <Button disabled>未设置</Button>;
  }

  const button = (
    <Button disabled={!appUrl}>
      {app.appName} ({app.region})
    </Button>
  );

  return appUrl ? (
    <a href={appUrl} target="_blank">
      {button}
    </a>
  ) : (
    button
  );
}

async function getTicketAppId(ticketId: string) {
  const ticket = db.class('Ticket').object(ticketId);
  const tag = await db
    .class('Tag')
    .where('ticket', '==', ticket)
    .where('key', '==', 'appId')
    .first();
  if (tag) {
    return tag.data.value as string;
  }
}
