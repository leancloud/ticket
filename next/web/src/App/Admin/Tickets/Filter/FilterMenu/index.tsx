import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from 'react-query';
import { HiCheck, HiMenuAlt2, HiX } from 'react-icons/hi';
import { FiEdit, FiTrash2 } from 'react-icons/fi';
import { Dialog, Transition } from '@headlessui/react';
import { StringParam, useQueryParam } from 'use-query-params';
import { isEmpty, isNull, omitBy } from 'lodash';
import { produce } from 'immer';

import { auth } from 'leancloud';
import {
  useCreateTicketFilter,
  useDeleteTicketFilter,
  useTicketFilters,
  useUpdateTicketFilter,
} from 'api/ticket-filter';
import { useCustomerServiceGroups } from 'api/user';
import Menu from 'components/Menu';
import styles from './index.module.css';
import { FilterSearch } from './FilterSearch';
import { SaveData, SaveDialog } from './SaveDialog';
import { presetFilters } from '../prest-filters';
import { useTicketFilter } from '../../useTicketFilter';
import { useTempFilters } from '..';

function getPrivilege(filter: { userIds?: string[]; groupIds?: string[] }): SaveData['privilege'] {
  return filter.userIds ? 'private' : filter.groupIds ? 'group' : 'public';
}

interface FilterMenuProps {
  filters: { id: string; name: string }[];
  selected?: string | null;
  onSelect: (key: string) => void;
}

function FilterMenu({ filters, selected, onSelect }: FilterMenuProps) {
  return (
    <Menu className="rounded-[3px] shadow" onSelect={onSelect}>
      {filters.map(({ id, name }) => (
        <Menu.Item key={id} eventKey={id} active={id === selected}>
          {name}
        </Menu.Item>
      ))}
    </Menu>
  );
}

interface FilterMenusProps {
  open?: boolean;
  onClose: () => void;
  selected?: string | null;
  onSelect: (id: string) => void;
}

function FilterMenus({ open, onClose, selected, onSelect }: FilterMenusProps) {
  const $input = useRef<HTMLInputElement>(null!);
  const [keyword, setKeyword] = useState('');

  const { data: groups } = useCustomerServiceGroups('me', {
    enabled: !!open,
  });

  const { data: privateFilters } = useTicketFilters({
    userId: auth.currentUser?.id,
    queryOptions: {
      enabled: !!open,
      staleTime: Infinity,
    },
  });

  const { data: groupFilters } = useTicketFilters({
    groupId: groups?.map((g) => g.id),
    queryOptions: {
      enabled: !!open && !!groups,
      staleTime: Infinity,
    },
  });

  const { data: publicFilters } = useTicketFilters({
    userId: 'null',
    groupId: 'null',
    queryOptions: {
      enabled: !!open,
      staleTime: Infinity,
    },
  });

  const filteredFilters = useMemo(() => {
    const kwd = keyword.trim().toLowerCase();
    if (!kwd) {
      return [];
    }
    return [...(privateFilters ?? []), ...(publicFilters ?? []), ...presetFilters].filter((f) =>
      f.name.toLowerCase().includes(kwd)
    );
  }, [keyword, privateFilters, publicFilters]);

  const handleSelect = (id: string) => {
    onSelect(id);
    onClose();
  };

  return (
    <Transition
      show={open}
      as={Fragment}
      enter="transition"
      enterFrom="opacity-0 -translate-x-4"
      enterTo="opacity-100"
      leave="transition"
      leaveFrom="opacity-100"
      leaveTo="opacity-0 -translate-x-4"
    >
      <Dialog
        className={`${styles.menu} fixed left-16 inset-y-0 flex flex-col w-[280px] h-full bg-[#ebeff3]`}
        initialFocus={$input}
        onClose={onClose}
      >
        <FilterSearch
          ref={$input}
          className="flex-shrink-0 shadow-sm"
          value={keyword}
          onChange={setKeyword}
        />

        <div className="flex flex-grow flex-col gap-2 overflow-y-auto p-2">
          {filteredFilters.length > 0 && (
            <FilterMenu filters={filteredFilters} selected={selected} onSelect={handleSelect} />
          )}

          {!keyword && privateFilters && privateFilters.length > 0 && (
            <FilterMenu filters={privateFilters} selected={selected} onSelect={handleSelect} />
          )}

          {!keyword && groupFilters && groupFilters.length > 0 && (
            <FilterMenu filters={groupFilters} selected={selected} onSelect={handleSelect} />
          )}

          {!keyword && publicFilters && publicFilters.length > 0 && (
            <FilterMenu filters={publicFilters} selected={selected} onSelect={handleSelect} />
          )}

          {!keyword && (
            <FilterMenu filters={presetFilters} selected={selected ?? ''} onSelect={handleSelect} />
          )}
        </div>
      </Dialog>
    </Transition>
  );
}

function FilterMenuTrigger() {
  const [menusOpen, setMenusOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const toggleMenus = useCallback(() => setMenusOpen((v) => !v), []);

  const queryClient = useQueryClient();
  const [filterId, setFilterId] = useQueryParam('filterId', StringParam);
  const { filter, isPresetFilter } = useTicketFilter(filterId);
  const [tempFilters, setTempFilters] = useTempFilters();

  const $mode = useRef<'save' | 'saveAs'>('save');
  const [data, setData] = useState<SaveData>({
    name: '',
    privilege: 'private',
  });

  const { data: groups, isLoading: isLoadingGroups } = useCustomerServiceGroups('me');

  const handleOpenSaveDialog = useCallback(() => {
    if (!filter) return;
    setData({
      name: filter.name,
      privilege: getPrivilege(filter),
    });
    $mode.current = 'save';
    setSaveDialogOpen(true);
  }, [filter]);

  const handleOpenSaveAsDialog = useCallback(() => {
    if (!filter) return;
    setData({
      name: filter.name + ' 的副本',
      privilege: getPrivilege(filter),
    });
    $mode.current = 'saveAs';
    setSaveDialogOpen(true);
  }, [filter]);

  const { mutate: createFilter } = useCreateTicketFilter({
    onSuccess: ({ id }, data) => {
      queryClient.setQueryData(['ticketFilter', id], data);
      queryClient.invalidateQueries('ticketFilters');
      setFilterId(id);
      setTempFilters(undefined);
      setSaveDialogOpen(false);
    },
  });

  const handleCreateFilter = () => {
    createFilter({
      name: data.name,
      userIds: data.privilege === 'private' ? [auth.currentUser!.id] : undefined,
      groupIds: data.privilege === 'group' ? groups?.map((g) => g.id) : undefined,
      filters: omitBy({ ...filter?.filters, ...tempFilters }, isNull),
    });
  };

  const { mutate: updateFilter, isLoading: updating } = useUpdateTicketFilter({
    onSuccess: (_, data) => {
      queryClient.setQueryData<typeof filter>(['ticketFilter', data.id], (prev) => {
        if (prev) {
          return produce(prev, (draft) => {
            if (data.filters) {
              draft.filters = data.filters;
            }
          });
        }
      });
      queryClient.invalidateQueries(['ticketFilter', data.id]);
      queryClient.invalidateQueries('ticketFilters');
      setSaveDialogOpen(false);
      setTempFilters(undefined);
    },
  });

  const handleUpdateFilters = () => {
    if (!filter) return;
    const filters = omitBy({ ...filter.filters, ...tempFilters }, isNull);
    updateFilter({ id: filter.id, filters });
  };

  const handleUpdateInfo = () => {
    if (!filter) return;
    updateFilter({
      id: filter.id,
      name: data.name,
      userIds: data.privilege === 'private' ? [auth.currentUser!.id] : null,
      groupIds: data.privilege === 'group' ? groups?.map((g) => g.id) : null,
    });
  };

  const { mutate: deleteFilter, isLoading: deleting } = useDeleteTicketFilter({
    onSuccess: useCallback(() => {
      setFilterId(undefined);
      queryClient.invalidateQueries('ticketFilters');
    }, [setFilterId, queryClient]),
  });

  const handleDelete = useCallback(() => {
    if (filter && confirm('确定要删除此视图吗？')) {
      deleteFilter(filter.id);
    }
  }, [filter]);

  const disabled = updating || deleting || isLoadingGroups;
  const isDirty = !isEmpty(tempFilters);

  return (
    <div className="flex items-center">
      <button className="p-1 rounded transition-colors hover:bg-gray-200" onClick={toggleMenus}>
        <HiMenuAlt2 className="w-[21px] h-[21px]" />
      </button>

      <button className="pl-3 font-bold text-lg" onClick={toggleMenus}>
        {filter ? filter.name : 'Loading...'}
      </button>

      {isDirty && !isPresetFilter && (
        <button className="ml-3" title="保存视图" disabled={disabled} onClick={handleUpdateFilters}>
          <HiCheck className="w-[21px] h-[21px]" />
        </button>
      )}

      {isDirty && (
        <button
          className={`${styles.saveAs} ml-3`}
          title="另存为"
          disabled={false}
          onClick={handleOpenSaveAsDialog}
        >
          <HiCheck className="w-[21px] h-[21px]" />
        </button>
      )}

      {isDirty && (
        <button className="ml-3" title="丢弃更改" onClick={() => setTempFilters(undefined)}>
          <HiX className="w-[21px] h-[21px]" />
        </button>
      )}

      {!isDirty && !isPresetFilter && (
        <button className="ml-3" title="编辑视图" onClick={handleOpenSaveDialog}>
          <FiEdit className="w-4 h-4" />
        </button>
      )}

      {!isDirty && !isPresetFilter && (
        <button className="ml-3" title="删除" disabled={disabled} onClick={handleDelete}>
          <FiTrash2 className="w-4 h-4" />
        </button>
      )}

      <FilterMenus
        open={menusOpen}
        selected={filterId}
        onClose={() => setMenusOpen(false)}
        onSelect={(filterId) => {
          setFilterId(filterId);
          setTempFilters(undefined);
        }}
      />

      <SaveDialog
        className="fixed left-[120px] top-0"
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        data={data}
        onChange={setData}
        onSave={() => ($mode.current === 'save' ? handleUpdateInfo() : handleCreateFilter())}
        disabled={disabled}
      />
    </div>
  );
}

export function FilterMenuTriggerPortal() {
  const [container, setContainer] = useState<Element | null>(null);
  useEffect(() => {
    setContainer(document.querySelector('header #custom-section'));
  }, []);

  return container && createPortal(<FilterMenuTrigger />, container);
}
