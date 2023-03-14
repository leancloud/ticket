import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
  useRef,
} from 'react'
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
import { Button, Form, Modal } from 'react-bootstrap'

// eslint-disable-next-line react/display-name
const MainTicketModal = forwardRef(({ ticket }, ref) => {
  const [show, setShow] = useState(false)
  const [targetId, setTargetId] = useState()
  const [selectedId, setSelectedId] = useState()

  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const { data: target } = useQuery({
    queryFn: () =>
      http.get(`/api/2/tickets/${targetId}`, {
        params: {
          includeAssociateTicket: true,
        },
      }),
    queryKey: ['ticket', targetId, { includeAssociateTicket: true }],
    enabled: !!targetId,
  })

  const { mutate: associate, isLoading } = useMutation({
    mutationFn: async (mainId) => {
      await http.patch(`/api/2/tickets/${targetId}`, {
        associateTicketId: ticket.id,
        mainTicketId: mainId,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ticket', ticket.id])
      queryClient.invalidateQueries(['ticket', targetId])
      queryClient.invalidateQueries(['tickets', ticket.authorId])
    },
  })

  const handleOpen = useCallback((id) => {
    setTargetId(id)
    setShow(true)
  }, [])

  const handleClose = useCallback(() => {
    setShow(false)
  }, [])

  const handleSubmit = useCallback(
    (e) => {
      associate(selectedId, {
        onSuccess: () => {
          setShow(false)
        },
      })
      e.preventDefault()
    },
    [selectedId, associate]
  )

  useImperativeHandle(
    ref,
    () => ({
      open: handleOpen,
    }),
    [handleOpen]
  )

  const tickets = useMemo(
    () =>
      target && [
        ticket,
        ...(ticket.associateTickets ?? []),
        target,
        ...(target.associateTickets ?? []),
      ],
    [ticket, target]
  )

  return (
    <Modal show={show}>
      <Modal.Header closeButton>
        <Modal.Title>{t('ticket.selectMainTicket')}</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body
          onChange={(e) => {
            setSelectedId(e.target.value)
          }}
        >
          {tickets?.map(({ id, title, nid }) => (
            <Form.Check
              key={id}
              type="radio"
              label={`#${nid} ${title}`}
              name="main-ticket"
              value={id}
            />
          ))}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
            {t('close')}
          </Button>
          <Button variant="primary" type="submit" disabled={isLoading || !selectedId}>
            {t('submit')}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
})

MainTicketModal.propTypes = {
  ticket: PropTypes.object.isRequired,
}

function RecentTickets({ ticket }) {
  const { t } = useTranslation()
  const { addNotification } = useAppContext()
  const queryClient = useQueryClient()

  const modalRef = useRef(null)

  const excludeNids = useMemo(
    () => [ticket.nid, ...(ticket.associateTickets?.map(({ nid }) => nid) ?? [])],
    [ticket]
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
      await http.patch(`/api/2/tickets/${id}`, { associateTicketId: ticket.id })
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries(['ticket', id])
      queryClient.invalidateQueries(['ticket', ticket.id])
      queryClient.invalidateQueries(['tickets', ticket.authorId])
    },
  })

  const handleAssociate = (id) => {
    modalRef.current?.open(id)
  }

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
              <Button
                onClick={() => {
                  ticketItem.associated ? handleAssociate(ticketItem.id) : associate(ticketItem.id)
                }}
                variant="light"
                size="sm"
              >
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
      <MainTicketModal ref={modalRef} ticket={ticket} />
    </>
  )
}

RecentTickets.propTypes = {
  ticket: PropTypes.object.isRequired,
}
const MemoRecentTickets = React.memo(RecentTickets)
export { MemoRecentTickets as RecentTickets }
