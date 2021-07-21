import { useHistory } from 'react-router-dom';
import { ChevronLeftIcon, HomeIcon, XIcon } from '@heroicons/react/outline';

import styles from './index.module.css';

function Divider() {
  return <div className="bg-gray-200 h-4 w-px" />;
}

export function ControlButton() {
  const history = useHistory();
  const goBack = () => history.goBack();
  const goHome = () => history.push('/');

  return (
    <div
      className={`${styles.shadow} absolute top-4 sm:top-6 sm:left-4 flex items-center bg-white text-gray-400 rounded-full overflow-hidden`}
    >
      <button className="px-2 py-1 active:bg-gray-100" onClick={goBack}>
        <ChevronLeftIcon className="h-5 w-5" />
      </button>
      <Divider />
      <button className="px-2 py-1 active:bg-gray-100" onClick={goHome}>
        <HomeIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
