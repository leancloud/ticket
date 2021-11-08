/* eslint-disable promise/catch-or-return */
/* eslint-disable react/prop-types */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Form } from 'react-bootstrap'

import { http } from '../lib/leancloud'

/**
 * @param {string} ticketId
 * @returns {Promise<string | undefined>}
 */
async function getIssueUrl(ticketId) {
  const data = await http.get('/integrations/jira/issues', { params: { ticketId } })
  if (data.length === 0) {
    return
  }
  return data[0].url
}

/**
 * @param {string} ticketId
 * @returns {Promise<string>}
 */
async function createIssue(ticketId) {
  const data = await http.post('/integrations/jira/issues', { ticketId })
  return data.url
}

function useIsMounted() {
  const $isMounted = useRef(true)
  useEffect(
    () => () => {
      $isMounted.current = false
    },
    []
  )
  return useRef(() => $isMounted.current).current
}

/**
 * @param {string} ticketId
 * @param {boolean} enabled
 */
function useIssueUrl(ticketId, enabled) {
  const [url, setUrl] = useState()
  const [isLoading, setIsLoading] = useState(false)
  const isMounted = useIsMounted()

  useEffect(() => {
    if (!enabled) return
    setUrl(undefined)
    setIsLoading(true)
    getIssueUrl(ticketId)
      .then((url) => isMounted() && setUrl(url))
      .finally(() => isMounted() && setIsLoading(false))
  }, [ticketId, enabled, isMounted])

  return { url, isLoading, setUrl }
}

function useCreateIssue() {
  const [isCreating, setIsCreating] = useState(false)
  const isMounted = useIsMounted()
  const create = useCallback(
    async (ticketId) => {
      setIsCreating(true)
      try {
        return await createIssue(ticketId)
      } finally {
        isMounted() && setIsCreating(false)
      }
    },
    [isMounted]
  )
  return { create, isCreating }
}

function JiraSection({ ticket, isCustomerService }) {
  const { url, setUrl, isLoading } = useIssueUrl(ticket.id, isCustomerService)
  const { create, isCreating } = useCreateIssue()

  const handleCreateIssue = useCallback(() => {
    create(ticket.id).then(setUrl)
  }, [ticket.id, create, setUrl])

  if (!isCustomerService) {
    return null
  }
  return (
    <Form.Group>
      <Form.Label>Jira</Form.Label>
      <div>
        {url ? (
          <Button variant="light" href={url} target="_blank">
            Open Issue
          </Button>
        ) : (
          <Button variant="light" disabled={isLoading || isCreating} onClick={handleCreateIssue}>
            Create Issue
          </Button>
        )}
      </div>
    </Form.Group>
  )
}
JiraSection.mountPoint = 'ticket.metadata'

export default {
  name: 'Plugin/Jira',
  customElements: [JiraSection],
}
