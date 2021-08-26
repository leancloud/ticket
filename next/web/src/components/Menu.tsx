import { ComponentPropsWithRef, ReactNode, createContext, useContext, forwardRef } from 'react';
import { HiCheck } from 'react-icons/hi';
import cx from 'classnames';

const MenuContext = createContext<{
  onSelect?: (eventKey: string) => void;
}>({});

export interface MenuItemProps {
  eventKey: string;
  active?: boolean;
  children?: ReactNode;
}

export function MenuItem({ eventKey, active, children }: MenuItemProps) {
  const { onSelect } = useContext(MenuContext);
  return (
    <button
      className={cx(
        'flex items-center w-full text-left px-2 py-1 rounded hover:bg-gray-200 whitespace-nowrap',
        {
          'text-primary': active,
        }
      )}
      onClick={() => onSelect?.(eventKey)}
    >
      <span className="flex-grow">{children}</span>
      <HiCheck className={`ml-2 ${active ? 'visible' : 'invisible'}`} />
    </button>
  );
}

export function MenuDivider() {
  return <hr className="my-2" />;
}

export interface MenuProps extends Omit<ComponentPropsWithRef<'div'>, 'onSelect'> {
  onSelect?: (eventKey: string) => void;
}

export const Menu = forwardRef<HTMLDivElement, MenuProps>(
  ({ className, onSelect, ...props }, ref) => {
    return (
      <MenuContext.Provider value={{ onSelect }}>
        <div
          {...props}
          ref={ref}
          className={cx('bg-white border border-gray-300 rounded p-2 select-none', className)}
        />
      </MenuContext.Provider>
    );
  }
);

export default Object.assign(Menu, {
  Item: MenuItem,
  Divider: MenuDivider,
});
