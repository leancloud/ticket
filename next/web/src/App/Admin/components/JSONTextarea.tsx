import { useState } from 'react';
import { Input } from '@/components/antd';

export const JSONTextarea = ({
  value,
  onChange,
  id,
}: {
  value: Record<string, any> | undefined;
  onChange: (newValue: Record<string, any>) => any;
  id?: string;
}) => {
  const [text, setText] = useState<string>(value ? JSON.stringify(value, undefined, 2) : '');
  const [error, setError] = useState<string>();

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setError(undefined);
    try {
      if (value !== '') JSON.parse(value);
    } catch (error) {
      if (error instanceof Error) setError(error.message);
    }

    setText(value);
  };

  const handleBlur = () => {
    try {
      const newValue = text === '' ? undefined : JSON.parse(text);
      onChange(newValue);
    } catch (error) {}
  };

  return (
    <>
      <Input.TextArea onChange={handleChange} onBlur={handleBlur} value={text} id={id} />
      {error !== undefined && <div className="text-red-600">无效的 JSON： {error}</div>}
    </>
  );
};
