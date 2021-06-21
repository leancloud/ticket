import React from 'react'
import * as Icon from 'react-bootstrap-icons'
import { useTranslation } from 'react-i18next'
import { useQuery } from 'react-query'
import PropTypes from 'prop-types'

import { fetch } from '../../lib/leancloud'
import { UserLabel } from '../UserLabel'
import { Time } from './Time'
import { Category } from './Category'
import { InternalBadge } from '../components/InternalBadge'
import { GroupLabel } from '../components/Group'

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
  userId: PropTypes.string.isRequired,
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
      <div className="ticket-status-right">
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
      <div className="ticket-status-right">
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
      <div className="ticket-status-right">
        <AsyncUserLabel userId={operator_id} /> {t('changedTicketGroupTo')}{' '}
        {group_id ? <GroupLabel groupId={group_id} /> : '<unset>'} (
        <Time value={created_at} href={'#' + id} />) <InternalBadge />
      </div>
    </div>
  )
}
ChangeGroup.propTypes = {
  id: PropTypes.string.isRequired,
  operator_id: PropTypes.string.isRequired,
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
      <div className="ticket-status-right">
        <AsyncUserLabel userId={operator_id} /> {t('changedTicketAssigneeTo')}{' '}
        {assignee_id ? <AsyncUserLabel userId={assignee_id} /> : '<unset>'} (
        <Time value={created_at} href={'#' + id} />)
      </div>
    </div>
  )
}
ChangeAssignee.propTypes = {
  id: PropTypes.string.isRequired,
  operator_id: PropTypes.string.isRequired,
  assignee_id: PropTypes.string,
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
      <div className="ticket-status-right">
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
      <div className="ticket-status-right">
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
      <div className="ticket-status-right">
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
      <div className="ticket-status-right">
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
      <div className="ticket-status-right">
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
