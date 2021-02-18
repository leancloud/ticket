import React from 'react'
import {Checkbox} from 'react-bootstrap'
import { Link } from 'react-router-dom'
import _ from 'lodash'
import moment from 'moment'

import TicketStatusLabel from '../TicketStatusLabel'
import {UserLabel} from '../UserLabel'
import css from '../CustomerServiceTickets.css'
import translate from '../i18n/translate'

export const TicketItem = translate(({t, ticket, checkable, checked, onCheckboxChange, category}) => {
  const contributors = _.uniqBy(ticket.joinedCustomerServices || [], 'objectId')

  return (
    <div className={`${css.ticket} ${css.row}`}>
      {checkable && (
        <Checkbox
          className={css.ticketSelectCheckbox}
          onChange={onCheckboxChange}
          checked={checked}
        />
      )}
      <div className={css.ticketContent}>
        <div className={css.heading}>
          <div className={css.left}>
            <span className={css.nid}>#{ticket.nid}</span>
            <Link className={css.title} to={'/tickets/' + ticket.nid}>{ticket.title}</Link>
            <span className={css.category}>{category}</span>
          </div>
          <div>
            {ticket.replyCount &&
              <Link className={css.commentCounter} title={'reply ' + ticket.replyCount} to={'/tickets/' + ticket.nid}>
                <span className={css.commentCounterIcon + ' glyphicon glyphicon-comment'}></span>
                {ticket.replyCount}
              </Link>
            }
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
                `, ${t('updatedAt')} ${moment(ticket.updatedAt).fromNow()}`
              }
            </span>
          </div>
          <div>
            <span className={css.assignee}>
              <UserLabel user={ticket.assignee} />
            </span>
            <span className={css.contributors}>
              {contributors.map(user => (
                <span key={user.objectId}><UserLabel user={user} /> </span>
              ))}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
})
