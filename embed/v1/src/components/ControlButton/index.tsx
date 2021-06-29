import { useHistory } from 'react-router-dom';
import { ChevronLeftIcon, HomeIcon } from '@heroicons/react/outline';

import styles from './index.module.css';

function Divider() {
  return <div className="bg-gray-200 h-4 w-px" />;
}

export function ControlButton() {
  const history = useHistory();
  const goBack = () => history.goBack();
  const goHome = () => history.push('/home');

  return (
    <div
      className={`${styles.controlButton} absolute top-6 left-12 flex items-center bg-white text-gray-400 rounded-full overflow-hidden`}
    >
      <div className="px-2 py-1 active:bg-gray-100 select-none cursor-pointer" onClick={goBack}>
        <ChevronLeftIcon className="h-5 w-5" />
      </div>
      <Divider />
      <div className="px-2 py-1 active:bg-gray-100 select-none cursor-pointer" onClick={goHome}>
        <HomeIcon className="h-5 w-5" />
      </div>
    </div>
  );
}
