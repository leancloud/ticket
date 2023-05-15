import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Link, useHistory, useLocation } from 'react-router-dom'
import { useMutation, useQuery } from 'react-query'
import PropTypes from 'prop-types'
import qs from 'query-string'
import { auth, db } from '../../lib/leancloud'
import css from '../CustomerServiceTickets.css'

import { getCategoryPathName, getCategoriesTree } from '../common'
import { useAppContext } from '../context'
import OrganizationSelect from '../OrganizationSelect'
import TicketsMoveButton from '../TicketsMoveButton'
import { getTicketAcl } from '../../lib/common'
import { TicketItem } from './TicketItem'
import { DocumentTitle } from '../utils/DocumentTitle'
import CategoryTreeMenu from './CategoryTreeMenu'

function findTickets({ organizationId, categoryIds, page, pageSize }) {
  let query = db.class('Ticket')
  if (organizationId) {
    query = query.where('organization', '==', db.class('Organization').object(organizationId))
  } else {
    query = query.where({
      author: auth.currentUser,
      organization: db.cmd.or(null, db.cmd.notExists()),
    })
  }
  if (categoryIds?.length) {
    query = query.where('category.objectId', 'in', categoryIds)
  }
  return query
    .include('author', 'assignee')
    .limit(pageSize)
    .skip((page - 1) * pageSize)
    .orderBy('createdAt', 'desc')
    .find()
}

function moveTickets(tickets, organization) {
  const p = db.pipeline()
  tickets.forEach((ticket) => {
    const ACL = getTicketAcl(ticket.get('author'), organization)
    if (organization) {
      p.update(ticket, { ACL, organization })
    } else {
      p.update(ticket, { ACL, organization: db.op.unset() })
    }
  })
  return p.commit()
}

function findCategory(categoriesTree, id) {
  const queue = categoriesTree.slice()
  while (queue.length) {
    const category = queue.shift()
    if (category.id === id) {
      return category
    }
    if (category.children?.length) {
      category.children.forEach((c) => queue.push(c))
    }
  }
}

function useCategoryIds(categoriesTree, categoryId) {
  return useMemo(() => {
    if (categoriesTree && categoryId) {
      const category = findCategory(categoriesTree, categoryId)
      if (category) {
        const ids = []
        const queue = [category]
        while (queue.length) {
          const front = queue.shift()
          ids.push(front.id)
          front.children?.forEach((c) => queue.push(c))
        }
        return ids
      }
    }
    return []
  }, [categoriesTree, categoryId])
}

function Tickets({ organizations, selectedOrgId, handleOrgChange }) {
  const { addNotification } = useAppContext()
  const { t } = useTranslation()
  const history = useHistory()
  const { search } = useLocation()
  const searchParams = useMemo(() => qs.parse(search), [search])
  const { categoryId } = searchParams

  const setSearchParams = useCallback(
    (params) => {
      history.push({ search: `?${qs.stringify({ ...searchParams, ...params })}` })
    },
    [history, searchParams]
  )

  const [batchOpsEnable, setBatchOpsEnable] = useState(false)
  const [checkedTickets, setCheckedTickets] = useState([])

  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)

  const { data: categoriesTree } = useQuery({
    queryKey: ['endUser/categoriesTree'],
    queryFn: () => getCategoriesTree(false),
    onError: addNotification,
  })

  const categoryIds = useCategoryIds(categoriesTree, categoryId)

  const filters = { organizationId: selectedOrgId, categoryIds, page, pageSize }
  const { data: tickets, isLoading: loadingTickets, refetch } = useQuery({
    queryKey: ['endUser/tickets', filters],
    queryFn: () => findTickets(filters),
    enabled: categoriesTree !== undefined,
    onError: addNotification,
  })
  useEffect(() => setCheckedTickets([]), [tickets])

  const { mutate: move, isLoading: moving } = useMutation({
    mutationFn: (org) => moveTickets(checkedTickets, org),
    onSuccess: () => refetch(),
    onError: addNotification,
  })

  const handleClickCheckAll = useCallback(() => {
    if (tickets) {
      setCheckedTickets((prev) => (prev.length < tickets.length ? tickets : []))
    }
  }, [tickets])

  return (
    <div>
      <DocumentTitle title={`${t('ticketList')}`} />
      {organizations.length > 0 && (
        <Form inline>
          {(batchOpsEnable && (
            <>
              <Form.Check
                className={css.ticketSelectCheckbox}
                label={t('selectAll')}
                checked={tickets?.length > 0 && checkedTickets.length === tickets.length}
                onChange={handleClickCheckAll}
              />
              <TicketsMoveButton
                className="ml-2"
                size="sm"
                organizations={organizations}
                selectedOrgId={selectedOrgId}
                disabled={checkedTickets.length === 0 || moving}
                onTicketsMove={move}
              />
              <Button
                className="ml-2"
                variant="link"
                size="sm"
                onClick={() => {
                  setBatchOpsEnable(false)
                  setCheckedTickets([])
                }}
              >
                {t('return')}
              </Button>
            </>
          )) || (
            <>
              <OrganizationSelect
                size="sm"
                organizations={organizations}
                selectedOrgId={selectedOrgId}
                onOrgChange={handleOrgChange}
              />
              <CategoryTreeMenu
                className="ml-2"
                categoriesTree={categoriesTree}
                value={categoryId}
                onChange={(categoryId) => setSearchParams({ categoryId: categoryId ?? undefined })}
              />
              <Button
                className="ml-2"
                variant="light"
                size="sm"
                disabled={tickets?.length === 0}
                onClick={() => setBatchOpsEnable(true)}
              >
                {t('batchOperation')}
              </Button>
            </>
          )}
        </Form>
      )}
      {loadingTickets && <div className="py-2">{t('loading') + '...'}</div>}
      {tickets?.map((ticket) => (
        <TicketItem
          key={ticket.data.nid}
          ticket={ticket.toJSON()}
          checkable={batchOpsEnable}
          checked={checkedTickets.some((t) => t.id === ticket.id)}
          onCheckboxChange={(e) =>
            e.target.checked
              ? setCheckedTickets([...checkedTickets, ticket])
              : setCheckedTickets(checkedTickets.filter((t) => t.id !== ticket.id))
          }
          category={getCategoryPathName(ticket.data.category, categoriesTree)}
        />
      ))}
      {tickets?.length === 0 && (
        <div className="py-2">
          {t('ticketsNotFound')}
          <Link to="/tickets/new">{t('createANewOne')}</Link>
        </div>
      )}

      {tickets?.length > 0 && (
        <div className="py-2 d-flex justify-content-between">
          <Button variant="light" disabled={page === 1} onClick={() => setPage(page - 1)}>
            &larr; {t('previousPage')}
          </Button>
          <Button
            variant="light"
            disabled={pageSize !== tickets.length}
            onClick={() => setPage(page + 1)}
          >
            {t('nextPage')} &rarr;
          </Button>
        </div>
      )}
    </div>
  )
}

Tickets.propTypes = {
  organizations: PropTypes.array,
  selectedOrgId: PropTypes.string,
  handleOrgChange: PropTypes.func,
}

export default Tickets
