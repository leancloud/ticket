import React from 'react'
import {Checkbox} from 'react-bootstrap'
import { Link } from 'react-router'
import _ from 'lodash'
import moment from 'moment'

import TicketStatusLabel from '../TicketStatusLabel'
import {UserLabel} from '../common'
import css from '../CustomerServiceTickets.css'
import translate from '../i18n/translate'

export const TicketItem = translate(({t, ticket, checkable, checked, onClickCheckbox, category}) => {
  const customerServices = _.uniqBy(ticket.data.joinedCustomerServices || [], 'objectId')

  return (
    <div className={`${css.ticket} ${css.row}`}>
      {checkable && (
        <Checkbox
          className={css.ticketSelectCheckbox}
          onClick={onClickCheckbox}
          checked={checked}
        />
      )}
      <div className={css.ticketContent}>
        <div className={css.heading}>
          <div className={css.left}>
            <span className={css.nid}>#{ticket.data.nid}</span>
            <Link className={css.title} to={'/tickets/' + ticket.data.nid}>{ticket.data.title}</Link>
            <span className={css.category}>{category}</span>
          </div>
          <div className={css.right}>
            {ticket.data.replyCount &&
              <Link className={css.commentCounter} title={'reply ' + ticket.data.replyCount} to={'/tickets/' + ticket.data.nid}>
                <span className={css.commentCounterIcon + ' glyphicon glyphicon-comment'}></span>
                {ticket.data.replyCount}
              </Link>
            }
          </div>
        </div>

        <div className={css.meta}>
          <div className={css.left}>
            <span className={css.status}><TicketStatusLabel status={ticket.data.status} /></span>
            <span className={css.creator}><UserLabel user={ticket.data.author} /></span> {t('createdAt')} {moment(ticket.createdAt).fromNow()}
            {moment(ticket.createdAt).fromNow() === moment(ticket.updatedAt).fromNow() ||
              <span>, {t('updatedAt')} {moment(ticket.updatedAt).fromNow()}</span>
            }
          </div>
          <div className={css.right}>
            <span className={css.assignee}><UserLabel user={ticket.data.assignee} /></span>
            <span className={css.contributors}>
              <span>
                {customerServices.map(user => (
                  <span key={user.objectId}><UserLabel user={user} /> </span>
                ))}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
})
