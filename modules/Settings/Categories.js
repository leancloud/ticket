import React, { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { Table } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from 'react-query'
import _ from 'lodash'
import { http } from 'lib/leancloud'
import { useAppContext } from 'modules/context'
import { GroupLabel } from '../components/Group'
import { auth } from '../../lib/leancloud'
import { getCustomerServices } from '../common'
import { UserLabel } from '../UserLabel'

const convertTreeData = (data, sortByKeys, parentKey = 'parent_id') => {
  const innerFunc = (parents, children) => {
    if (parents && parents.length > 0 && children && children.length > 0) {
      parents.forEach((p) => {
        const [cs, others] = _.partition(children, (c) => c[parentKey] == p.id)
        if (cs.length > 0) {
          p.children = _.sortBy(cs, sortByKeys)
          cs.forEach((c) => (c.parent = p))
          innerFunc(p.children, others)
        }
      })
    }
  }
  const [parents, children] = _.partition(data, (o) => !o[parentKey])
  innerFunc(parents, children)
  return _.sortBy(parents, sortByKeys)
}

export const useCategories = (queryConfig = {}) => {
  return useQuery({
    queryKey: ['setting/Categories'],
    queryFn: () =>
      http.get('/api/1/categories', {
        params: {
          active: true,
        },
      }),
    select: (res) => convertTreeData(res, ['position']),
    initialData: [],
    keepPreviousData: true,
    ...queryConfig,
  })
}

const TableRow = memo(({ data, admin, otherServices, onCategoriesChange, prefix = '' }) => {
  const { addNotification } = useAppContext()
  const handleCategoryChange = useCallback(
    (newCategories) => {
      auth.currentUser
        .update({ categories: newCategories })
        .then(() => onCategoriesChange(newCategories))
        .catch(addNotification)
    },
    [addNotification, onCategoriesChange]
  )

  const otherUsers = useMemo(() => {
    return otherServices.filter(
      (customer) =>
        customer.categories && customer.categories.some((category) => category.objectId === data.id)
    )
  }, [otherServices, data.id])

  const categories = admin && admin.categories ? admin.categories : []
  return (
    <>
      <tr>
        <td>
          {prefix && <span>{prefix}</span>}
          <Link to={'/settings/categories/' + data.id}>{data.name}</Link>
        </td>
        <td>
          <input
            type="checkbox"
            checked={categories.includes(data.id)}
            onChange={(e) => {
              const { checked } = e.target
              const newCategories = checked
                ? Array.from(new Set([...categories, data.id]))
                : categories.filter((category) => category !== data.id)
              handleCategoryChange(newCategories)
            }}
          />
        </td>
        <td>
          {otherUsers.map((user) => (
            <span key={user.objectId}>
              <UserLabel user={user} />{' '}
            </span>
          ))}
        </td>
        <td>{data.group && <GroupLabel groupId={data.group.objectId} />}</td>
      </tr>
      {data.children &&
        data.children.map((childrenData) => (
          <TableRow
            key={childrenData.id}
            data={childrenData}
            otherServices={otherServices}
            admin={admin}
            onCategoriesChange={onCategoriesChange}
            prefix={prefix ? `\u00a0\u00a0\u00a0\u00a0${prefix}` : '\u00a0\u00a0└ '}
          />
        ))}
    </>
  )
})

const Categories = memo(() => {
  const { t } = useTranslation()
  const { addNotification } = useAppContext()
  const { data } = useCategories({
    onError: addNotification,
  })
  const {
    data: [[admin], otherServices],
    refetch,
  } = useQuery({
    queryKey: ['setting/customerServices', auth.currentUser.id],
    queryFn: () => getCustomerServices(),
    select: (users) =>
      _(users)
        .map((user) => user.toJSON())
        .partition((user) => user.objectId === auth.currentUser.id)
        .valueOf(),
    onError: addNotification,
    initialData: [],
  })

  return (
    <div>
      <Link to={'/settings/categories/_new'}>{t('newCategory')}</Link>{' '}
      <Link to={'/settings/categorySort'}>{t('reorder')}</Link>
      <Table bordered size="sm">
        <thead>
          <tr>
            <th>{t('name')}</th>
            <th>{t('assigned')}</th>
            <th>{t('assignTo')}</th>
            <th>{t('assignToGroup')}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((rowData) => (
            <TableRow
              key={rowData.id}
              onCategoriesChange={refetch}
              data={rowData}
              otherServices={otherServices}
              admin={admin}
            />
          ))}
        </tbody>
      </Table>
    </div>
  )
})

export default Categories
