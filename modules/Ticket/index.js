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
import { TicketMetadata } from './TicketMetadata'
import { TicketOperation } from './TicketOperation'
import { ticketStatus } from '../../lib/common'
import { TicketReply } from './TicketReply'
import { Evaluation } from './Evaluation'
import { LeanCloudApp } from './LeanCloudApp'
import { CSReplyEditor } from './CSReplyEditor'

function updateTicket(id, data) {
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
    queryFn: () => fetch(`/api/1/tickets/${ticketId}`),
    enabled: !!ticketId,
  })

  const $onUpdate = useRef()
  $onUpdate.current = (obj) => {
    if (obj.updatedAt.toISOString() !== ticket?.updated_at) {
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
      return new Error(`Ticket ${nid} not exists`)
    }
  }, [nid, loadingTickets, ticketId])

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

  useEffect(() => {
    if (!ticketId) {
      return
    }
    setReplies([])
    loadMoreReplies()
    const query = db.class('Reply').where('ticket', '==', db.class('Ticket').object(ticketId))
    const liveQuery = query
      .subscribe()
      .then((subscription) => {
        subscription.on('update', (reply) => {
          const replyObj = reply.toJSON()
          // delete
          if (!replyObj.active) {
            setReplies((pre) =>
              pre.filter((curr) => {
                return curr.id !== replyObj.objectId
              })
            )
          }
          // update
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

  return { replies, loadMoreReplies, deleteReply }
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

/**
 * @param {string} [ticketId]
 */
function useTimeline(ticketId) {
  const { replies, loadMoreReplies, deleteReply } = useReplies(ticketId)
  const { opsLogs, loadMoreOpsLogs } = useOpsLogs(ticketId)
  const timeline = useMemo(() => {
    return [
      ...replies.map((reply) => ({ ...reply, type: 'reply' })),
      ...opsLogs.map((opsLog) => ({ ...opsLog, type: 'opsLog' })),
    ].sort((a, b) => (a.created_at > b.created_at ? 1 : -1))
  }, [replies, opsLogs])
  return [timeline, { loadMoreReplies, loadMoreOpsLogs, deleteReply }]
}

function TicketInfo({ ticket, isCustomerService }) {
  const { t } = useTranslation()
  const { addNotification } = useContext(AppContext)
  const createdAt = useMemo(() => moment(ticket.created_at), [ticket.created_at])
  const updatedAt = useMemo(() => moment(ticket.updated_at), [ticket.updated_at])
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
      <span className="ml-2">
        <UserLabel user={ticket.author} displayTags={isCustomerService} /> {t('createdAt')}{' '}
        <span title={createdAt.format()}>{createdAt.fromNow()}</span>
        {createdAt.fromNow() !== updatedAt.fromNow() && (
          <>
            {`, ${t('updatedAt')} `}
            <span title={updatedAt.format()}>{updatedAt.fromNow()}</span>
          </>
        )}
      </span>
      {isCustomerService && (
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
    subscribed: PropTypes.bool.isRequired,
    created_at: PropTypes.string.isRequired,
    updated_at: PropTypes.string.isRequired,
  }),
  isCustomerService: PropTypes.bool,
}

function Timeline({ data, onReplyDeleted, ticketId }) {
  switch (data.type) {
    case 'opsLog':
      return <OpsLog data={data} />
    case 'reply':
      return <ReplyCard data={data} ticketId={ticketId} onDeleted={onReplyDeleted} />
  }
}
Timeline.propTypes = {
  data: PropTypes.object.isRequired,
  onReplyDeleted: PropTypes.func,
  ticketId: PropTypes.string.isRequired,
}

export default function Ticket() {
  const {
    params: { nid },
  } = useRouteMatch()
  const { t } = useTranslation()
  const appContextValue = useContext(AppContext)
  const { addNotification, currentUser, isCustomerService } = appContextValue
  const { ticket, isLoading: loadingTicket, refetchTicket, error } = useTicket(nid)
  const [timeline, { loadMoreReplies, loadMoreOpsLogs, deleteReply }] = useTimeline(ticket?.id)
  useTitle(ticket?.title)
  const { mutateAsync: operateTicket } = useMutation({
    mutationFn: (action) =>
      fetch(`/api/1/tickets/${ticket.id}/operate`, {
        method: 'POST',
        body: { action },
      }),
    onSuccess: () => {
      refetchTicket()
      loadMoreOpsLogs()
    },
    onError: (error) => addNotification(error),
  })

  const { mutateAsync: replyTicket } = useMutation({
    mutationFn: (data) => http.post(`/api/1/tickets/${ticket.id}/replies`, data),
    onSuccess: () => loadMoreReplies(),
    onError: (error) => addNotification(error),
  })

  const isCsInThisTicket = isCustomerService && ticket?.author_id !== currentUser.id

  if (loadingTicket) {
    return <div>{t('loading') + '...'}</div>
  }
  if (error) {
    console.error('Fetch ticket:', error)
    return error.message
  }
  return (
    <AppContext.Provider value={{ ...appContextValue, isCustomerService: isCsInThisTicket }}>
      <div className="mt-3">
        {!isCsInThisTicket && <WeekendWarning />}
        <h1>{ticket.title}</h1>
        <TicketInfo ticket={ticket} isCustomerService={isCsInThisTicket} />
        <hr />
      </div>

      <Row>
        <Col sm={8}>
          <div className="tickets">
            <ReplyCard data={ticket} ticketId={ticket.id} />
            {timeline.map((data) => (
              <Timeline
                key={data.id}
                data={data}
                ticketId={ticket.id}
                onReplyDeleted={deleteReply}
              />
            ))}
          </div>
          <hr />
          <div>
            {isCsInThisTicket ? (
              <>
                {ticket.evaluation && (
                  <>
                    <Evaluation ticket={ticket} isCustomerService={true} />
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
              <Evaluation ticket={ticket} isCustomerService={false} />
            )}
          </div>
        </Col>

        <Col className={css.sidebar} sm={4}>
          {window.ENABLE_LEANCLOUD_INTEGRATION && (
            <LeanCloudApp
              ticketId={ticket.id}
              authorUserame={ticket.author.username}
              isCustomerService={isCsInThisTicket}
            />
          )}

          <TicketMetadata
            ticket={ticket}
            isCustomerService={isCsInThisTicket}
            loadMoreOpsLogs={loadMoreOpsLogs}
          />

          <TicketOperation
            ticket={ticket}
            isCustomerService={isCsInThisTicket}
            onOperate={operateTicket}
          />
        </Col>
      </Row>
    </AppContext.Provider>
  )
}
