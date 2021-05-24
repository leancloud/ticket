/* eslint-disable promise/catch-or-return */
/* eslint-disable react/prop-types */

import React, { useEffect, useState } from 'react'
import { Button, Form } from 'react-bootstrap'

function TicketMetadataJiraSection({ app, ticket, isCustomerService }) {
  const [issueURL, setIssueURL] = useState('')
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!isCustomerService) {
      return
    }
    setLoading(true)
    app
      .cloud()
      .run('HS_getJiraIssueURL', { ticketId: ticket.id })
      .then((url) => {
        setIssueURL(url)
        setLoading(false)
        return
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCustomerService, ticket.id])

  const handleCreateIssue = () => {
    if (loading) {
      return
    }
    setLoading(true)
    app
      .cloud()
      .run('HS_createJiraIssue', { ticketId: ticket.id })
      .then((url) => {
        setIssueURL(url)
        setLoading(false)
        return
      })
  }

  return (
    isCustomerService && (
      <Form.Group>
        <Form.Label>Jira</Form.Label>
        <div>
          {issueURL ? (
            <Button variant="light" href={issueURL} target="_blank">
              Open Issue
            </Button>
          ) : (
            <Button variant="light" disabled={loading} onClick={handleCreateIssue}>
              Create Issue
            </Button>
          )}
        </div>
      </Form.Group>
    )
  )
}
TicketMetadataJiraSection.mountPoint = 'ticket.metadata'

export function jiraClientPlugin() {
  return {
    name: 'TGB_Jira',
    customElements: [TicketMetadataJiraSection],
  }
}
