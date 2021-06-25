import classNames from 'classnames';

type IntrinsicInputProps = JSX.IntrinsicElements['input'];

export interface InputProps extends IntrinsicInputProps {}

export function Input(props: InputProps) {
  return (
    <input
      {...props}
      className={classNames(
        props.className,
        'border rounded px-2 py-1 focus:border-tapBlue-600 focus:ring-tapBlue-600 focus:ring-1'
      )}
    />
  );
}
