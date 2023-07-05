import { ComponentPropsWithoutRef, ElementType } from 'react';
import classNames from 'classnames';

import styles from './index.module.css';

export interface ButtonProps<C extends ElementType> {
  as?: C;
  secondary?: boolean;
}

export function Button<C extends ElementType = 'button'>({
  as,
  secondary,
  className,
  ...props
}: ButtonProps<C> & Omit<ComponentPropsWithoutRef<C>, keyof ButtonProps<C>>) {
  const Comp = as || 'button';

  return (
    <Comp
      className={classNames(
        styles.button,
        'leading-9 px-[0.75em] min-w-[4.5em] rounded-full text-center font-bold select-none',
        secondary ? styles.secondary : styles.primary,
        secondary
          ? 'border border-gray-200 hover:text-tapBlue hover:border-tapBlue focus:text-tapBlue focus:border-tapBlue'
          : 'bg-tapBlue text-white',
        className
      )}
      {...props}
    />
  );
}
