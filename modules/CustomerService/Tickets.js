import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import _ from 'lodash'
import { Link, useHistory, useLocation } from 'react-router-dom'
import { Button, ButtonGroup, Dropdown, DropdownButton, Form } from 'react-bootstrap'
import qs from 'query-string'
import moment from 'moment'

import { auth, cloud, db } from '../../lib/leancloud'
import css from '../CustomerServiceTickets.css'

import { getTinyCategoryInfo } from '../common'
import {
  TICKET_STATUS,
  TICKET_STATUS_MSG,
  TIME_RANGE_MAP,
  getUserDisplayName,
  ticketOpenedStatuses,
  ticketClosedStatuses,
  ticketStatus,
} from '../../lib/common'
import { TicketStatusLabel } from '../components/TicketStatusLabel'
import { UserLabel } from '../UserLabel'
import { AppContext } from '../context'
import { useCustomerServices } from './useCustomerServices'
import { CategoryManager, useCategories, getCategoryName } from '../category'
import { useTitle } from '../utils/hooks'
import { BlodSearchString } from '../components/BlodSearchString'
import { DelayInputForm } from '../components/DelayInputForm'

const PAGE_SIZE = 10

function useTicketFilters() {
  const history = useHistory()
  const { search, pathname } = useLocation()
  const filters = useMemo(() => qs.parse(search), [search])
  const mergePath = useCallback(
    (newFilters) => {
      return pathname + '?' + qs.stringify({ ...filters, page: undefined, ...newFilters })
    },
    [pathname, filters]
  )
  const updatePath = useCallback(
    (newFilters) => {
      history.push(mergePath(newFilters))
    },
    [history, mergePath]
  )
  return { filters, mergePath, updatePath }
}

/**
 * @param {object} props
 * @param {Array<{ key: string, title: string }>} props.items
 */
function DropdownMenu({ active, title, onSelect, items, allTitle, ...props }) {
  const { t } = useTranslation()
  const handleSelect = useCallback(
    (eventKey, ...args) => {
      onSelect(eventKey || undefined, ...args)
    },
    [onSelect]
  )
  return (
    <Dropdown {...props} as={ButtonGroup} onSelect={handleSelect}>
      <Dropdown.Toggle variant="light" size="sm" active={active}>
        {title}
      </Dropdown.Toggle>
      <Dropdown.Menu>
        <Dropdown.Item>{allTitle || t('all')}</Dropdown.Item>
        {items.map(({ key, title }) => (
          <Dropdown.Item key={key} eventKey={key}>
            {title}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  )
}
DropdownMenu.propTypes = {
  active: PropTypes.bool,
  title: PropTypes.string.isRequired,
  allTitle: PropTypes.string,
  onSelect: PropTypes.func,
  items: PropTypes.array.isRequired,
}

/**
 * @param {object} props
 * @param {Array} props.tickets
 * @param {CategoryManager} props.categories
 * @param {Set<string>} [props.checkedTicketIds]
 * @param {Function} [props.onCheckTicket]
 */
function TicketList({ tickets, categories, checkedTicketIds, onCheckTicket }) {
  const { t } = useTranslation()
  const { filters, mergePath } = useTicketFilters()

  if (tickets.length === 0) {
    return <div className={css.ticket}>{t('notFound')}</div>
  }
  return tickets.map((ticket) => {
    const createdAt = moment(ticket.createdAt).fromNow()
    const updatedAt = moment(ticket.updatedAt).fromNow()

    const contributors = _.uniqBy(ticket.joinedCustomerServices || [], 'objectId')

    return (
      <div className={`${css.ticket} ${css.row}`} key={ticket.nid}>
        <Form.Check
          className={css.ticketSelectCheckbox}
          checked={checkedTicketIds?.has(ticket.objectId)}
          onChange={() => onCheckTicket?.(ticket)}
        />
        <div className={css.ticketContent}>
          <div className={css.heading}>
            <div className={css.left}>
              <Link className={css.title} to={`/tickets/${ticket.nid}`}>
                {ticket.title}
              </Link>
              {categories.getNodes(ticket.category.objectId).map((c) => (
                <Link key={c.objectId} to={mergePath({ categoryId: c.objectId })}>
                  <span className={css.category}>{getCategoryName(c)}</span>
                </Link>
              ))}
              {filters.isOpen !== 'true' && (
                <span>
                  {ticket.evaluation &&
                    (ticket.evaluation.star === 1 ? (
                      <span className={`${css.satisfaction} ${css.happy}`}>{t('satisfied')}</span>
                    ) : (
                      <span className={`${css.satisfaction} ${css.unhappy}`}>
                        {t('unsatisfied')}
                      </span>
                    ))}
                </span>
              )}
            </div>
            <div>
              {ticket.replyCount && (
                <Link
                  className={css.commentCounter}
                  title={`reply ${ticket.replyCount}`}
                  to={`/tickets/${ticket.nid}`}
                >
                  <i className={`${css.commentCounterIcon} bi bi-chat-left`}></i>
                  {ticket.replyCount}
                </Link>
              )}
            </div>
          </div>

          <div className={css.meta}>
            <div className={css.left}>
              <span className={css.nid}>#{ticket.nid}</span>
              <Link
                className={css.statusLink}
                to={mergePath({ status: ticket.status, isOpen: undefined })}
              >
                <span className={css.status}>
                  <TicketStatusLabel status={ticket.status} />
                </span>
              </Link>
              <span className={css.creator}>
                <UserLabel user={ticket.author} displayTags />
              </span>{' '}
              {t('createdAt')} {createdAt}
              {createdAt !== updatedAt && (
                <span>
                  {' '}
                  {t('updatedAt')} {updatedAt}
                </span>
              )}
            </div>
            <div>
              <span className={css.assignee}>
                <UserLabel user={ticket.assignee} />
              </span>
              <span className={css.contributors}>
                {contributors.map((user) => (
                  <span key={user.objectId}>
                    <UserLabel user={user} />
                  </span>
                ))}
              </span>
            </div>
          </div>
          {filters.searchString && (
            <>
              <BlodSearchString content={ticket.content} searchString={filters.searchString} />
              {ticket.replies?.map((r) => (
                <BlodSearchString
                  key={r.objectId}
                  content={r.content}
                  searchString={filters.searchString}
                />
              ))}
            </>
          )}
        </div>
      </div>
    )
  })
}
TicketList.propTypes = {
  tickets: PropTypes.array.isRequired,
  categories: PropTypes.instanceOf(CategoryManager).isRequired,
  checkedTicketIds: PropTypes.instanceOf(Set),
  onCheckTicket: PropTypes.func,
  displayEvaluation: PropTypes.bool,
}

function getIndentString(depth) {
  return depth === 0 ? '' : '　'.repeat(depth) + '└ '
}

/**
 *
 * @param {object} props
 * @param {object} props.customerService
 * @param {CategoryManager} props.categories
 */
function TicketMenu({ customerServices, categories }) {
  const { t } = useTranslation()
  const { filters, updatePath } = useTicketFilters()
  const { tagMetadatas, addNotification } = useContext(AppContext)
  const [authorFilterValidationState, setAuthorFilterValidationState] = useState(null)
  const [authorUsername, setAuthorUsername] = useState('')

  const {
    searchString,
    isOpen,
    status,
    authorId,
    assignee,
    categoryId,
    tagKey,
    tagValue,
    timeRange,
    isOnlyUnlike,
  } = filters
  const assigneeId = assignee === 'me' ? auth.currentUser?.id : assignee

  let statusTitle
  if (status) {
    statusTitle = t(TICKET_STATUS_MSG[status])
  } else if (isOpen === 'true') {
    statusTitle = t('incompleted')
  } else if (isOpen === 'false') {
    statusTitle = t('completed')
  } else {
    statusTitle = t('all')
  }

  let assigneeTitle
  if (assignee) {
    const customerService = customerServices.find((cs) => cs.objectId === assigneeId)
    if (customerService) {
      assigneeTitle = getUserDisplayName(customerService)
    } else {
      assigneeTitle = `assignee ${t('invalid')}`
    }
  } else {
    assigneeTitle = t('all')
  }

  let categoryTitle
  if (categoryId) {
    const category = categories.get(categoryId)
    if (category) {
      categoryTitle = getCategoryName(category)
    } else {
      categoryTitle = `categoryId ${t('invalid')}`
    }
  } else {
    categoryTitle = t('all')
  }

  const assignedToMe = assigneeId === auth.currentUser?.id

  const handleChangeAuthorUsername = (e) => {
    const username = e.target.value
    setAuthorFilterValidationState(null)
    setAuthorUsername(username)
  }

  const [debouncedUsername, setDebouncedUsername] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUsername(authorUsername.trim())
    }, 500)
    return () => clearTimeout(timer)
  }, [authorUsername])

  useEffect(() => {
    if (!debouncedUsername) {
      if (authorId) {
        updatePath({ authorId: undefined })
      }
      return
    }
    cloud
      .run('getUserInfo', { username: debouncedUsername })
      .then((user) => {
        if (!user) {
          setAuthorFilterValidationState('error')
        } else {
          setAuthorFilterValidationState('success')
          updatePath({ authorId: user.objectId })
        }
        return
      })
      .catch(addNotification)
  }, [debouncedUsername, authorId, updatePath])

  return (
    <>
      <Form.Group>
        <DelayInputForm
          size="sm"
          placeholder={t('searchKeyword')}
          value={searchString}
          onChange={(searchString) => updatePath({ searchString: searchString || undefined })}
        />
      </Form.Group>
      <Form.Group className="ml-1">
        <ButtonGroup size="sm">
          <Button
            variant="light"
            active={isOpen === 'true'}
            onClick={() => updatePath({ isOpen: true, status: undefined })}
          >
            {t('incompleted')}
          </Button>
          <Button
            variant="light"
            active={isOpen === 'false'}
            onClick={() => updatePath({ isOpen: false, status: undefined })}
          >
            {t('completed')}
          </Button>
          <DropdownMenu
            active={isOpen === undefined}
            title={statusTitle}
            onSelect={(status) => updatePath({ status, isOpen: undefined })}
            items={Object.values(TICKET_STATUS).map((status) => ({
              key: status,
              title: t(TICKET_STATUS_MSG[status]),
            }))}
          />
        </ButtonGroup>

        <ButtonGroup className="ml-1" size="sm">
          <Button
            variant="light"
            active={assignedToMe}
            onClick={() => updatePath({ assignee: 'me' })}
          >
            {t('assignedToMe')}
          </Button>
          <DropdownMenu
            active={!assignedToMe}
            title={assigneeTitle}
            onSelect={(assignee) => updatePath({ assignee })}
            items={customerServices.map((user) => ({
              key: user.objectId,
              title: getUserDisplayName(user),
            }))}
          />
        </ButtonGroup>

        <DropdownMenu
          className="ml-1"
          active={!!categoryId}
          title={categoryTitle}
          onSelect={(categoryId) => updatePath({ categoryId })}
          items={categories.map((c, depth) => ({
            key: c.objectId,
            title: getIndentString(depth) + getCategoryName(c),
          }))}
        />

        <ButtonGroup className="ml-1" size="sm">
          <DropdownMenu
            active={!!tagKey}
            title={tagKey || t('all')}
            onSelect={(tagKey) => updatePath({ tagKey, tagValue: undefined })}
            items={tagMetadatas.map((tagMetadata) => ({
              key: tagMetadata.get('key'),
              title: tagMetadata.get('key'),
            }))}
          />
          {tagKey && (
            <DropdownMenu
              active={!!tagValue}
              title={tagValue || t('allTagValues')}
              allTitle={t('allTagValues')}
              onSelect={(tagValue) => updatePath({ tagValue })}
              items={tagMetadatas
                .find((m) => m.data.key === tagKey)
                .data.values.map((tagName) => ({ key: tagName, title: tagName }))}
            />
          )}
        </ButtonGroup>

        <DropdownMenu
          className="ml-1"
          active={!!timeRange}
          title={TIME_RANGE_MAP[timeRange] ? t(timeRange) : t('allTime')}
          allTitle={t('allTime')}
          onSelect={(timeRange) => updatePath({ timeRange })}
          items={[
            { key: 'today', title: t('today') },
            { key: 'thisMonth', title: t('thisMonth') },
            { key: 'lastMonth', title: t('lastMonth') },
            { key: 'monthBeforeLast', title: t('monthBeforeLast') },
          ]}
        />
      </Form.Group>

      <Form.Group className="ml-1">
        <Form.Control
          size="sm"
          value={authorUsername}
          placeholder={t('submitter')}
          onChange={handleChangeAuthorUsername}
          isInvalid={authorFilterValidationState === 'error'}
          isValid={authorFilterValidationState === 'success'}
        />
      </Form.Group>

      {isOpen === 'false' && (
        <Form.Group className="ml-1" controlId="unlikeOnlyCheckbox">
          <Form.Check
            checked={isOnlyUnlike === 'true'}
            onChange={(e) => updatePath({ isOnlyUnlike: e.target.checked ? 'true' : undefined })}
            label={t('badReviewsOnly')}
          />
        </Form.Group>
      )}
    </>
  )
}
TicketMenu.propTypes = {
  customerServices: PropTypes.array.isRequired,
  categories: PropTypes.instanceOf(CategoryManager).isRequired,
}

/**
 * @param {object} props
 * @param {CategoryManager} props.categories
 */
function BatchOperationMenu({ categories, onChangeCategory, onBatchOperate }) {
  const { t } = useTranslation()
  const { filters } = useTicketFilters()

  return (
    <Form.Group>
      <DropdownButton
        variant="light"
        size="sm"
        id="categoryMoveDropdown"
        title={t('changeCategory')}
        onSelect={onChangeCategory}
      >
        {categories.map((c, depth) => (
          <Dropdown.Item key={c.objectId} eventKey={c.objectId}>
            {getIndentString(depth) + c.name}
          </Dropdown.Item>
        ))}
      </DropdownButton>
      {filters.isOpen === 'true' && (
        <DropdownButton
          variant="light"
          size="sm"
          className="ml-1"
          id="batchOperationDropdown"
          title={t('batchOperation')}
          onSelect={onBatchOperate}
        >
          <Dropdown.Item eventKey="close">{t('close')}</Dropdown.Item>
        </DropdownButton>
      )}
    </Form.Group>
  )
}
BatchOperationMenu.propTypes = {
  categories: PropTypes.instanceOf(CategoryManager).isRequired,
  onChangeCategory: PropTypes.func.isRequired,
  onBatchOperate: PropTypes.func.isRequired,
}

/**
 * @param {object} filter
 * @param {Array} [filter.statuses]
 * @param {string} [filter.assigneeId]
 * @param {string} [filter.authorId]
 */
export function useTickets() {
  const [tickets, setTickets] = useState([])
  const [totalCount, setTotalCount] = useState()
  const { tagMetadatas } = useContext(AppContext)
  const { filters } = useTicketFilters()

  const findTickets = useCallback(async () => {
    const {
      timeRange,
      isOpen,
      status,
      assignee,
      authorId,
      categoryId,
      tagKey,
      tagValue,
      isOnlyUnlike,
      page = '0',
      searchString,
    } = filters

    let query = db.class('Ticket')

    if (timeRange && timeRange in TIME_RANGE_MAP) {
      const { starts, ends } = TIME_RANGE_MAP[timeRange]
      query = query.where('createdAt', '>=', starts).where('createdAt', '<', ends)
    }

    if (isOpen === 'true') {
      query = query.where('status', 'in', ticketOpenedStatuses()).orderBy('status')
    } else if (isOpen === 'false') {
      query = query.where('status', 'in', ticketClosedStatuses())
    } else if (status) {
      query = query.where('status', '==', parseInt(status))
    }

    if (assignee) {
      const assigneeId = assignee === 'me' ? auth.currentUser?.id : assignee
      query = query.where('assignee', '==', db.class('_User').object(assigneeId))
    }

    if (authorId) {
      query = query.where('author', '==', db.class('_User').object(authorId))
    }

    if (categoryId) {
      query = query.where('category.objectId', '==', categoryId)
    }

    if (tagKey) {
      const tagMetadata = tagMetadatas.find((m) => m.data.key === tagKey)
      if (tagMetadata) {
        const columnName = tagMetadata.data.isPrivate ? 'privateTags' : 'tags'
        if (tagValue) {
          query = query.where(columnName, '==', { key: tagKey, value: tagValue })
        } else {
          query = query.where(columnName + '.key', '==', tagKey)
        }
      }
    }

    if (isOnlyUnlike === 'true') {
      query = query.where('evaluation.star', '==', 0)
    }

    const trimedSearchString = searchString?.trim()
    if (trimedSearchString) {
      const { data: tickets } = await db
        .search('Ticket')
        .queryString(`title:${searchString} OR content:${searchString}`)
        .orderBy('latestReply.updatedAt', 'desc')
        .limit(1000)
        .find()
      const searchMatchedTicketIds = tickets.map((t) => t.id)
      if (searchMatchedTicketIds.length === 0) {
        setTickets([])
        return
      }
      query = query.where('objectId', 'in', searchMatchedTicketIds)
    }

    const [ticketObjects, count] = await query
      .include('author', 'assignee')
      .limit(PAGE_SIZE)
      .skip(parseInt(page) * PAGE_SIZE)
      .orderBy('latestReply.updatedAt', 'desc')
      .orderBy('updatedAt', 'desc')
      .findAndCount()
    setTickets(ticketObjects.map((t) => t.toJSON()))
    setTotalCount(count)
  }, [filters])

  useEffect(() => {
    findTickets()
  }, [filters])

  return { tickets, totalCount, reload: findTickets }
}

function TicketPager({ totalCount }) {
  const { t } = useTranslation()
  const { filters, updatePath } = useTicketFilters()
  const { page: pageParam = '0' } = filters
  const page = parseInt(pageParam)
  const isFirstPage = page === 0
  const noMore = totalCount <= (page + 1) * PAGE_SIZE

  return (
    <div className="my-2 d-flex justify-content-between align-items-center">
      <div>
        <Button variant="light" disabled={isFirstPage} onClick={() => updatePath({ page: 0 })}>
          {t('firstPage')}
        </Button>{' '}
        <Button
          variant="light"
          disabled={isFirstPage}
          onClick={() => updatePath({ page: page - 1 })}
        >
          &larr; {t('previousPage')}
        </Button>
      </div>
      {totalCount > 0 && (
        <span>
          {page * PAGE_SIZE + 1} - {Math.min(totalCount, (page + 1) * PAGE_SIZE)} / {totalCount}
        </span>
      )}
      <Button variant="light" disabled={noMore} onClick={() => updatePath({ page: page + 1 })}>
        {t('nextPage')} &rarr;
      </Button>
    </div>
  )
}
TicketPager.propTypes = {
  totalCount: PropTypes.number,
  noMore: PropTypes.bool,
}

export default function CustomerServiceTickets() {
  const { t } = useTranslation()
  useTitle(`${t('customerServiceTickets')} - LeanTicket`)
  const { addNotification } = useContext(AppContext)
  const [checkedTickets, setCheckedTickets] = useState(new Set())
  const customerServices = useCustomerServices()
  const categories = useCategories()
  const { tickets, totalCount, reload } = useTickets()

  const handleCheckAll = (e) => {
    if (e.target.checked) {
      setCheckedTickets(new Set(tickets.map((t) => t.objectId)))
    } else {
      setCheckedTickets(new Set())
    }
  }

  const handleCheckTicket = useCallback(({ objectId }) => {
    setCheckedTickets((currentCheckedTickets) => {
      const nextCheckedTickets = new Set(currentCheckedTickets)
      if (currentCheckedTickets.has(objectId)) {
        nextCheckedTickets.delete(objectId)
      } else {
        nextCheckedTickets.add(objectId)
      }
      return nextCheckedTickets
    })
  }, [])

  const handleChangeCategory = (categoryId) => {
    const category = getTinyCategoryInfo(categories.get(categoryId))
    const p = db.pipeline()
    tickets
      .filter((t) => checkedTickets.has(t.objectId))
      .forEach((t) => p.update('Ticket', t.objectId, { category }))
    p.commit()
      .then(() => {
        setCheckedTickets(new Set())
        reload()
        return
      })
      .catch(addNotification)
  }

  const handleBatchOperation = (operation) => {
    if (operation === 'close') {
      const ticketIds = tickets
        .filter((t) => checkedTickets.has(t.objectId) && ticketStatus.isOpened(t.status))
        .map((t) => t.objectId)
      cloud
        .run('operateTicket', { ticketId: ticketIds, action: 'close' })
        .then(() => {
          setCheckedTickets(new Set())
          reload()
          return
        })
        .catch(addNotification)
    }
  }

  return (
    <div>
      <div className={`${css.row} pb-2`}>
        <Form inline>
          <Form.Group>
            <Form.Check
              className={css.ticketSelectCheckbox}
              checked={tickets.length && checkedTickets.size === tickets.length}
              onChange={handleCheckAll}
            />
          </Form.Group>
          {checkedTickets.size ? (
            <BatchOperationMenu
              categories={categories}
              onChangeCategory={handleChangeCategory}
              onBatchOperate={handleBatchOperation}
            />
          ) : (
            <TicketMenu customerServices={customerServices} categories={categories} />
          )}
        </Form>
      </div>

      <TicketList
        tickets={tickets}
        categories={categories}
        checkedTicketIds={checkedTickets}
        onCheckTicket={handleCheckTicket}
      />
      <TicketPager totalCount={totalCount} />
    </div>
  )
}
