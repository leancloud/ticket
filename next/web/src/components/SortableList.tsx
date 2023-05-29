import { createContext, CSSProperties, ReactNode, RefCallback, useContext, useMemo } from 'react';
import { DndContext, DragEndEvent, UniqueIdentifier } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove } from '@dnd-kit/sortable';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';

interface RenderContext {
  isDragging: boolean;
  container: {
    ref: RefCallback<HTMLElement>;
    style: Pick<CSSProperties, 'transition' | 'transform' | 'zIndex'>;
  };
  activator: {
    [key: string]: any;
    ref: RefCallback<HTMLElement>;
    style: Pick<CSSProperties, 'cursor'>;
  };
}

interface RenderContextEx<Item> extends RenderContext {
  item: Item;
  index: number;
  items: Item[];
}

const SortItemContext = createContext<RenderContext>({} as any);

export const useSortItem = () => useContext(SortItemContext);

interface SortItemProps {
  id: UniqueIdentifier;
  render: (ctx: RenderContext) => ReactNode;
}

function SortItem({ id, render }: SortItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const ctx: RenderContext = {
    isDragging,
    container: {
      ref: setNodeRef,
      style: {
        transition,
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 5000 : undefined,
      },
    },
    activator: {
      ...attributes,
      ...listeners,
      ref: setActivatorNodeRef,
      style: {
        cursor: isDragging ? 'grabbing' : 'grab',
      },
    },
  };

  return <SortItemContext.Provider value={ctx}>{render(ctx)}</SortItemContext.Provider>;
}

function defaultItemKey(item: any) {
  return item.id;
}

interface SortableListProps<Item> {
  items: Item[];
  itemKey?: (item: Item) => UniqueIdentifier;
  render: (ctx: RenderContextEx<Item>) => ReactNode;
  onMove?: (fromIndex: number, toIndex: number) => void;
  onChange?: (items: Item[]) => void;
}

export function SortableList<Item>({
  items,
  itemKey = defaultItemKey,
  render,
  onMove,
  onChange,
}: SortableListProps<Item>) {
  const wrappedItems = useMemo(() => items.map((item) => ({ id: itemKey(item), item })), [items]);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || (!onMove && !onChange)) {
      return;
    }
    const fromIndex = wrappedItems.findIndex((item) => item.id === active.id);
    const toIndex = wrappedItems.findIndex((item) => item.id === over.id);
    if (onMove) {
      onMove(fromIndex, toIndex);
    }
    if (onChange) {
      onChange(arrayMove(items, fromIndex, toIndex));
    }
  };

  return (
    <DndContext
      modifiers={[restrictToParentElement, restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={wrappedItems}>
        {wrappedItems.map(({ id, item }, index) => (
          <SortItem key={id} id={id} render={(ctx) => render({ ...ctx, item, index, items })} />
        ))}
      </SortableContext>
    </DndContext>
  );
}
