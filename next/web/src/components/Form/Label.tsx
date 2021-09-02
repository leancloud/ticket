import { ComponentPropsWithoutRef, memo } from 'react';
import cx from 'classnames';

import styles from './index.module.css';

export interface LabelProps extends ComponentPropsWithoutRef<'label'> {
  required?: boolean;
}

export const Label = memo<LabelProps>(({ required, ...props }) => {
  return (
    <label
      {...props}
      className={cx(
        styles.label,
        'text-[#475867] text-sm font-medium',
        {
          [styles.required]: required,
        },
        props.className
      )}
    />
  );
});
