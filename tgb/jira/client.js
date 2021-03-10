/* eslint-disable promise/catch-or-return */
/* eslint-disable react/prop-types */

import React, { useEffect, useState } from 'react'
import { Button, ButtonToolbar, ControlLabel, FormGroup } from 'react-bootstrap'

function TicketMetadataJiraSection({ app, ticket }) {
  const [issueURL, setIssueURL] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    app
      .cloud()
      .run('TGB_getJiraIssueURL', { ticketId: ticket.objectId })
      .then((url) => {
        setIssueURL(url)
        setLoading(false)
        return
      })
  }, [])

  const handleCreateIssue = () => {
    setLoading(true)
    app
      .cloud()
      .run('TGB_createJiraIssue', { ticketId: ticket.objectId })
      .then((url) => {
        setIssueURL(url)
        setLoading(false)
        return
      })
  }

  return (
    <FormGroup>
      <ControlLabel>Jira</ControlLabel>
      <ButtonToolbar>
        {issueURL ? (
          <Button href={issueURL} target="_blank">
            <span className="glyphicon glyphicon-link" aria-hidden="true" /> Open Issue
          </Button>
        ) : (
          <Button bsStyle="success" disabled={loading} onClick={handleCreateIssue}>
            <span className="glyphicon glyphicon-plus" aria-hidden="true" /> Create Issue
          </Button>
        )}
      </ButtonToolbar>
    </FormGroup>
  )
}
TicketMetadataJiraSection.mountPoint = 'ticket.metadata'

export function jiraClientPlugin() {
  return {
    name: 'TGB_Jira',
    customElements: [TicketMetadataJiraSection],
  }
}
