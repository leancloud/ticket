import React from 'react'
import { FormCheck } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import _ from 'lodash'
import * as Icon from 'react-bootstrap-icons'
import moment from 'moment'

import { TicketStatusLabel } from '../components/TicketStatusLabel'
import { UserLabel } from '../UserLabel'
import css from '../CustomerServiceTickets.css'

export function TicketItem({ ticket, checkable, checked, onCheckboxChange, category }) {
  const { t } = useTranslation()
  const contributors = _.uniqBy(ticket.joinedCustomerServices || [], 'objectId')

  return (
    <div className={`${css.ticket} ${css.row}`}>
      {checkable && (
        <FormCheck
          className={css.ticketSelectCheckbox}
          onChange={onCheckboxChange}
          checked={checked}
        />
      )}
      <div className={css.ticketContent}>
        <div className={css.heading}>
          <div className={css.left}>
            <span className={css.nid}>#{ticket.nid}</span>
            <Link className={css.title} to={'/tickets/' + ticket.nid}>
              {ticket.title}
            </Link>
            <span className={css.category}>{category}</span>
          </div>
          <div>
            {ticket.replyCount && (
              <Link
                className={css.commentCounter}
                title={'reply ' + ticket.replyCount}
                to={'/tickets/' + ticket.nid}
              >
                <Icon.ChatLeft className={css.commentCounterIcon} />
                {ticket.replyCount}
              </Link>
            )}
          </div>
        </div>

        <div className={css.meta}>
          <div className={css.left}>
            <span className={css.status}>
              <TicketStatusLabel status={ticket.status} />
            </span>
            <span className={css.creator}>
              <UserLabel user={ticket.author} />
            </span>
            <span>
              {` ${t('createdAt')} ${moment(ticket.createdAt).fromNow()}`}
              {moment(ticket.createdAt).fromNow() !== moment(ticket.updatedAt).fromNow() &&
                `, ${t('updatedAt')} ${moment(ticket.updatedAt).fromNow()}`}
            </span>
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
                  <UserLabel user={user} />{' '}
                </span>
              ))}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

TicketItem.propTypes = {
  ticket: PropTypes.object.isRequired,
  checkable: PropTypes.bool,
  checked: PropTypes.bool,
  onCheckboxChange: PropTypes.func,
  category: PropTypes.string,
}
