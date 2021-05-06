import React from 'react'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import moment from 'moment'

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
          <i className="bi bi-arrow-left-right"></i>
        </span>,
        <>
          {t('system')} {t('assignedTicketTo')} <UserLabel user={opsLog.data.assignee} />
        </>,
      ]
      break
    case 'changeCategory':
      content = [
        <span className="icon-wrap">
          <i className="bi bi-arrow-left-right"></i>
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
          <i className="bi bi-arrow-left-right"></i>
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
          <i className="bi bi-chat-left-fill"></i>
        </span>,
        <>
          <UserLabel user={opsLog.data.operator} /> {t('thoughtNoNeedToReply')}
        </>,
      ]
      break
    case 'replySoon':
      content = [
        <span className="icon-wrap awaiting">
          <i className="bi bi-hourglass"></i>
        </span>,
        <>
          <UserLabel user={opsLog.data.operator} /> {t('thoughtNeedTime')}
        </>,
      ]
      break
    case 'resolve':
      content = [
        <span className="icon-wrap resolved">
          <i className="bi bi-check-circle"></i>
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
          <i className="bi bi-slash-circle"></i>
        </span>,
        <>
          <UserLabel user={opsLog.data.operator} /> {t('closedTicket')}
        </>,
      ]
      break
    case 'reopen':
      content = [
        <span className="icon-wrap reopened">
          <i className="bi bi-record-circle"></i>
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
