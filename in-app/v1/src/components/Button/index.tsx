import { createElement } from 'react';
import classNames from 'classnames';

import styles from './index.module.css';

// TODO: type defination
export interface ButtonProps extends Record<string, any> {
  as?: any;
  secondary?: boolean;
}

export function Button({ as = 'button', secondary, className, ...props }: ButtonProps) {
  return createElement(as, {
    ...props,
    className: classNames(
      styles.button,
      'leading-9 px-4 rounded-full text-center font-bold select-none',
      secondary? styles.secondary : styles.primary,
      secondary ? 'border border-gray-200 hover:text-tapBlue hover:border-tapBlue focus:text-tapBlue focus:border-tapBlue' : 'bg-tapBlue text-white',
      className
    ),
  });
}
