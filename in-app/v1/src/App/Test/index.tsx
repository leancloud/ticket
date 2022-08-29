import React, { useState } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Form';
import { PageContent, PageHeader } from '@/components/Page';
import { callHandler } from '@/utils/sdk';

const isInit = !!window.webViewJavascriptInterface;

export default () => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  return (
    <>
      <PageHeader>test</PageHeader>
      <PageContent className="px-3">
        <div>isInit:{isInit ? 'true' : 'false'}</div>
        <p>
          <Input placeholder="handleName" value={name} onChange={(e) => setName(e.target.value)} />
          <button
            onClick={() => {
              const res = callHandler('_hasNativeMethod', name, (params: any) => {
                console.log(params);
              });
              console.log(res);
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
              callHandler('openBrowser', url);
            }}
          >
            openBrowser
          </Button>
        </p>
        <p className="mt-4">
          <Button
            onClick={() => {
              callHandler('_closePage');
            }}
          >
            _closePage
          </Button>
          <Button
            onClick={() => {
              callHandler('loadComplete');
            }}
          >
            loadComplete
          </Button>
        </p>
        <p className="mt-4">
          <Button
            onClick={() => {
              callHandler('showCloseButton');
            }}
          >
            showCloseButton
          </Button>
          <Button
            onClick={() => {
              callHandler('hideCloseButton');
            }}
          >
            hideCloseButton
          </Button>
        </p>
      </PageContent>
    </>
  );
};
