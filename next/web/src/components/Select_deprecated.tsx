import { Key, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HiSelector, HiX } from 'react-icons/hi';
import cx from 'classnames';
import { castArray, difference, intersection } from 'lodash-es';

type TypeFields<O, T> = { [K in keyof O]: O[K] extends T ? K : never }[keyof O];

type ValueType<T, Multi extends boolean> = Multi extends true ? T[] : T;

export interface SelectProps<T, Multi extends boolean> {
  options?: T[];
  keyField?: TypeFields<T, Key>;
  textField?: TypeFields<T, string>;
  value?: T | T[];
  multiple?: Multi;
  onChange?: (value: ValueType<T, Multi>) => void;
  placeholder?: string;
  hideSelected?: boolean;
}

/**
 * @deprecated
 */
export function Select<T, Multi extends boolean = false>({
  options = [],
  keyField,
  textField,
  value,
  multiple,
  onChange,
  placeholder,
  hideSelected,
}: SelectProps<T, Multi>) {
  const $input = useRef<HTMLInputElement>(null!);
  const $menu = useRef<HTMLUListElement>(null);
  const [isFocus, setIsFocus] = useState(false);
  const [isShowOptions, setIsShowOptions] = useState(false);

  useEffect(() => {
    if (isShowOptions && $menu.current) {
      $menu.current.scrollIntoView();
    }
  }, [isShowOptions]);

  const getKey = useCallback(
    (option: T, index: number) => {
      if (!keyField) {
        return index;
      }
      return (option[keyField] as any) as Key;
    },
    [keyField]
  );
  const getText = useCallback(
    (option: T) => {
      if (textField) {
        return (option[textField] as any) as string;
      }
      return JSON.stringify(option);
    },
    [textField]
  );

  const [selected, rest] = useMemo(() => {
    if (!value) {
      return [[], options];
    }
    const selected = intersection(castArray(value), options);
    if (hideSelected) {
      return [selected, difference(options, castArray(value))];
    } else {
      return [selected, options];
    }
  }, [options, value, hideSelected]);

  const [keyword, setKeyword] = useState('');

  const filtered = useMemo(() => {
    const kwd = keyword.trim().toLowerCase();
    if (!kwd) {
      return rest;
    }
    return rest.filter((option) => getText(option).toLowerCase().includes(kwd));
  }, [rest, keyword, getText]);

  const [currentIndex, setCurrentIndex] = useState<number>();

  const moveDown = useCallback(() => {
    setCurrentIndex((prev) => {
      if (rest.length) {
        if (prev === undefined) {
          return 0;
        } else {
          return Math.min(prev + 1, rest.length - 1);
        }
      }
    });
  }, [rest]);
  const moveUp = useCallback(() => {
    setCurrentIndex((prev) => {
      if (rest.length) {
        if (prev === undefined) {
          return rest.length - 1;
        } else {
          return Math.max(prev - 1, 0);
        }
      }
    });
  }, [rest]);

  const select = useCallback(
    (option?: T) => {
      if (onChange) {
        if (multiple) {
          onChange((option ? selected.concat(option) : []) as any);
        } else {
          onChange(option as any);
        }
      }
    },
    [multiple, onChange, selected]
  );

  return (
    <div
      tabIndex={-1}
      className="relative outline-none"
      onFocus={() => setIsFocus(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as any)) {
          setIsFocus(false);
          setIsShowOptions(false);
          setKeyword('');
          setCurrentIndex(undefined);
        }
      }}
      onKeyDown={(e) => {
        switch (e.key) {
          case 'ArrowDown':
            if (isShowOptions) {
              moveDown();
            } else {
              setIsShowOptions(true);
            }
            break;
          case 'ArrowUp':
            if (isShowOptions) {
              moveUp();
            } else {
              setIsShowOptions(true);
            }
            break;
          case ' ':
          case 'Enter':
            if (isShowOptions && !keyword && currentIndex !== undefined) {
              e.preventDefault();
              select(rest[currentIndex]);
              setIsShowOptions(false);
            }
            break;
          case 'Escape':
            setIsShowOptions(false);
            break;
        }
      }}
    >
      <div
        className={cx(
          'flex items-center transition-colors bg-white border rounded border-gray-300 px-2 py-1',
          {
            'hover:border-gray-400': !isFocus,
            'border-primary ring-1 ring-primary': isFocus,
          }
        )}
        onClick={() => setIsShowOptions(!isShowOptions)}
      >
        <div className="flex-grow flex flex-wrap gap-1 overflow-hidden">
          {multiple
            ? selected.map((option, index) => (
                <span
                  key={getKey(option, index)}
                  className="bg-gray-200 h-6 text-sm rounded inline-flex items-center overflow-hidden"
                >
                  <span className="px-1 select-none">{getText(option)}</span>
                  <button
                    className="px-0.5 h-full transition-colors hover:bg-gray-300"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onChange?.(selected.filter((o) => o !== option) as any);
                      $input.current.focus();
                    }}
                  >
                    <HiX />
                  </button>
                </span>
              ))
            : value &&
              !keyword && <div className="absolute pointer-events-none">{getText(value as T)}</div>}

          <input
            ref={$input}
            className="flex-grow flex-shrink outline-none rounded cursor-default"
            style={{ width: keyword.length + 'em' }}
            value={keyword}
            placeholder={selected.length ? undefined : placeholder}
            onChange={(e) => {
              setKeyword(e.target.value);
              setIsShowOptions(true);
            }}
            onKeyDown={(e) => {
              if (multiple && e.key === 'Backspace') {
                if (e.metaKey) {
                  select();
                } else {
                  onChange?.(selected.slice(0, -1) as any);
                }
              }
            }}
          />
        </div>

        <span className="flex-shrink-0 pointer-events-none">
          <HiSelector className="w-4 h-4 text-gray-400" />
        </span>
      </div>

      {isShowOptions && (
        <ul
          ref={$menu}
          className="absolute top-full mt-1.5 bg-white z-10 w-full max-h-60 overflow-y-auto border rounded border-gray-300 shadow-lg text-gray-600"
        >
          {filtered.length ? (
            filtered.map((option, index) => (
              <li
                key={getKey(option, index)}
                className={cx(
                  'px-2 py-1.5 hover:bg-primary-200 active:bg-primary-300 select-none',
                  {
                    'bg-primary-100': currentIndex === index,
                  }
                )}
                onClick={() => {
                  select(option);
                  if (!multiple) {
                    setIsShowOptions(false);
                  }
                }}
              >
                {getText(option)}
              </li>
            ))
          ) : (
            <li className="px-2 py-1.5 select-none text-center text-gray-400">No options</li>
          )}
        </ul>
      )}
    </div>
  );
}
