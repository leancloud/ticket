import { useCallback, useMemo } from 'react';
import { useLocalStorage } from 'react-use';

const NORMAL_COLUMNS: string[] = [
  'status',
  'title',
  'category',
  'group',
  'assignee',
  'author',
  'language',
  'createdAt',
];

export function useTicketTableColumn() {
  const [columns, setColumns] = useLocalStorage('TapDesk/ticketTableColumns', NORMAL_COLUMNS);

  const addColumn = useCallback((id: string) => {
    setColumns((columns) => {
      if (columns?.includes(id)) {
        return columns;
      }
      return [...(columns || []), id];
    });
  }, []);

  const removeColumn = useCallback((id: string) => {
    setColumns((columns) => {
      return columns?.filter((c) => c !== id);
    });
  }, []);

  const hasCustomField = useMemo(() => {
    if (!columns) return false;
    return columns.some((col) => !NORMAL_COLUMNS.includes(col));
  }, [columns]);

  return { columns, addColumn, removeColumn, setColumns, hasCustomField };
}
