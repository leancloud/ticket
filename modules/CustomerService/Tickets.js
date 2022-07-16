import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import PropTypes from 'prop-types'
import _ from 'lodash'
import { Link, useHistory, useLocation } from 'react-router-dom'
import {
  Button,
  ButtonGroup,
  Dropdown,
  DropdownButton,
  Form,
  OverlayTrigger,
  Tooltip,
  Badge,
} from 'react-bootstrap'
import qs from 'query-string'
import moment from 'moment'
import * as Icon from 'react-bootstrap-icons'
import { useTitle } from 'react-use'

import { auth, cloud, db } from '../../lib/leancloud'
import css from '../CustomerServiceTickets.css'
import { getTinyCategoryInfo } from '../common'
import {
  TICKET_STATUS,
  TICKET_STATUS_MSG,
  TIME_RANGE_MAP,
  getUserDisplayName,
  ticketStatus,
} from '../../lib/common'
import { TicketStatusLabel } from '../components/TicketStatusLabel'
import { UserLabel } from '../UserLabel'
import { AppContext } from '../context'
import { useCustomerServices } from './useCustomerServices'
import { CategoryManager, useCategories, getCategoryName } from '../category'
import { BlodSearchString } from '../components/BlodSearchString'
import { DelayInputForm } from '../components/DelayInputForm'
import { useGroups } from '../components/Group'
import { PreviewTip } from './PreviewTip'

const PAGE_SIZE = 20

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
  const replacePath = useCallback(
    (newFilters) => {
      history.push(pathname + '?' + qs.stringify(newFilters))
    },
    [history, pathname]
  )
  return { filters, mergePath, updatePath, replacePath }
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
              {filters.stage === 'done' && (
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
                  <Icon.ChatLeft className={css.commentCounterIcon} />
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
                to={mergePath({ status: ticket.status, stage: undefined })}
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
              {ticket.assignee && (
                <span className={css.assignee}>
                  <UserLabel user={ticket.assignee} />
                </span>
              )}
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

// eslint-disable-next-line react/prop-types
function FiltersSet({ filters, content, hint }) {
  const { filters: currentFilters, replacePath } = useTicketFilters()
  const active = Object.entries(filters).every(([key, value]) => currentFilters[key] === value)
  const [matchCount, setMatchCount] = useState()
  useEffect(() => {
    async function count() {
      let query = await getQuery(filters)
      setMatchCount(await query.count())
    }
    count()
  }, [filters])

  return (
    <OverlayTrigger overlay={<Tooltip>{hint}</Tooltip>}>
      <Button
        size="sm"
        variant="light"
        className="mr-1"
        active={active}
        onClick={() => replacePath(filters)}
      >
        {content}{' '}
        {matchCount !== undefined && (
          <Badge pill variant={matchCount ? 'danger' : 'secondary'}>
            {matchCount}
          </Badge>
        )}
      </Button>
    </OverlayTrigger>
  )
}

const FILTERS_PRESETS = [
  {
    filters: { stage: 'todo', assignee: 'me' },
    content: <Trans i18nKey="On my desk" />,
    hint: (
      <>
        <Trans i18nKey="todo" /> & <Trans i18nKey="assignedToMe" />
      </>
    ),
  },
  {
    filters: { stage: 'todo', groupId: 'mine' },
    content: <Trans i18nKey="My groups" />,
    hint: (
      <>
        <Trans i18nKey="todo" /> & <Trans i18nKey="myGroups" />
      </>
    ),
  },
  {
    filters: { stage: 'todo', groupId: 'unset', assignee: 'unset' },
    content: <Trans i18nKey="To be triaged" />,
    hint: (
      <>
        <Trans i18nKey="todo" /> & <Trans i18nKey="unassigned" /> & <Trans i18nKey="group" />{' '}
        <Trans i18nKey="unset" />
      </>
    ),
  },
]

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
    stage,
    status,
    authorId,
    groupId,
    assignee,
    categoryId,
    tagKey,
    tagValue,
    timeRange,
    isOnlyUnlike,
  } = filters
  const assigneeId = assignee === 'me' ? auth.currentUser?.id : assignee

  useEffect(() => {
    if (authorId) {
      db.class('_User')
        .object(authorId)
        .get()
        .then((author) => setAuthorUsername(author.data.username))
        .catch((error) => {
          if (error.code === 211) {
            updatePath({ authorId: undefined })
          } else {
            addNotification(error)
          }
        })
    }
  }, [])

  const $searchAuthorTimer = useRef(null)
  const handleChangeAuthorUsername = (e) => {
    const username = e.target.value
    setAuthorFilterValidationState(null)
    setAuthorUsername(username)
    if ($searchAuthorTimer.current) {
      clearTimeout($searchAuthorTimer.current)
      $searchAuthorTimer.current = null
    }
    const trimedUsername = username.trim()
    if (trimedUsername) {
      $searchAuthorTimer.current = setTimeout(() => {
        cloud
          .run('getUserInfo', { username: trimedUsername })
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
      }, 500)
    } else {
      updatePath({ authorId: undefined })
    }
  }

  let statusTitle
  if (status) {
    statusTitle = t(TICKET_STATUS_MSG[status])
  } else if (stage === 'todo') {
    statusTitle = t('todo')
  } else if (stage === 'in-progress') {
    statusTitle = t('in-progress')
  } else if (stage === 'done') {
    statusTitle = t('done')
  } else {
    statusTitle = t('all')
  }

  const { data: groups = [] } = useGroups()
  let groupTitle
  if (groupId) {
    if (groupId === 'unset') {
      groupTitle = `<${t('unset')}>`
    } else if (groupId === 'mine') {
      groupTitle = `<${t('myGroups')}>`
    } else {
      const matchedGroup = groups.find((g) => g.id === groupId)
      if (matchedGroup) {
        groupTitle = matchedGroup.data.name
      } else {
        groupTitle = `group ${t('invalid')}`
      }
    }
  } else {
    groupTitle = t('all')
  }

  let assigneeTitle
  if (assigneeId) {
    if (assigneeId === 'unset') {
      assigneeTitle = `<${t('unassigned')}>`
    } else {
      const customerService = customerServices.find((cs) => cs.objectId === assigneeId)
      if (customerService) {
        assigneeTitle = getUserDisplayName(customerService)
      } else {
        assigneeTitle = `assignee ${t('invalid')}`
      }
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

  return (
    <>
      <Form inline className="pb-2">
        {FILTERS_PRESETS.map((filterSet, index) => (
          <FiltersSet key={index} {...filterSet} />
        ))}
      </Form>
      <Form inline className="pb-2">
        <ButtonGroup size="sm" className="mr-1">
          <OverlayTrigger
            overlay={
              <Tooltip>
                {t(TICKET_STATUS_MSG[TICKET_STATUS.NEW])} /{' '}
                {t(TICKET_STATUS_MSG[TICKET_STATUS.WAITING_CUSTOMER_SERVICE])}
              </Tooltip>
            }
          >
            <Button
              variant="light"
              active={stage === 'todo'}
              onClick={() => updatePath({ stage: 'todo', status: undefined })}
            >
              {t('todo')}
            </Button>
          </OverlayTrigger>
          <OverlayTrigger
            overlay={<Tooltip>{t(TICKET_STATUS_MSG[TICKET_STATUS.WAITING_CUSTOMER])}</Tooltip>}
          >
            <Button
              variant="light"
              active={stage === 'in-progress'}
              onClick={() => updatePath({ stage: 'in-progress', status: undefined })}
            >
              {t('in-progress')}
            </Button>
          </OverlayTrigger>
          <OverlayTrigger
            overlay={
              <Tooltip>
                {t(TICKET_STATUS_MSG[TICKET_STATUS.PRE_FULFILLED])} /{' '}
                {t(TICKET_STATUS_MSG[TICKET_STATUS.FULFILLED])} /{' '}
                {t(TICKET_STATUS_MSG[TICKET_STATUS.CLOSED])}
              </Tooltip>
            }
          >
            <Button
              variant="light"
              active={stage === 'done'}
              onClick={() => updatePath({ stage: 'done', status: undefined })}
            >
              {t('done')}
            </Button>
          </OverlayTrigger>
          <DropdownMenu
            active={stage === undefined}
            title={statusTitle}
            onSelect={(status) => updatePath({ status, stage: undefined })}
            items={Object.values(TICKET_STATUS).map((status) => ({
              key: status,
              title: t(TICKET_STATUS_MSG[status]),
            }))}
          />
        </ButtonGroup>

        <ButtonGroup className="mr-1" size="sm">
          <DropdownMenu
            active={!!groupId}
            title={groupTitle}
            onSelect={(groupId) => updatePath({ groupId })}
            items={[
              { key: 'unset', title: `<${t('unset')}>` },
              { key: 'mine', title: `<${t('myGroups')}>` },
              ...groups.map((g) => ({
                key: g.id,
                title: g.data.name,
              })),
            ]}
          />
        </ButtonGroup>

        <ButtonGroup className="mr-1" size="sm">
          <Button
            variant="light"
            active={assignedToMe}
            onClick={() => updatePath({ assignee: 'me' })}
          >
            {t('assignedToMe')}
          </Button>
          <DropdownMenu
            active={!!assigneeId}
            title={assigneeTitle}
            onSelect={(assignee) => updatePath({ assignee })}
            items={[
              { key: 'unset', title: `<${t('unassigned')}>` },
              ...customerServices.map((user) => ({
                key: user.objectId,
                title: getUserDisplayName(user),
              })),
            ]}
          />
        </ButtonGroup>

        <DropdownMenu
          className="mr-1"
          active={!!categoryId}
          title={categoryTitle}
          onSelect={(categoryId) => updatePath({ categoryId })}
          items={categories.map((c, depth) => ({
            key: c.objectId,
            title: getIndentString(depth) + getCategoryName(c),
          }))}
        />

        <ButtonGroup className="mr-1" size="sm">
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
          className="mr-1"
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

        <Form.Control
          size="sm"
          value={authorUsername}
          placeholder={t('submitter')}
          onChange={handleChangeAuthorUsername}
          isInvalid={authorFilterValidationState === 'error'}
          isValid={authorFilterValidationState === 'success'}
        />

        <DelayInputForm
          size="sm"
          placeholder={t('searchKeyword')}
          initValue={searchString}
          onChange={(searchString) => updatePath({ searchString: searchString || undefined })}
        />

        {stage === 'done' && (
          <Form.Check
            checked={isOnlyUnlike === 'true'}
            onChange={(e) => updatePath({ isOnlyUnlike: e.target.checked ? 'true' : undefined })}
            label={t('badReviewsOnly')}
          />
        )}
      </Form>
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
      {filters.stage !== 'done' && (
        <DropdownButton
          variant="light"
          size="sm"
          className="mr-1"
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

function getGroupRoles() {
  return auth
    .queryRole()
    .where('name', 'starts-with', 'group_')
    .where('users', '==', auth.currentUser)
    .find()
}

async function getQuery(filters) {
  const {
    timeRange,
    stage,
    status,
    groupId,
    assignee,
    authorId,
    categoryId,
    isOnlyUnlike,
  } = filters

  let query = db.class('Ticket')

  if (timeRange && timeRange in TIME_RANGE_MAP) {
    const { starts, ends } = TIME_RANGE_MAP[timeRange]
    query = query.where('createdAt', '>=', starts).where('createdAt', '<', ends)
  }

  if (stage === 'todo') {
    query = query.where('status', '<=', TICKET_STATUS.WAITING_CUSTOMER_SERVICE).orderBy('status')
  } else if (stage === 'in-progress') {
    query = query
      .where('status', '>', TICKET_STATUS.WAITING_CUSTOMER_SERVICE)
      .where('status', '<', TICKET_STATUS.PRE_FULFILLED)
  } else if (stage === 'done') {
    query = query.where('status', '>=', TICKET_STATUS.PRE_FULFILLED)
  } else if (status) {
    query = query.where('status', '==', parseInt(status))
  }

  if (groupId) {
    if (groupId === 'unset') {
      query = query.where('group', 'not-exists')
    } else if (groupId === 'mine') {
      const groupRoles = await getGroupRoles()
      query = query.where(
        'group',
        'in',
        groupRoles.map((group) => db.class('Group').object(group.data.name.slice(6)))
      )
    } else {
      query = query.where('group', '==', db.class('Group').object(groupId))
    }
  }
  if (assignee) {
    if (assignee === 'unset') {
      query = query.where('assignee', 'not-exists')
    } else {
      const assigneeId = assignee === 'me' ? auth.currentUser?.id : assignee
      query = query.where('assignee', '==', db.class('_User').object(assigneeId))
    }
  }

  if (authorId) {
    query = query.where('author', '==', db.class('_User').object(authorId))
  }

  if (categoryId) {
    query = query.where('category.objectId', '==', categoryId)
  }

  if (isOnlyUnlike === 'true') {
    query = query.where('evaluation.star', '==', 0)
  }

  return query
}

async function getSearch(filters, tagMetaDatas) {
  const {
    searchString,
    tagKey,
    tagValue,
    timeRange,
    stage,
    status,
    groupId,
    assignee,
    authorId,
    categoryId,
    isOnlyUnlike,
  } = filters
  const search = db.search('Ticket')
  let conditions = []

  if (searchString?.trim()) {
    conditions.push(`(title:${searchString} OR content:${searchString} OR nid:${searchString})`)
  }
  if (timeRange && timeRange in TIME_RANGE_MAP) {
    const { starts, ends } = TIME_RANGE_MAP[timeRange]
    conditions.push(`createdAt:[${starts.toISOString()} TO ${ends.toISOString()}]`)
  }

  if (stage === 'todo') {
    search.orderBy('status')
    conditions.push(`status:<=${TICKET_STATUS.WAITING_CUSTOMER_SERVICE}`)
  } else if (stage === 'in-progress') {
    conditions.push(
      `status:{${TICKET_STATUS.WAITING_CUSTOMER_SERVICE} TO ${TICKET_STATUS.FULFILLED}}`
    )
  } else if (stage === 'done') {
    conditions.push(`status:>=${TICKET_STATUS.FULFILLED}`)
  } else if (status) {
    conditions.push(`status:${parseInt(status)}`)
  }

  if (groupId) {
    if (groupId === 'unset') {
      conditions.push(`_missing_:group`)
    } else if (groupId === 'mine') {
      const groupRoles = await getGroupRoles()
      const ids = groupRoles.map((group) => group.data.name.slice(6))
      conditions.push(`group.objectId:(${ids.join(' OR ')})`)
    } else {
      conditions.push(`group.objectId:${groupId}`)
    }
  }

  if (assignee) {
    if (assignee === 'unset') {
      conditions.push(`_missing_:assignee`)
    } else {
      const assigneeId = assignee === 'me' ? auth.currentUser?.id : assignee
      conditions.push(`assignee.objectId:${assigneeId}`)
    }
  }

  if (authorId) {
    conditions.push(`author.objectId:${authorId}`)
  }
  if (categoryId) {
    conditions.push(`category.objectId:${categoryId}`)
  }
  if (isOnlyUnlike === 'true') {
    conditions.push(`evaluation.star:0`)
  }

  if (tagKey) {
    const tagMetadata = tagMetaDatas.find((m) => m.data.key === tagKey)
    if (tagMetadata) {
      const columnName = tagMetadata.data.isPrivate ? 'privateTags' : 'tags'
      conditions.push(`${columnName}.key:${tagKey}`)
      if (tagValue) {
        conditions.push(`${columnName}.value:${tagValue}`)
      }
    }
  }

  search.queryString(conditions.join(' AND '))
  return search
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

  const findTickets = useCallback(
    async (filters = {}) => {
      const { page = '0', searchString, tagKey, tagValue, stage } = filters

      const trimmedSearchString = searchString?.trim()

      if (trimmedSearchString) {
        const search = await getSearch(filters, tagMetadatas)
        if (stage === 'todo') {
          search.orderBy('status')
        }
        const { data: tickets, hits } = await search
          .include('author', 'assignee')
          .limit(PAGE_SIZE)
          .skip(parseInt(page) * PAGE_SIZE)
          .orderBy('latestReply.updatedAt', 'desc')
          .orderBy('updatedAt', 'desc')
          .find()
        setTickets(tickets.map((item) => item.toJSON()))
        setTotalCount(hits)
        return
      }

      let query = await getQuery(filters)

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

      const [ticketObjects, count] = await query
        .include('author', 'assignee')
        .limit(PAGE_SIZE)
        .skip(parseInt(page) * PAGE_SIZE)
        .orderBy('latestReply.updatedAt', 'desc')
        .orderBy('updatedAt', 'desc')
        .findAndCount()
      setTickets(ticketObjects.map((t) => t.toJSON()))
      setTotalCount(count)
    },
    [tagMetadatas]
  )

  useEffect(() => {
    findTickets(filters)
  }, [filters, findTickets])

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
  useTitle(t('customerServiceTickets'))
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
      <div>
        <TicketMenu customerServices={customerServices} categories={categories} />
      </div>
      <div className={`${css.row}`}>
        <Form inline>
          <Form.Group>
            <Form.Check
              id="selectAll"
              label={t('selectAll')}
              className={css.ticketSelectCheckbox}
              checked={tickets.length && checkedTickets.size === tickets.length}
              onChange={handleCheckAll}
            />
          </Form.Group>
          {checkedTickets.size > 0 && (
            <BatchOperationMenu
              categories={categories}
              onChangeCategory={handleChangeCategory}
              onBatchOperate={handleBatchOperation}
            />
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

      <PreviewTip />
    </div>
  )
}
