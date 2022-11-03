import { ComponentPropsWithoutRef } from 'react';
import cx from 'classnames';

export function FormLabel(props: ComponentPropsWithoutRef<'div'>) {
  return <div {...props} className={cx('pb-2 cursor-default', props.className)} />;
}
