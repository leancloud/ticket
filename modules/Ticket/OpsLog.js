import React, { useMemo } from 'react'
import * as Icon from 'react-bootstrap-icons'
import { OverlayTrigger, Popover, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { useQuery } from 'react-query'
import PropTypes from 'prop-types'
import { fetch } from '../../lib/leancloud'
import { UserLabel } from '../UserLabel'
import { Time } from './Time'
import { Category } from './Category'
import { InternalBadge } from '../components/InternalBadge'
import { GroupLabel } from '../components/Group'
import { http } from '../../lib/leancloud'
import { useAppContext } from '../context'
import i18next from 'i18next'
import css from './index.css'

export function AsyncUserLabel({ userId }) {
  const { t } = useTranslation()
  const { data } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetch(`/api/1/users/${userId}`),
    enabled: userId && userId !== 'system',
  })
  if (userId === undefined || userId === 'system') {
    return t('system')
  }
  return data ? <UserLabel user={data} /> : 'Loading...'
}
AsyncUserLabel.propTypes = {
  userId: PropTypes.string,
}

function SelectAssignee({ id, assignee_id, created_at }) {
  const { t } = useTranslation()
  return (
    <div className="ticket-status" id={id}>
      <div className="ticket-status-left">
        <span className="icon-wrap">
          <Icon.ArrowLeftRight />
        </span>
      </div>
      <div>
        {t('system')} {t('assignedTicketTo')} <AsyncUserLabel userId={assignee_id} /> (
        <Time value={created_at} href={'#' + id} />)
      </div>
    </div>
  )
}

SelectAssignee.propTypes = {
  id: PropTypes.string.isRequired,
  assignee_id: PropTypes.string.isRequired,
  created_at: PropTypes.string.isRequired,
}

function ChangeCategory({ id, operator_id, category_id, created_at }) {
  const { t } = useTranslation()
  return (
    <div className="ticket-status" id={id}>
      <div className="ticket-status-left">
        <span className="icon-wrap">
          <Icon.ArrowLeftRight />
        </span>
      </div>
      <div>
        <AsyncUserLabel userId={operator_id} /> {t('changedTicketCategoryTo')}{' '}
        <Category categoryId={category_id} /> (<Time value={created_at} href={'#' + id} />)
      </div>
    </div>
  )
}
ChangeCategory.propTypes = {
  id: PropTypes.string.isRequired,
  operator_id: PropTypes.string.isRequired,
  category_id: PropTypes.string.isRequired,
  created_at: PropTypes.string.isRequired,
}

function ChangeGroup({ id, operator_id, group_id, created_at }) {
  const { t } = useTranslation()
  return (
    <div className="ticket-status" id={id}>
      <div className="ticket-status-left">
        <span className="icon-wrap">
          <Icon.People />
        </span>
      </div>
      <div>
        <AsyncUserLabel userId={operator_id} /> {t('changedTicketGroupTo')}{' '}
        {group_id ? <GroupLabel groupId={group_id} /> : '<unset>'} (
        <Time value={created_at} href={'#' + id} />) <InternalBadge />
      </div>
    </div>
  )
}
ChangeGroup.propTypes = {
  id: PropTypes.string.isRequired,
  operator_id: PropTypes.string,
  group_id: PropTypes.string,
  created_at: PropTypes.string.isRequired,
}

function ChangeAssignee({ id, operator_id, assignee_id, created_at }) {
  const { t } = useTranslation()
  return (
    <div className="ticket-status" id={id}>
      <div className="ticket-status-left">
        <span className="icon-wrap">
          <Icon.ArrowLeftRight />
        </span>
      </div>
      <div>
        <AsyncUserLabel userId={operator_id} /> {t('changedTicketAssigneeTo')}{' '}
        {assignee_id ? <AsyncUserLabel userId={assignee_id} /> : '<unset>'} (
        <Time value={created_at} href={'#' + id} />)
      </div>
    </div>
  )
}
ChangeAssignee.propTypes = {
  id: PropTypes.string.isRequired,
  operator_id: PropTypes.string,
  assignee_id: PropTypes.string,
  created_at: PropTypes.string.isRequired,
}

const getDisplayTextByOptions = (value, options) => {
  if (value === undefined || !options) {
    return
  }
  if (Array.isArray(value)) {
    return value.map((v) => getDisplayTextByOptions(v, options)).join(' , ')
  }
  const option = options.filter(([v]) => v === value).shift()
  if (!option) {
    return
  }
  return option[1]
}
function ChangeField({ change }) {
  const { addNotification } = useAppContext()
  const { data } = useQuery({
    queryKey: ['ticket/fields', change.fieldId],
    queryFn: () => http.get(`/api/1/ticket-fields/${change.fieldId}`),
    staleTime: 1000 * 60 * 5,
    onError: (err) => addNotification(err),
  })
  const currentLocale = useMemo(() => (i18next.language === 'zh' ? 'zh-cn' : i18next.language), [])
  const displayText = useMemo(() => {
    if (!data || !data.active) {
      return {}
    }
    const { variants, default_locale } = data
    const variantMap = variants.reduce((pre, current) => {
      const { locale, ...rest } = current
      pre[locale] = rest
      return pre
    }, {})
    const variant = variantMap[currentLocale] || variantMap[default_locale]
    return {
      title: variant.title,
      oldText: variant.options ? getDisplayTextByOptions(change.old, variant.options) : change.old,
      newText: variant.options ? getDisplayTextByOptions(change.new, variant.options) : change.new,
    }
  }, [data, currentLocale, change])
  return (
    <Form.Group controlId={change.fieldId} key={change.fieldId}>
      <Form.Label className="font-weight-bold">{displayText.title || change.fieldId}</Form.Label>
      <div>
        {change.old !== undefined && (
          <>
            <del className="text-info">{displayText.oldText || change.old}</del>
            <Icon.ArrowRight className="ml-2 mr-2" />
          </>
        )}
        <span className="text-info">{displayText.newText || change.new}</span>
      </div>
    </Form.Group>
  )
}
ChangeField.propTypes = {
  change: PropTypes.object.isRequired,
}

function ChangeFields({ id, operator_id, changes, created_at }) {
  const { t } = useTranslation()
  if (!operator_id || !changes || changes.length === 0) {
    return null
  }
  return (
    <div className="ticket-status" id={id}>
      <div className="ticket-status-left">
        <span className="icon-wrap">
          <Icon.ChatLeftFill />
        </span>
      </div>
      <OverlayTrigger
        placement="right"
        overlay={
          <Popover>
            <Popover.Content>
              <Form className={css.form}>
                {changes.map((change) => (
                  <ChangeField change={change} key={change.fieldId} />
                ))}
              </Form>
            </Popover.Content>
          </Popover>
        }
      >
        <div>
          <AsyncUserLabel userId={operator_id} /> {t('changedTicketFields')}
          (<Time value={created_at} href={'#' + id} />)
        </div>
      </OverlayTrigger>
    </div>
  )
}
ChangeFields.propTypes = {
  id: PropTypes.string.isRequired,
  changes: PropTypes.array,
  operator_id: PropTypes.string,
  created_at: PropTypes.string.isRequired,
}

function ReplyWithNoContent({ id, operator_id, created_at }) {
  const { t } = useTranslation()
  return (
    <div className="ticket-status" id={id}>
      <div className="ticket-status-left">
        <span className="icon-wrap">
          <Icon.ChatLeftFill />
        </span>
      </div>
      <div>
        <AsyncUserLabel userId={operator_id} /> {t('thoughtNoNeedToReply')} (
        <Time value={created_at} href={'#' + id} />)
      </div>
    </div>
  )
}
ReplyWithNoContent.propTypes = {
  id: PropTypes.string.isRequired,
  operator_id: PropTypes.string.isRequired,
  created_at: PropTypes.string.isRequired,
}

function ReplySoon({ id, operator_id, created_at }) {
  const { t } = useTranslation()
  return (
    <div className="ticket-status" id={id}>
      <div className="ticket-status-left">
        <span className="icon-wrap awaiting">
          <Icon.Hourglass />
        </span>
      </div>
      <div>
        <AsyncUserLabel userId={operator_id} /> {t('thoughtNeedTime')} (
        <Time value={created_at} href={'#' + id} />)
      </div>
    </div>
  )
}
ReplySoon.propTypes = {
  id: PropTypes.string.isRequired,
  operator_id: PropTypes.string.isRequired,
  created_at: PropTypes.string.isRequired,
}

function Resolve({ id, operator_id, created_at }) {
  const { t } = useTranslation()
  return (
    <div className="ticket-status" id={id}>
      <div className="ticket-status-left">
        <span className="icon-wrap resolved">
          <Icon.CheckCircle />
        </span>
      </div>
      <div>
        <AsyncUserLabel userId={operator_id} /> {t('thoughtResolved')} (
        <Time value={created_at} href={'#' + id} />)
      </div>
    </div>
  )
}
Resolve.propTypes = {
  id: PropTypes.string.isRequired,
  operator_id: PropTypes.string.isRequired,
  created_at: PropTypes.string.isRequired,
}

function Close({ id, operator_id, created_at }) {
  const { t } = useTranslation()
  return (
    <div className="ticket-status" id={id}>
      <div className="ticket-status-left">
        <span className="icon-wrap closed">
          <Icon.SlashCircle />
        </span>
      </div>
      <div>
        <AsyncUserLabel userId={operator_id} /> {t('closedTicket')} (
        <Time value={created_at} href={'#' + id} />)
      </div>
    </div>
  )
}
Close.propTypes = {
  id: PropTypes.string.isRequired,
  operator_id: PropTypes.string.isRequired,
  created_at: PropTypes.string.isRequired,
}

function Reopen({ id, operator_id, created_at }) {
  const { t } = useTranslation()
  return (
    <div className="ticket-status" id={id}>
      <div className="ticket-status-left">
        <span className="icon-wrap reopened">
          <Icon.RecordCircle />
        </span>
      </div>
      <div>
        <AsyncUserLabel userId={operator_id} /> {t('reopenedTicket')} (
        <Time value={created_at} href={'#' + id} />)
      </div>
    </div>
  )
}
Reopen.propTypes = {
  id: PropTypes.string.isRequired,
  operator_id: PropTypes.string.isRequired,
  created_at: PropTypes.string.isRequired,
}

export function OpsLog({ data }) {
  switch (data.action) {
    case 'selectAssignee':
      return <SelectAssignee {...data} />
    case 'changeCategory':
      return <ChangeCategory {...data} />
    case 'changeAssignee':
      return <ChangeAssignee {...data} />
    case 'changeGroup':
      return <ChangeGroup {...data} />
    case 'changeFields':
      return <ChangeFields {...data} />
    case 'replyWithNoContent':
      return <ReplyWithNoContent {...data} />
    case 'replySoon':
      return <ReplySoon {...data} />
    case 'resolve':
      return <Resolve {...data} />
    case 'reject':
    case 'close':
      return <Close {...data} />
    case 'reopen':
      return <Reopen {...data} />
    default:
      return null
  }
}
OpsLog.propTypes = {
  data: PropTypes.object.isRequired,
}
