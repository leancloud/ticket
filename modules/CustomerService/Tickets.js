import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import _ from 'lodash'
import { Link, useHistory, useLocation } from 'react-router-dom'
import {
  Button,
  ButtonGroup,
  ButtonToolbar,
  Checkbox,
  DropdownButton,
  Form,
  FormControl,
  FormGroup,
  MenuItem,
  Pager,
} from 'react-bootstrap'
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
import TicketStatusLabel from '../TicketStatusLabel'
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
      return pathname + '?' + qs.stringify({ ...filters, ...newFilters })
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
        <Checkbox
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
              {filters.isOpen === 'false' && (
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
                  <span className={css.commentCounterIcon + ' glyphicon glyphicon-comment'}></span>
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
    <Form className="form-group" inline>
      <FormGroup>
        <DelayInputForm
          placeholder={t('searchKeyword')}
          value={searchString}
          onChange={(searchString) => updatePath({ searchString: searchString || undefined })}
        />
      </FormGroup>{' '}
      <FormGroup>
        <ButtonToolbar>
          <ButtonGroup>
            <Button
              active={isOpen === 'true'}
              onClick={() => updatePath({ isOpen: true, status: undefined })}
            >
              {t('incompleted')}
            </Button>
            <Button
              active={isOpen === 'false'}
              onClick={() => updatePath({ isOpen: false, status: undefined })}
            >
              {t('completed')}
            </Button>
            <DropdownButton
              id="statusDropdown"
              active={isOpen === undefined}
              title={statusTitle}
              onSelect={(eventKey) => updatePath({ status: eventKey, isOpen: undefined })}
            >
              <MenuItem key="undefined">{t('all')}</MenuItem>
              {Object.values(TICKET_STATUS).map((value) => (
                <MenuItem key={value} eventKey={value}>
                  {t(TICKET_STATUS_MSG[value])}
                </MenuItem>
              ))}
            </DropdownButton>
          </ButtonGroup>
          <ButtonGroup>
            <Button active={assignedToMe} onClick={() => updatePath({ assignee: 'me' })}>
              {t('assignedToMe')}
            </Button>
            <DropdownButton
              id="assigneeDropdown"
              active={!assignedToMe}
              title={assigneeTitle}
              onSelect={(assignee) => updatePath({ assignee })}
            >
              <MenuItem key="undefined">{t('all')}</MenuItem>
              {customerServices.map((user) => (
                <MenuItem key={user.objectId} eventKey={user.objectId}>
                  {getUserDisplayName(user)}
                </MenuItem>
              ))}
            </DropdownButton>
          </ButtonGroup>
          <ButtonGroup>
            <DropdownButton
              id="categoryDropdown"
              active={!!categoryId}
              title={categoryTitle}
              onSelect={(categoryId) => updatePath({ categoryId })}
            >
              <MenuItem key="undefined">{t('all')}</MenuItem>
              {categories.map((c, depth) => (
                <MenuItem key={c.objectId} eventKey={c.objectId}>
                  {getIndentString(depth) + getCategoryName(c)}
                </MenuItem>
              ))}
            </DropdownButton>
          </ButtonGroup>
          <ButtonGroup>
            <DropdownButton
              id="tagKeyDropdown"
              active={!!tagKey}
              title={tagKey || t('all')}
              onSelect={(tagKey) => updatePath({ tagKey, tagValue: undefined })}
            >
              <MenuItem key="undefined">{t('all')}</MenuItem>
              {tagMetadatas.map((tagMetadata) => {
                const key = tagMetadata.get('key')
                return (
                  <MenuItem key={key} eventKey={key}>
                    {key}
                  </MenuItem>
                )
              })}
            </DropdownButton>
            {tagKey && (
              <DropdownButton
                id="tagValueDropdown"
                active={!!tagValue}
                title={tagValue || t('allTagValues')}
                onSelect={(tagValue) => updatePath({ tagValue })}
              >
                <MenuItem key="undefined">{t('allTagValues')}</MenuItem>
                {tagMetadatas
                  .find((m) => m.data.key === tagKey)
                  .data.values.map((value) => (
                    <MenuItem key={value} eventKey={value}>
                      {value}
                    </MenuItem>
                  ))}
              </DropdownButton>
            )}
          </ButtonGroup>
          <ButtonGroup>
            <DropdownButton
              id="timeRange"
              active={!!timeRange}
              title={TIME_RANGE_MAP[timeRange] ? t(timeRange) : t('allTime')}
              onSelect={(timeRange) => updatePath({ timeRange })}
            >
              <MenuItem key="undefined">{t('allTime')}</MenuItem>
              <MenuItem key="today" eventKey="today">
                {t('today')}
              </MenuItem>
              <MenuItem key="thisMonth" eventKey="thisMonth">
                {t('thisMonth')}
              </MenuItem>
              <MenuItem key="lastMonth" eventKey="lastMonth">
                {t('lastMonth')}
              </MenuItem>
              <MenuItem key="monthBeforeLast" eventKey="monthBeforeLast">
                {t('monthBeforeLast')}
              </MenuItem>
            </DropdownButton>
          </ButtonGroup>
        </ButtonToolbar>
      </FormGroup>{' '}
      <FormGroup validationState={authorFilterValidationState}>
        <FormControl
          type="text"
          value={authorUsername}
          placeholder={t('submitter')}
          onChange={handleChangeAuthorUsername}
        />
      </FormGroup>{' '}
      {isOpen === 'false' && (
        <ButtonGroup>
          <Checkbox
            checked={isOnlyUnlike === 'true'}
            onChange={(e) => updatePath({ isOnlyUnlike: e.target.checked ? 'true' : undefined })}
          >
            {t('badReviewsOnly')}
          </Checkbox>
        </ButtonGroup>
      )}
    </Form>
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
    <FormGroup>
      <ButtonToolbar>
        <DropdownButton
          id="categoryMoveDropdown"
          title={t('changeCategory')}
          onSelect={onChangeCategory}
        >
          {categories.map((c, depth) => (
            <MenuItem key={c.objectId} eventKey={c.objectId}>
              {getIndentString(depth) + c.name}
            </MenuItem>
          ))}
        </DropdownButton>
        {filters.isOpen === 'true' && (
          <DropdownButton
            id="batchOperationDropdown"
            title={t('batchOperation')}
            onSelect={onBatchOperate}
          >
            <MenuItem eventKey="close">{t('close')}</MenuItem>
          </DropdownButton>
        )}
      </ButtonToolbar>
    </FormGroup>
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

    const ticketObjects = await query
      .include('author', 'assignee')
      .limit(PAGE_SIZE)
      .skip(parseInt(page) * PAGE_SIZE)
      .orderBy('latestReply.updatedAt', 'desc')
      .orderBy('updatedAt', 'desc')
      .find()
    setTickets(ticketObjects.map((t) => t.toJSON()))
  }, [filters])

  useEffect(() => {
    findTickets()
  }, [filters])

  return { tickets, reload: findTickets }
}

function TicketPager({ noMore }) {
  const { t } = useTranslation()
  const { filters, updatePath } = useTicketFilters()
  const { page = '0' } = filters
  const isFirstPage = page === '0'

  if (isFirstPage && noMore) {
    return null
  }
  return (
    <Pager>
      <Pager.Item
        previous
        disabled={isFirstPage}
        onClick={() => updatePath({ page: parseInt(page) - 1 })}
      >
        &larr; {t('previousPage')}
      </Pager.Item>
      <Pager.Item next disabled={noMore} onClick={() => updatePath({ page: parseInt(page) + 1 })}>
        {t('nextPage')} &rarr;
      </Pager.Item>
    </Pager>
  )
}
TicketPager.propTypes = {
  noMore: PropTypes.bool,
}

export default function CustomerServiceTickets() {
  const { t } = useTranslation()
  useTitle(`${t('customerServiceTickets')} - LeanTicket`)
  const { addNotification } = useContext(AppContext)
  const [checkedTickets, setCheckedTickets] = useState(new Set())
  const customerServices = useCustomerServices()
  const categories = useCategories()
  const { tickets, reload } = useTickets()

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
      if (checkedTickets.has(objectId)) {
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
      <div className={css.row}>
        <Checkbox
          className={css.ticketSelectCheckbox}
          checked={tickets.length && checkedTickets.size === tickets.length}
          onChange={handleCheckAll}
        />
        {checkedTickets.size ? (
          <BatchOperationMenu
            categories={categories}
            onChangeCategory={handleChangeCategory}
            onBatchOperate={handleBatchOperation}
          />
        ) : (
          <TicketMenu customerServices={customerServices} categories={categories} />
        )}
      </div>

      <TicketList
        tickets={tickets}
        categories={categories}
        checkedTicketIds={checkedTickets}
        onCheckTicket={handleCheckTicket}
      />
      <TicketPager noMore={tickets.length < PAGE_SIZE} />
    </div>
  )
}
