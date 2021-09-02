import { ComponentPropsWithoutRef, forwardRef } from 'react';
import cx from 'classnames';

export const Textarea = forwardRef<HTMLTextAreaElement, ComponentPropsWithoutRef<'textarea'>>(
  (props, ref) => {
    return (
      <textarea
        {...props}
        ref={ref}
        className={cx(
          'form-textarea text-base px-2 py-1 border-[#cfd7df] rounded focus:border-primary focus:ring-primary',
          props.className
        )}
      />
    );
  }
);
