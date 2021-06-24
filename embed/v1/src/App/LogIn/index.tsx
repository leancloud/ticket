import { Page } from 'components/Page';

export default function LogIn() {
  return (
    <Page>
      <div className="h-full flex justify-center items-center">
        <div className="text-gray-500">检测到你未登录账号，请登录后重试。</div>
      </div>
    </Page>
  );
}
