import React, { useMemo } from 'react'
import { useQuery } from 'react-query'
import { Link } from 'react-router-dom'
import PropTypes from 'prop-types'
import { useAppContext } from 'modules/context'
import { http } from '../../lib/leancloud'
import styles from './index.css'
import { UserLabel } from '../UserLabel'
import { useTranslation } from 'react-i18next'
import { TicketStatusLabel } from '../components/TicketStatusLabel'

function RecentTickets({ ticket }) {
  const { t } = useTranslation()
  const { addNotification } = useAppContext()
  const { author_id } = ticket
  const { data } = useQuery({
    queryKey: ['tickets', author_id],
    queryFn: () =>
      http.get('/api/1/tickets', {
        params: {
          author_id,
          page_size: 11,
          q: 'sort:created_at-desc',
          // created_at_lt: ticket.created_at,
        },
      }),
    enabled: !!author_id,
    onError: addNotification,
  })
  const tickets = useMemo(() => {
    if (!data) {
      return []
    }
    return data.filter((ticketItem) => ticketItem.nid !== ticket.nid).splice(0, 10)
  }, [data, ticket.nid])
  if (tickets.length === 0) {
    return null
  }
  return (
    <>
      <div className={styles.title}>{t('ticket.recently')}</div>
      <ul className={styles.recentList}>
        {tickets.map((ticketItem) => {
          return (
            <li key={ticketItem.nid}>
              <span>
                <Link
                  to={`/tickets/${ticketItem.nid}`}
                  title={ticketItem.title}
                  className={styles.link}
                >
                  {ticketItem.title}
                </Link>
                <TicketStatusLabel status={ticketItem.status} />
              </span>
              <span>{ticket.assignee ? <UserLabel user={ticket.assignee} /> : '<unset>'}</span>
            </li>
          )
        })}
      </ul>
    </>
  )
}

RecentTickets.propTypes = {
  ticket: PropTypes.object.isRequired,
}
const MemoRecentTickets = React.memo(RecentTickets)
export { MemoRecentTickets as RecentTickets }
