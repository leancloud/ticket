import { StrictMode } from 'react';
import { render } from 'react-dom';
import 'antd/dist/antd.css';

import './index.css';
import App from './App';

render(
  <StrictMode>
    <App />
  </StrictMode>,
  document.getElementById('app')
);
