import React, { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { Link } from 'react-router-dom'
import PropTypes from 'prop-types'
import moment from 'moment'
import { useAppContext } from 'modules/context'
import { http } from '../../lib/leancloud'
import styles from './index.css'
import { UserLabel } from '../UserLabel'
import { useTranslation } from 'react-i18next'
import { TicketStatusLabel } from '../components/TicketStatusLabel'
import { Button } from 'react-bootstrap'

function RecentTickets({ ticket }) {
  const { t } = useTranslation()
  const { addNotification } = useAppContext()
  const queryClient = useQueryClient()

  const { data: associatedTickets } = useQuery({
    queryKey: ['associatedTickets', ticket.id],
    queryFn: () => http.get(`/api/2/tickets/${ticket.id}/associated-tickets`),
  })

  const excludeNids = useMemo(
    () => [ticket.nid, ...(associatedTickets?.map(({ nid }) => nid) ?? [])],
    [ticket, associatedTickets]
  )

  const { data } = useQuery({
    queryKey: ['tickets', ticket.authorId, excludeNids],
    queryFn: () =>
      http.get('/api/2/tickets', {
        params: {
          authorId: ticket.authorId,
          pageSize: 10 + (excludeNids?.length ?? 0),
          orderBy: 'createdAt-desc',
          includeAssignee: true,
        },
      }),
    enabled: !!ticket.authorId,
    onError: addNotification,
  })

  const { mutate: associate } = useMutation({
    mutationFn: async (id) => {
      await http.post(`/api/2/tickets/${ticket.id}/associated-tickets`, { ticketId: id })
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries(['ticket'])
      queryClient.invalidateQueries(['tickets'])
      queryClient.invalidateQueries(['associatedTickets'])
    },
  })

  const tickets = useMemo(() => {
    if (!data) {
      return []
    }
    if (!excludeNids) {
      return data
    }
    return data.filter((ticketItem) => !excludeNids.includes(ticketItem.nid))
  }, [data, excludeNids])

  if (tickets.length === 0) {
    return null
  }

  return (
    <>
      <div className={styles.recentTitle}>
        {t('ticket.recently')}
        <span className={styles.allTickets}>
          {' '}
          (
          <Link to={`/customerService/tickets?authorId=${ticket.authorId}`}>{t('allTickets')}</Link>
          )
        </span>
      </div>
      <ul className={styles.recentList}>
        {tickets.map((ticketItem) => (
          <li key={ticketItem.nid}>
            <Link
              to={`/tickets/${ticketItem.nid}`}
              title={ticketItem.title}
              className={styles.link}
            >
              <span className={styles.nid}>#{ticketItem.nid}</span>
              {ticketItem.title}
            </Link>

            <span>
              <TicketStatusLabel status={ticketItem.status} />
            </span>

            <span
              className={styles.timestamp}
              title={moment(ticketItem.createdAt).format('YYYY-MM-DD HH:MM')}
            >
              {t('createdAt')} {moment(ticketItem.createdAt).fromNow()}
            </span>

            <span>
              <Button onClick={() => associate(ticketItem.id)} variant="light" size="sm">
                {t('ticket.associate')}
              </Button>
            </span>

            <span>
              {ticketItem.assignee ? (
                <UserLabel user={ticketItem.assignee} />
              ) : (
                `<${t('unassigned')}>`
              )}
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}

RecentTickets.propTypes = {
  ticket: PropTypes.object.isRequired,
}
const MemoRecentTickets = React.memo(RecentTickets)
export { MemoRecentTickets as RecentTickets }
