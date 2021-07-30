import { createElement } from 'react';
import classNames from 'classnames';

import styles from './index.module.css';

// TODO: type defination
export interface ButtonProps extends Record<string, any> {
  as?: any;
}

export function Button({ as = 'button', ...props }: ButtonProps) {
  return createElement(as, {
    ...props,
    className: classNames(
      styles.button,
      'px-4 py-2 rounded-full bg-tapBlue text-white text-center font-bold select-none',
      props.className
    ),
  });
}
