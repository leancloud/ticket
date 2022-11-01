import React, { useState } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Form';
import { PageContent, PageHeader } from '@/components/Page';
import {
  callHandler,
  closePage,
  openInBrowser,
  showCloseButton,
  hideCloseButton,
  loadComplete,
  getDeviceInfo,
} from '@/components/SDK';
import { useSDKInfo } from '@/components/SDK';

export default () => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [deviceInfo] = useSDKInfo();

  return (
    <>
      <PageHeader>test</PageHeader>
      <PageContent className="px-3">
        <p>
          <Input placeholder="handleName" value={name} onChange={(e) => setName(e.target.value)} />
          <button
            onClick={() => {
              callHandler('_hasNativeMethod', name, (params: any) => {
                console.log(params);
              });
            }}
          >
            _hasNativeMethod
          </button>
        </p>
        <p className="mt-4">
          <Input
            placeholder="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
            }}
          />
          <Button
            onClick={() => {
              openInBrowser(url);
            }}
          >
            openBrowser
          </Button>
        </p>
        <p className="mt-4">
          <Button
            onClick={() => {
              closePage();
            }}
          >
            closePage
          </Button>
          <Button
            onClick={() => {
              loadComplete();
            }}
          >
            loadComplete
          </Button>
        </p>
        <p className="mt-4">
          <Button
            onClick={() => {
              showCloseButton();
            }}
          >
            showCloseButton
          </Button>
          <Button
            onClick={() => {
              hideCloseButton();
            }}
          >
            hideCloseButton
          </Button>
        </p>
        <p className="mt-4">
          <Button
            onClick={() => {
              getDeviceInfo()
                .then((res) => {
                  alert(JSON.stringify(res));
                })
                .catch((error) => {
                  console.log(error);
                });
            }}
          >
            getDeviceInfo
          </Button>
        </p>
        <details>
          <summary>DeviceInfo</summary>
          <pre>
            <code>{JSON.stringify(deviceInfo, null, 2)}</code>
          </pre>
        </details>
      </PageContent>
    </>
  );
};
