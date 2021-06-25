import classNames from 'classnames';

import styles from './index.module.css';

type IntrinsicButtonProps = JSX.IntrinsicElements['button'];

export interface ButtonProps extends IntrinsicButtonProps {}

export function Button({ children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={classNames(
        props.className,
        styles.button,
        'bg-tapBlue-600 text-white font-bold',
        'px-4 py-2 rounded-full'
      )}
    >
      {children}
    </button>
  );
}
