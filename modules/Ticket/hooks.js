import { useInfiniteQuery } from 'react-query'
import _ from 'lodash'

import { fetch } from '../../lib/leancloud'

/**
 * @param {number} nid
 * @returns {Promise<{ ticket: object; subscribed: boolean; }>}
 */
export function fetchTicket(nid) {
  return fetch(`/api/1/tickets/${nid}`)
}

/**
 * @typedef {{
 *   objectId: string;
 * }} Reply
 */

/**
 *
 * @param {number} nid
 * @param {string} [after] objectId of reply
 * @returns {Promise<{ replies: Reply[] }>}
 */
export function fetchReplies(nid, after) {
  return fetch(`/api/1/tickets/${nid}/replies`, {
    query: {
      'page[after]': after,
    },
  })
}

/**
 * @param {number} nid
 */
export function useReplies(nid) {
  return useInfiniteQuery(['ticketReplies', nid], ({ pageParam }) => fetchReplies(nid, pageParam), {
    getNextPageParam: (lastPage) => _.last(lastPage.replies)?.objectId,
  })
}

/**
 * @typedef {{
 *   objectId: string;
 * }} OpsLog
 */

/**
 * @param {number} nid
 * @param {string} [after]
 * @returns {Promise<{ opsLogs: OpsLog[] }>}
 */
export function fetchOpsLogs(nid, after) {
  return fetch(`/api/1/tickets/${nid}/ops-logs`, {
    query: {
      'page[after]': after,
    },
  })
}

/**
 * @param {number} nid
 */
export function useOpsLogs(nid) {
  return useInfiniteQuery(['ticketOpsLogs', nid], ({ pageParam }) => fetchOpsLogs(nid, pageParam), {
    getNextPageParam: (lastPage) => _.last(lastPage.opsLogs)?.objectId,
  })
}

/**
 * @param {number} nid
 * @param {object} data
 */
export function updateTicket(nid, data) {
  return fetch(`/api/1/tickets/${nid}`, { method: 'PATCH', body: data })
}

/**
 * @param {number | string} nid
 * @param {string} content
 * @param {array} [files]
 */
export function commitTicketReply(nid, content, files) {
  return fetch(`/api/1/tickets/${nid}/replies`, {
    method: 'POST',
    body: { content, files },
  })
}

export function operateTicket(nid, action) {
  return fetch(`/api/1/tickets/${nid}/operate`, {
    method: 'POST',
    body: { action },
  })
}
