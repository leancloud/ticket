import { ComponentPropsWithRef, createContext, useContext, forwardRef } from 'react';
import { HiCheck } from 'react-icons/hi';
import cx from 'classnames';

const MenuContext = createContext<{
  onSelect?: (eventKey: string) => void;
}>({});

export interface MenuItemProps extends ComponentPropsWithRef<'button'> {
  eventKey: string;
  active?: boolean;
}

export function MenuItem({ eventKey, active, ...props }: MenuItemProps) {
  const { onSelect } = useContext(MenuContext);
  return (
    <button
      {...props}
      className={cx(
        'flex items-center w-full text-left px-2 py-1 rounded hover:bg-[#f2f5f7] whitespace-nowrap',
        {
          'text-primary': active,
        },
        props.className
      )}
      onClick={(e) => {
        onSelect?.(eventKey);
        props.onClick?.(e);
      }}
    >
      <span className="grow truncate">{props.children}</span>
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
        <div {...props} ref={ref} className={cx('bg-white p-2 select-none', className)} />
      </MenuContext.Provider>
    );
  }
);

export default Object.assign(Menu, {
  Item: MenuItem,
  Divider: MenuDivider,
});
