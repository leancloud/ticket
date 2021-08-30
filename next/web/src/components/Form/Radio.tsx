import cx from 'classnames';

import { Label, LabelProps } from './Label';
import styles from './index.module.css';

export interface RadioProps extends Omit<LabelProps, 'onChange'> {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}

export function Radio({ checked, onChange, ...props }: RadioProps) {
  return (
    <Label {...props} className={cx('inline-flex items-center', props.className)}>
      <input
        className={cx(
          'appearance-none mr-1.5 w-[14px] h-[14px] rounded-full border border-[#cfd7df]',
          styles.radio
        )}
        type="radio"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      {props.children}
    </Label>
  );
}
