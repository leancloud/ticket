import React, { useMemo } from 'react'
import { useQuery } from 'react-query'
import { Link } from 'react-router-dom'
import PropTypes from 'prop-types'
import moment from 'moment'
import { useAppContext } from 'modules/context'
import { http } from '../../lib/leancloud'
import styles from './index.css'
import { UserLabel } from '../UserLabel'
import { useTranslation } from 'react-i18next'
import { TicketStatusLabel } from '../components/TicketStatusLabel'

function RecentTickets({ authorId, excludeNid }) {
  const { t } = useTranslation()
  const { addNotification } = useAppContext()
  const { data } = useQuery({
    queryKey: ['tickets', authorId, excludeNid],
    queryFn: () =>
      http.get('/api/1/tickets', {
        params: {
          author_id: authorId,
          page_size: excludeNid ? 11 : 10,
          q: 'sort:created_at-desc',
          // created_at_lt: ticket.created_at,
        },
      }),
    enabled: !!authorId,
    onError: addNotification,
  })
  const tickets = useMemo(() => {
    if (!data) {
      return []
    }
    if (!excludeNid) {
      return data
    }
    return data.filter((ticketItem) => ticketItem.nid !== excludeNid)
  }, [data, excludeNid])

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
              <div className={styles.ticketInfo}>
                <Link
                  to={`/tickets/${ticketItem.nid}`}
                  title={ticketItem.title}
                  className={styles.link}
                >
                  <span className={styles.nid}>#{ticketItem.nid}</span>
                  {ticketItem.title}
                </Link>
                <TicketStatusLabel status={ticketItem.status} />
                <span
                  className={styles.creator}
                  title={moment(ticketItem.created_at).format('YYYY-MM-DD HH:MM')}
                >
                  {t('createdAt')} {moment(ticketItem.created_at).fromNow()}
                </span>
              </div>

              <span>
                {ticketItem.assignee ? <UserLabel user={ticketItem.assignee} /> : '<unassigned>'}
              </span>
            </li>
          )
        })}
      </ul>
    </>
  )
}

RecentTickets.propTypes = {
  authorId: PropTypes.string.isRequired,
  excludeNid: PropTypes.number,
}
const MemoRecentTickets = React.memo(RecentTickets)
export { MemoRecentTickets as RecentTickets }
