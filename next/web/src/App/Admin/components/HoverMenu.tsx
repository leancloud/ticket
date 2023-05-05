import { ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDebounce } from 'react-use';

export function useHover<T = unknown>(timeout = 1000) {
  const [context, setContext] = useState<T>();
  const [debouncedContext, setDebouncedContext] = useState<T>();

  useDebounce(() => setDebouncedContext(context), timeout, [context]);

  const createEventListeners = (ctx: T) => {
    const onMouseEnter = () => {
      setContext(ctx);
    };

    const onMouseLeave = () => {
      setContext(undefined);
      setDebouncedContext(undefined);
    };

    return { onMouseEnter, onMouseLeave };
  };

  return {
    hover: createEventListeners,
    context: debouncedContext,
  };
}

interface MousePosition {
  x: number;
  y: number;
}

function useGetMousePosition() {
  const mousePosition = useRef<MousePosition>({ x: 0, y: 0 });

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      mousePosition.current = { x: e.clientX, y: e.clientY };
    };
    document.addEventListener('mousemove', onMouseMove);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
    };
  });

  return () => mousePosition.current;
}

interface HoverMenuProps<T> {
  context: T | undefined;
  children: ReactNode | ((context: T) => ReactNode);
}

export function HoverMenu<T>({ context, children }: HoverMenuProps<T>) {
  const getMousePosition = useGetMousePosition();

  const observer = useRef<ResizeObserver>(null!);
  if (!observer.current) {
    observer.current = new ResizeObserver(([entry]) => {
      const { x, y } = getMousePosition();
      const el = entry.target as HTMLDivElement;
      const minLeft = document.body.clientWidth - el.offsetWidth - 16;
      const minTop = document.body.clientHeight - el.offsetHeight - 16;
      el.style.left = Math.min(x + 1, minLeft) + 'px';
      el.style.top = Math.min(y + 1, minTop) + 'px';
    });
  }

  const [delayedContext, setDelayedContext] = useState<T>();
  const entered = useRef(false);

  useEffect(() => {
    if (context) {
      setDelayedContext(context);
    } else {
      const id = setTimeout(() => {
        if (!entered.current) {
          setDelayedContext(undefined);
        }
      }, 50);
      return () => {
        clearTimeout(id);
      };
    }
  }, [context]);

  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapperElement = wrapper.current;
    if (wrapperElement) {
      observer.current.observe(wrapperElement);
      return () => {
        observer.current.unobserve(wrapperElement);
      };
    }
  }, [delayedContext]);

  if (!delayedContext) {
    return null;
  }

  const menu = (
    <div
      ref={wrapper}
      style={{
        position: 'absolute',
        zIndex: 5000,
      }}
      onMouseEnter={() => (entered.current = true)}
      onMouseLeave={() => {
        entered.current = false;
        setDelayedContext(undefined);
      }}
    >
      {typeof children === 'function' ? children(delayedContext) : children}
    </div>
  );

  return createPortal(menu, document.body);
}

interface UseHoverMenuProps<T> {
  render: (context: T) => ReactNode;
}

export function useHoverMenu<T>({ render }: UseHoverMenuProps<T>) {
  const { hover, context } = useHover<T>();

  const menu = <HoverMenu context={context} children={render} />;

  return { hover, menu };
}
