import React from 'react'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import moment from 'moment'
import * as Icon from 'react-bootstrap-icons'

import css from './index.css'
import csCss from '../CustomerServiceTickets.css'
import { UserLabel } from '../UserLabel'
import { getCategoryPathName } from '../common'
import { useCategoriesTree } from '../category/hooks'

export function Operator({ operator }) {
  const { t } = useTranslation()
  if (!operator || operator.objectId === 'system') {
    return t('system')
  }
  return <UserLabel user={operator} />
}
Operator.propTypes = {
  operator: PropTypes.object,
}

export function Time({ value, hash }) {
  if (!moment.isMoment(value)) {
    value = moment(value)
  }
  if (moment().diff(value) > 86400000) {
    return (
      <a className="timestamp" href={'#' + hash} title={value.format()}>
        {value.calendar()}
      </a>
    )
  } else {
    return (
      <a className="timestamp" href={'#' + hash} title={value.format()}>
        {value.fromNow()}
      </a>
    )
  }
}
Time.propTypes = {
  value: PropTypes.any.isRequired,
  hash: PropTypes.string.isRequired,
}

export function OpsLog({ opsLog }) {
  const { t } = useTranslation()
  const { data: categoriesTree, isLoading: isLoadingCategoriesTree } = useCategoriesTree()

  let content = [null, null]
  switch (opsLog.action) {
    case 'selectAssignee':
      content = [
        <span className="icon-wrap">
          <Icon.ArrowLeftRight />
        </span>,
        <>
          {t('system')} {t('assignedTicketTo')} <UserLabel user={opsLog.data.assignee} />
        </>,
      ]
      break
    case 'changeCategory':
      content = [
        <span className="icon-wrap">
          <Icon.ArrowLeftRight />
        </span>,
        <>
          <UserLabel user={opsLog.data.operator} /> {t('changedTicketCategoryTo')}{' '}
          <span className={csCss.category + ' ' + css.category}>
            {isLoadingCategoriesTree
              ? 'Loading...'
              : getCategoryPathName(opsLog.data.category, categoriesTree)}
          </span>
        </>,
      ]
      break
    case 'changeAssignee':
      content = [
        <span className="icon-wrap">
          <Icon.ArrowLeftRight />
        </span>,
        <>
          <Operator operator={opsLog.data.operator} /> {t('changedTicketAssigneeTo')}{' '}
          <UserLabel user={opsLog.data.assignee} />
        </>,
      ]
      break
    case 'replyWithNoContent':
      content = [
        <span className="icon-wrap">
          <Icon.ChatLeftFill />
        </span>,
        <>
          <UserLabel user={opsLog.data.operator} /> {t('thoughtNoNeedToReply')}
        </>,
      ]
      break
    case 'replySoon':
      content = [
        <span className="icon-wrap awaiting">
          <Icon.Hourglass />
        </span>,
        <>
          <UserLabel user={opsLog.data.operator} /> {t('thoughtNeedTime')}
        </>,
      ]
      break
    case 'resolve':
      content = [
        <span className="icon-wrap resolved">
          <Icon.CheckCircle />
        </span>,
        <>
          <UserLabel user={opsLog.data.operator} /> {t('thoughtResolved')}
        </>,
      ]
      break
    case 'close':
    case 'reject': // 向前兼容
      content = [
        <span className="icon-wrap closed">
          <Icon.SlashCircle />
        </span>,
        <>
          <UserLabel user={opsLog.data.operator} /> {t('closedTicket')}
        </>,
      ]
      break
    case 'reopen':
      content = [
        <span className="icon-wrap reopened">
          <Icon.RecordCircle />
        </span>,
        <>
          <UserLabel user={opsLog.data.operator} /> {t('reopenedTicket')}
        </>,
      ]
  }

  return (
    <div className="ticket-status" id={opsLog.objectId}>
      <div className="ticket-status-left">{content[0]}</div>
      <div className="ticket-status-right">
        {content[1]} <Time value={opsLog.createdAt} hash={opsLog.objectId} />
      </div>
    </div>
  )
}
OpsLog.propTypes = {
  opsLog: PropTypes.object.isRequired,
}
