import { ComponentPropsWithRef, forwardRef } from 'react';
import cx from 'classnames';

interface BaseButtonProps extends ComponentPropsWithRef<'button'> {
  active?: boolean;
}

const DefaultButton = forwardRef<HTMLButtonElement, BaseButtonProps>(
  ({ active, ...props }, ref) => {
    return (
      <button
        ref={ref}
        {...props}
        className={cx(
          'border border-gray-300 rounded p-2 transition-colors text-gray-600 hover:bg-gray-200 disabled:hover:bg-transparent disabled:cursor-default disabled:opacity-40',
          {
            'shadow-inner': active,
            'bg-gray-200': active,
          },
          props.className
        )}
      />
    );
  }
);

const PrimaryButton = forwardRef<HTMLButtonElement, ButtonProps>(({ active, ...props }, ref) => {
  return (
    <button
      ref={ref}
      {...props}
      className={cx(
        'p-2 bg-primary transition-colors text-white rounded disabled:opacity-50 disabled:cursor-default',
        {
          'hover:bg-primary-600 ': !props.disabled,
        },
        props.className
      )}
    />
  );
});

const components = {
  default: DefaultButton,
  primary: PrimaryButton,
};

export interface ButtonProps extends BaseButtonProps {
  variant?: keyof typeof components;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', ...props }, ref) => {
    const Component = components[variant];
    return <Component ref={ref} {...props} />;
  }
);

export default Button;
