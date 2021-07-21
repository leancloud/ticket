import { StrictMode } from 'react';
import { render } from 'react-dom';
import './index.css';
import './i18n';
import App from './App';

render(
  <StrictMode>
    <App />
  </StrictMode>,
  document.getElementById('root')
);
