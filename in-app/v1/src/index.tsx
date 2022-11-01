import { StrictMode } from 'react';
import { render } from 'react-dom';
import { RecoilRoot } from 'recoil';
import 'github-markdown-css/github-markdown-light.css';
import './index.css';
import './i18n';
import App from './App';

render(
  <StrictMode>
    <RecoilRoot>
      <App />
    </RecoilRoot>
  </StrictMode>,
  document.getElementById('root')
);
