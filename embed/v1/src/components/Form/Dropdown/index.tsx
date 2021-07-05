import { ChevronDownIcon } from '@heroicons/react/solid';

export interface DropdownProps {
  value?: string;
  onChange?: (value: string) => void;
  options: string[];
}

export function Dropdown({ options, value, onChange }: DropdownProps) {
  return (
    <div className="relative flex items-center">
      <select className="w-full px-2 py-1 border rounded focus:border-tapBlue-600 focus:ring-1 focus:ring-tapBlue-600">
        {options.map((val) => (
          <option key={val}>{val}</option>
        ))}
      </select>
      <ChevronDownIcon className="w-4 h-4 absolute right-2 text-gray-300 pointer-events-none" />
    </div>
  );
}
