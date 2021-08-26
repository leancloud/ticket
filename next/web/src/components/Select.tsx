import { Key, useCallback, useMemo, useRef, useState } from 'react';
import { HiCheck, HiSelector, HiX } from 'react-icons/hi';
import cx from 'classnames';
import { castArray } from 'lodash-es';

export interface Option<K> {
  key: K;
  text: string;
}

interface SelectedOptionsProps<K> {
  options: Option<K>[];
  onDeselect: (key: K) => void;
}

function SelectedOptions<K extends Key>({ options, onDeselect }: SelectedOptionsProps<K>) {
  return (
    <>
      {options.map(({ key, text }) => (
        <span
          key={key}
          className="inline-flex items-center h-6 bg-gray-200 rounded select-none overflow-hidden"
        >
          <span className="px-1 truncate" title={text}>
            {text}
          </span>
          <button
            className="px-0.5 h-full transition-colors hover:bg-gray-300"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => onDeselect(key)}
          >
            <HiX />
          </button>
        </span>
      ))}
    </>
  );
}

export interface SelectProps<K> {
  options?: Option<K>[];
  selected?: K | K[] | null;
  onSelect?: (key: K) => void;
  onDeselect?: (key: K) => void;
  placeholder?: string;
  closeOnChange?: boolean;
}

export function Select<K extends Key>({
  options,
  selected,
  onSelect,
  onDeselect,
  placeholder,
  closeOnChange,
}: SelectProps<K>) {
  const [isFocus, setIsFocus] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const $input = useRef<HTMLInputElement>(null!);
  const [keyword, setKeyword] = useState('');

  const filteredOptions = useMemo<Option<K>[]>(() => {
    if (!options) {
      return [];
    }
    const kwd = keyword.trim().toLocaleLowerCase();
    if (!kwd) {
      return options;
    }
    return options.filter((o) => o.text.toLocaleLowerCase().includes(kwd));
  }, [options, keyword]);

  const selectedSet = useMemo(() => new Set(castArray(selected)), [selected]);

  const select = useCallback(
    (key: K) => {
      setKeyword('');
      if (closeOnChange) {
        setIsOpen(false);
      } else {
        $input.current.focus();
      }
      onSelect?.(key);
    },
    [closeOnChange, onSelect]
  );

  const deselect = useCallback(
    (key: K) => {
      setKeyword('');
      if (closeOnChange) {
        setIsOpen(false);
      } else {
        $input.current.focus();
      }
      onDeselect?.(key);
    },
    [closeOnChange, onSelect]
  );

  const optionMap = useMemo(() => {
    const map = new Map<K, Option<K>>();
    options?.forEach((option) => map.set(option.key, option));
    return map;
  }, [options]);

  const selectedOption = useMemo(() => {
    if (selected === null || selected === undefined) {
      return undefined;
    }
    if (Array.isArray(selected)) {
      const selectedOptions: Option<K>[] = [];
      selected.forEach((key) => {
        const option = optionMap.get(key);
        if (option) {
          selectedOptions.push(option);
        }
      });
      return selectedOptions;
    }
    return optionMap.get(selected);
  }, [optionMap, selected]);

  const selectedCount = useMemo(() => {
    if (!selectedOption) {
      return 0;
    }
    return Array.isArray(selectedOption) ? selectedOption.length : 1;
  }, [selectedOption]);

  return (
    <div
      tabIndex={-1}
      className="relative outline-none"
      onFocus={() => setIsFocus(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as any)) {
          setIsFocus(false);
          setIsOpen(false);
          setKeyword('');
        }
      }}
    >
      <div
        className={cx(
          'flex items-center transition-colors bg-white border rounded border-gray-300 overflow-hidden',
          {
            'hover:border-gray-400': !isFocus,
            'border-primary ring-1 ring-primary': isFocus,
          }
        )}
        onMouseDown={(e) => {
          e.preventDefault();
          $input.current.focus();
          setIsOpen((v) => !v);
        }}
      >
        <div className="relative flex-grow flex flex-wrap items-center gap-1 pl-2 py-1 overflow-hidden">
          {selectedOption &&
            (Array.isArray(selectedOption) ? (
              <SelectedOptions options={selectedOption} onDeselect={deselect} />
            ) : (
              !keyword && (
                <div className="absolute w-full truncate" title={selectedOption.text}>
                  {selectedOption.text}
                </div>
              )
            ))}

          <input
            ref={$input}
            className="w-0 flex-grow flex-shrink outline-none cursor-default leading-6"
            style={{ width: keyword.length + 'em' }}
            placeholder={selectedCount ? undefined : placeholder}
            value={keyword}
            onChange={({ target }) => setKeyword(target.value)}
          />
        </div>

        <span className="px-1 pointer-events-none">
          <HiSelector className="w-4 h-4 text-gray-400" />
        </span>
      </div>

      {isOpen && (
        <ul className="absolute z-10 w-full max-h-64 mt-1 bg-white border rounded border-gray-300 shadow-md select-none overflow-y-auto">
          {filteredOptions.length ? (
            filteredOptions.map(({ key, text }) => {
              const active = selectedSet.has(key);
              return (
                <li
                  key={key}
                  className={cx('flex items-center px-2 leading-8 active:bg-primary-100', {
                    'hover:bg-gray-100': !active,
                    'bg-primary-100 text-primary': active,
                  })}
                  onClick={() => (active ? deselect(key) : select(key))}
                >
                  <span className="flex-grow truncate" title={text}>
                    {text}
                  </span>
                  {active && <HiCheck className="flex-shrink-0" />}
                </li>
              );
            })
          ) : (
            <li className="px-2 leading-8 text-center text-gray-400">No options</li>
          )}
        </ul>
      )}
    </div>
  );
}
