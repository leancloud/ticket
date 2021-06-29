export interface InputProps {
  value?: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  error?: string;
}

export function Input({ value, onChange, placeholder, error }: InputProps) {
  return (
    <div>
      <input
        className={`w-full border rounded px-2 py-1 ${
          error ? 'border-red-500' : 'focus:border-tapBlue-600 focus:ring-tapBlue-600 focus:ring-1'
        }`}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
    </div>
  );
}
