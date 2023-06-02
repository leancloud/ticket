import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useRouteMatch } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { Button, Col, OverlayTrigger, Row, Tooltip } from 'react-bootstrap'
import PropTypes from 'prop-types'
import * as Icon from 'react-bootstrap-icons'
import moment from 'moment'
import _ from 'lodash'

import css from './index.css'
import csCss from '../CustomerServiceTickets.css'
import { db, fetch, http } from '../../lib/leancloud'
import { useTitle } from '../utils/hooks'
import { WeekendWarning } from '../components/WeekendWarning'
import { AppContext } from '../context'
import { TicketStatusLabel } from '../components/TicketStatusLabel'
import { UserLabel } from '../UserLabel'
import { ReplyCard } from './ReplyCard'
import { OpsLog } from './OpsLog'
import { TicketMetadata, Fields } from './TicketMetadata'
import { TicketOperation } from './TicketOperation'
import { ticketStatus } from '../../lib/common'
import { TicketReply } from './TicketReply'
import { Evaluation } from './Evaluation'
import { LeanCloudApp } from './LeanCloudApp'
import { CSReplyEditor } from './CSReplyEditor'
import { RecentTickets } from './RecentTickets'
import { EditReplyModal } from './EditReplyModal'
import { ReplyRevisionsModal } from './ReplyRevisionsModal'
import { AccessControl } from './AccessControl'
import { Time } from './Time'
import { NextTicketSection } from './NextTicket'
import { useSearchParam } from 'react-use'

export function updateTicket(id, data) {
  return fetch(`/api/1/tickets/${id}`, {
    method: 'PATCH',
    body: data,
  })
}

function fetchReplies(ticketId, cursor) {
  return fetch(`/api/1/tickets/${ticketId}/replies`, {
    query: {
      q: cursor ? `created_at:>${cursor}` : undefined,
    },
  })
}

function fetchOpsLogs(ticketId, cursor) {
  return fetch(`/api/1/tickets/${ticketId}/ops-logs`, {
    query: {
      q: cursor ? `created_at:>${cursor}` : undefined,
    },
  })
}

function useTicket(nid) {
  const { data: tickets, isLoading: loadingTickets, error: ticketsError } = useQuery(
    ['tickets', { nid }],
    () => fetch('/api/1/tickets', { query: { nid } })
  )
  const ticketId = tickets?.[0]?.id

  const {
    data: ticket,
    isLoading: loadingTicket,
    error: ticketError,
    refetch: refetchTicket,
  } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () =>
      fetch(`/api/2/tickets/${ticketId}`, {
        query: {
          includeAuthor: true,
          includeAssociateTicket: true,
          includeFiles: true,
          includeAssignee: true,
          includeGroup: true,
          includeReporter: true,
          includeTag: true,
        },
      }),
    enabled: !!ticketId,
  })

  const $onUpdate = useRef()
  $onUpdate.current = (obj) => {
    if (obj.updatedAt.toISOString() !== ticket?.updatedAt) {
      refetchTicket()
    }
  }

  useEffect(() => {
    if (!ticketId) {
      return
    }
    const query = db.class('Ticket').where('objectId', '==', ticketId)
    const liveQuery = query
      .subscribe()
      .then((subscription) => subscription.on('update', (...args) => $onUpdate.current(...args)))
      .catch(console.error)
    return () => {
      liveQuery.then((subscription) => subscription.unsubscribe()).catch(console.error)
    }
  }, [ticketId])

  const noTicketError = useMemo(() => {
    if (!loadingTickets && !ticketId) {
      return new Error(`Ticket ${nid} does not exists or you do not have permissions.`)
    }
  }, [nid, loadingTickets, ticketId])

  const queryClient = useQueryClient()

  useEffect(() => {
    queryClient.invalidateQueries('unread')
  }, [queryClient, ticket])

  return {
    ticket,
    refetchTicket,
    isLoading: loadingTickets || loadingTicket,
    error: ticketsError || ticketError || noTicketError,
  }
}

/**
 * @param {string} [ticketId]
 */
function useReplies(ticketId) {
  const { addNotification } = useContext(AppContext)
  const [replies, setReplies] = useState([])
  const $ticketId = useRef(ticketId)
  $ticketId.current = ticketId

  const $cursor = useRef()
  useEffect(() => {
    $cursor.current = _.last(replies)?.created_at
  }, [replies])

  const $isLoading = useRef(false)
  const loadMoreReplies = useCallback(async () => {
    if (!$ticketId.current || $isLoading.current) {
      return
    }
    $isLoading.current = true
    try {
      const newReplies = await fetchReplies($ticketId.current, $cursor.current)
      setReplies((current) => current.concat(newReplies))
    } catch (error) {
      addNotification(error)
    } finally {
      $isLoading.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const deleteReply = useCallback((id) => {
    setReplies((pre) => pre.filter((reply) => reply.id !== id))
  }, [])

  const reloadReplies = useCallback(async () => {
    if (!$ticketId.current || $isLoading.current) {
      return
    }
    $isLoading.current = true
    $cursor.current = undefined
    try {
      const newReplies = await fetchReplies($ticketId.current)
      setReplies(newReplies)
    } catch (error) {
      addNotification(error)
    } finally {
      $isLoading.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!ticketId) {
      return
    }
    $cursor.current = undefined
    setReplies([])
    loadMoreReplies()
    const query = db.class('Reply').where('ticket', '==', db.class('Ticket').object(ticketId))
    const liveQuery = query
      .subscribe()
      .then((subscription) => {
        subscription.on('update', (reply) => {
          if (reply.data.deletedAt) {
            deleteReply(reply.id)
          } else {
            reloadReplies()
          }
        })
        subscription.on('create', (reply) => {
          if (!$cursor.current || new Date($cursor.current) < reply.createdAt) {
            loadMoreReplies()
          }
        })
        return subscription
      })
      .catch(addNotification)
    return () => {
      liveQuery.then((subscription) => subscription.unsubscribe()).catch(console.error)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId])

  return { replies, loadMoreReplies, deleteReply, reloadReplies, loading: $isLoading.current }
}

/**
 * @param {string} [ticketId]
 */
function useOpsLogs(ticketId) {
  const { addNotification } = useContext(AppContext)
  const [opsLogs, setOpsLogs] = useState([])
  const $ticketId = useRef(ticketId)
  $ticketId.current = ticketId

  const $cursor = useRef()
  useEffect(() => {
    $cursor.current = _.last(opsLogs)?.created_at
  }, [opsLogs])

  const $isLoading = useRef(false)
  const loadMoreOpsLogs = useCallback(async () => {
    if (!$ticketId.current || $isLoading.current) {
      return
    }
    $isLoading.current = true
    try {
      const newOpsLogs = await fetchOpsLogs($ticketId.current, $cursor.current)
      setOpsLogs((current) => current.concat(newOpsLogs))
    } catch (error) {
      addNotification(error)
    } finally {
      $isLoading.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!ticketId) {
      return
    }
    $cursor.current = undefined
    setOpsLogs([])
    loadMoreOpsLogs()
    const query = db.class('OpsLog').where('ticket', '==', db.class('Ticket').object(ticketId))
    const liveQuery = query
      .subscribe()
      .then((subscription) => {
        subscription.on('create', (obj) => {
          if (!$cursor.current || new Date($cursor.current) < obj.createdAt) {
            loadMoreOpsLogs()
          }
        })
        return subscription
      })
      .catch(addNotification)
    return () => {
      liveQuery.then((subscription) => subscription.unsubscribe()).catch(console.error)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId])

  return { opsLogs, loadMoreOpsLogs }
}

function TicketInfo({ ticket }) {
  const { t } = useTranslation()
  const { addNotification, isUser, isCustomerService } = useContext(AppContext)
  const createdAt = useMemo(() => moment(ticket.createdAt), [ticket.createdAt])
  const updatedAt = useMemo(() => moment(ticket.updatedAt), [ticket.updatedAt])
  const queryClient = useQueryClient()

  const { mutate: updateSubscribed, isLoading: updatingSubscribed } = useMutation(
    (subscribed) => updateTicket(ticket.id, { subscribed }),
    {
      onSuccess: () => queryClient.invalidateQueries(['ticket', ticket.id]),
      onError: (error) => addNotification(error),
    }
  )

  return (
    <div className={`${css.meta} d-flex align-items-center`}>
      <span className={csCss.nid}>#{ticket.nid}</span>
      <TicketStatusLabel status={ticket.status} />
      <span className="mx-2">
        <UserLabel user={ticket.author} displayTags={!isUser} displayId /> {t('createdAt')}{' '}
        <Time value={createdAt} />
        {ticket.reporter && ticket.reporter.id !== ticket.author.id && (
          <>
            {' '}
            via <UserLabel user={ticket.reporter} displayId />
          </>
        )}
        {createdAt.unix() !== updatedAt.unix() && (
          <>
            {`, ${t('updatedAt')} `}
            <Time value={updatedAt} />
          </>
        )}
      </span>
      {isCustomerService && <AccessControl ticket={ticket} />}
      {!isUser && (
        <OverlayTrigger
          placement="right"
          overlay={
            <Tooltip id="subscribe-tip">
              {ticket.subscribed ? t('clickToUnsubscribe') : t('clickToSubscribe')}
            </Tooltip>
          }
        >
          <Button
            variant="link"
            disabled={updatingSubscribed}
            onClick={() => updateSubscribed(!ticket.subscribed)}
          >
            {ticket.subscribed ? <Icon.EyeSlash /> : <Icon.Eye />}
          </Button>
        </OverlayTrigger>
      )}
    </div>
  )
}
TicketInfo.propTypes = {
  ticket: PropTypes.shape({
    id: PropTypes.string.isRequired,
    nid: PropTypes.number.isRequired,
    status: PropTypes.number.isRequired,
    author: PropTypes.object.isRequired,
    reporter: PropTypes.object.isRequired,
    subscribed: PropTypes.bool.isRequired,
    createdAt: PropTypes.string.isRequired,
    updatedAt: PropTypes.string.isRequired,
  }),
}

function Timeline({ data, onReplyDeleted, onEditReply, onLoadReplyRevisions }) {
  switch (data.type) {
    case 'opsLog':
      return <OpsLog data={data} />
    case 'reply':
      return (
        <ReplyCard
          data={data}
          onDeleted={onReplyDeleted}
          onEdit={onEditReply}
          onLoadRevisions={onLoadReplyRevisions}
        />
      )
  }
}
Timeline.propTypes = {
  data: PropTypes.object.isRequired,
  onReplyDeleted: PropTypes.func,
  onEditReply: PropTypes.func,
  onLoadReplyRevisions: PropTypes.func,
}

export default function Ticket() {
  const {
    params: { nid },
  } = useRouteMatch()
  const { t } = useTranslation()
  const viewId = useSearchParam('view')
  const appContextValue = useContext(AppContext)
  const { addNotification, currentUser, isCustomerService, isUser } = appContextValue
  const { ticket, isLoading: loadingTicket, refetchTicket, error } = useTicket(nid)
  const { replies, loadMoreReplies, deleteReply, reloadReplies, replyLoading } = useReplies(
    ticket?.id
  )
  const { opsLogs, loadMoreOpsLogs } = useOpsLogs(ticket?.id)
  const timeline = useMemo(() => {
    return [
      ...replies.map((reply) => ({ ...reply, type: 'reply' })),
      ...opsLogs.map((opsLog) => ({ ...opsLog, type: 'opsLog' })),
    ].sort((a, b) => (a.created_at > b.created_at ? 1 : -1))
  }, [replies, opsLogs])

  useTitle(ticket?.title)
  const { mutateAsync: operateTicket } = useMutation({
    mutationFn: (action) => http.post(`/api/2/tickets/${ticket.id}/operate`, { action }),
    onSuccess: () => {
      refetchTicket()
      loadMoreOpsLogs()
    },
    onError: (error) => addNotification(error),
  })

  const { mutateAsync: replyTicket } = useMutation({
    mutationFn: (data) => http.post(`/api/2/tickets/${ticket.id}/replies`, data),
    onSuccess: () => loadMoreReplies(),
    onError: (error) => addNotification(error),
  })

  const { mutate: updateReply, isLoading: updatingReply } = useMutation({
    mutationFn: ({ id, ...data }) => http.patch(`/api/2/replies/${id}`, data),
    onSuccess: () => {
      editModalRef.current.hide()
      reloadReplies()
    },
    onError: (error) => addNotification(error),
  })

  const showRecentTickets = useMemo(() => {
    if (!ticket || replyLoading || isUser) {
      return false
    }
    return true
  }, [ticket, replyLoading, isUser])

  const editModalRef = useRef(null)
  const revisionsModalRef = useRef(null)

  const isUserInThisTicket = isUser || ticket?.authorId === currentUser.id
  if (loadingTicket) {
    return <div>{t('loading') + '...'}</div>
  }
  if (error) {
    console.error('Fetch ticket:', error)
    return error.message
  }
  return (
    <AppContext.Provider value={{ ...appContextValue, isUser: isUserInThisTicket }}>
      <EditReplyModal ref={editModalRef} isSaving={updatingReply} onSave={updateReply} />
      <ReplyRevisionsModal ref={revisionsModalRef} />

      <div className="mt-3">
        {isUser && <WeekendWarning />}
        <h1>{ticket.title}</h1>
        <TicketInfo ticket={ticket} />
        <hr />
      </div>

      <Row>
        <Col md={3}>
          {window.ENABLE_LEANCLOUD_INTEGRATION && (
            <LeanCloudApp ticketId={ticket.id} authorUserame={ticket.author.username} />
          )}
          <Fields ticket={ticket} loadMoreOpsLogs={loadMoreOpsLogs} />
        </Col>
        <Col md={6}>
          <div className="tickets">
            <ReplyCard data={ticket} />
            {timeline.map((data) => (
              <Timeline
                key={data.id}
                data={data}
                onReplyDeleted={deleteReply}
                onEditReply={editModalRef.current?.show}
                onLoadReplyRevisions={revisionsModalRef.current?.show}
              />
            ))}
          </div>
          {showRecentTickets && (
            <>
              <hr />
              <RecentTickets ticket={ticket} />
            </>
          )}
          <hr />
          <div>
            {!isUser ? (
              <>
                {ticket.evaluation && (
                  <>
                    <Evaluation ticket={ticket} />
                    <hr />
                  </>
                )}

                <CSReplyEditor
                  ticketId={ticket.id}
                  onReply={replyTicket}
                  onOperate={operateTicket}
                />
              </>
            ) : ticketStatus.isOpened(ticket.status) ? (
              <TicketReply ticketId={ticket.id} onReply={replyTicket} />
            ) : (
              <Evaluation ticket={ticket} />
            )}
          </div>
        </Col>

        <Col md={3}>
          <div className={css.sidebar}>
            <TicketMetadata ticket={ticket} />

            {(isUserInThisTicket || isCustomerService) && (
              <TicketOperation ticket={ticket} onOperate={operateTicket} />
            )}

            {isCustomerService && viewId && <NextTicketSection id={ticket.id} viewId={viewId} />}
          </div>
        </Col>
      </Row>
    </AppContext.Provider>
  )
}
