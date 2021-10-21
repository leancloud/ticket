import React, { useCallback, useContext } from 'react'
import { Button, FormGroup, Table } from 'react-bootstrap'
import EmptyBadge from './components/EmptyBadge'
import { http } from '../lib/leancloud'
import { useQuery, useQueryClient } from 'react-query'
import { Link } from 'react-router-dom'
import { TicketStatusLabel } from './components/TicketStatusLabel'
import moment from 'moment'
import classNames from 'classnames'

import css from './CustomerServiceTickets.css'
import { AppContext } from './context'

const renderLastAction = (action) => {
  return (
    {
      newTicket: '新建工单',
      reply: '新的回复',
      changeAssignee: '转移给你',
      ticketEvaluation: '新的评价',
      changeStatus: '状态更新',
    }[action] ?? ''
  )
}

const Notification = ({ notification }) => {
  const unread = notification.unreadCount > 0
  return (
    <tr className={classNames([css.notification, unread ? css.unread : css.read])}>
      <td>{unread && <EmptyBadge />}</td>
      <td>
        <div className={css.heading}>
          <Link to={'/tickets/' + notification.ticket.nid} className={css.title}>
            {notification.ticket.title}
          </Link>
        </div>
        <div className={css.meta}>
          <span className={css.nid}>#{notification.ticket.nid}</span>
          <span className={css.status}>
            <TicketStatusLabel status={notification.ticket.status} />
          </span>
        </div>
      </td>
      <td>{renderLastAction(notification.latestAction)}</td>
      <td className="text-muted">
        {notification.latestActionAt && moment(notification.latestActionAt).fromNow()}
      </td>
    </tr>
  )
}

export const Notifications = () => {
  const { addNotification } = useContext(AppContext)
  const queryClient = useQueryClient()

  const { data: notifications, refetch } = useQuery({
    queryKey: 'notifications',
    queryFn: () => http.get('/api/2/notifications'),
  })

  const markAllReaded = useCallback(() => {
    http
      .post('/api/2/notifications/read-all')
      .then(() => {
        refetch()
        queryClient.invalidateQueries('unread')
        return
      })
      .catch(addNotification)
  }, [addNotification, queryClient, refetch])

  return (
    <div>
      <FormGroup>
        <Button variant="light" onClick={markAllReaded}>
          全部标记为已读
        </Button>
      </FormGroup>
      <Table>
        <tbody>
          {notifications &&
            notifications.map((notification) => (
              <Notification notification={notification} key={notification.id} />
            ))}
        </tbody>
      </Table>
    </div>
  )
}
