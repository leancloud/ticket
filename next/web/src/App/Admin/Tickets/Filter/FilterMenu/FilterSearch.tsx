import { forwardRef } from 'react';
import { HiOutlineSearch, HiX } from 'react-icons/hi';
import cx from 'classnames';

export interface FilterSearchProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const FilterSearch = forwardRef<HTMLInputElement, FilterSearchProps>(
  ({ value, onChange, className }, ref) => {
    return (
      <div className={cx('flex items-center border border-[#cfd7df] bg-white', className)}>
        <HiOutlineSearch className={`w-4 h-4 m-2 ${value ? 'invisible' : 'visible'}`} />
        <input
          ref={ref}
          className="outline-none grow py-1 leading-[46px]"
          placeholder="搜索视图"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {value !== '' && (
          <button className="mx-4" onClick={() => onChange('')}>
            <HiX className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }
);
