/* eslint-disable promise/catch-or-return */
/* eslint-disable react/prop-types */

import React, { useEffect, useRef, useState } from 'react'
import { Button, ControlLabel, Form, FormControl, FormGroup, InputGroup } from 'react-bootstrap'

function CreateJireIssue({ app, ticket, isCustomerService }) {
  const $form = useRef(null)
  const [creating, setCreating] = useState(false)

  const currentUser = app.auth().currentUser()
  const redirectURL = window.TGB?.jira?.redirectURL
  if (!isCustomerService || !redirectURL) {
    return null
  }

  const handleSubmit = () => {
    setCreating(true)
    $form.current?.submit()
  }

  return (
    <Button disabled={creating} bsStyle="primary" onClick={handleSubmit}>
      <form method="post" action={redirectURL} ref={$form} style={{ display: 'none' }}>
        <input type="hidden" name="sessionToken" value={currentUser.sessionToken} />
        <input type="hidden" name="ticketId" value={ticket.objectId} />
      </form>
      <span className="glyphicon glyphicon-plus" aria-hidden="true" />
      &nbsp;Jira Issue
    </Button>
  )
}
CreateJireIssue.mountPoint = 'ticket.metadata.action'

function JiraAccessTokenForm({ t, app }) {
  const currentUser = app.auth().currentUser()
  const [accessToken, setAccessToken] = useState('')
  useEffect(() => {
    app.cloud().run('TGB_getJiraAccessToken').then(setAccessToken)
  }, [])

  const handleSaveAccessToken = () => {
    currentUser.update({ 'authData.jira.access_token': accessToken })
  }

  return (
    <Form>
      <FormGroup>
        <ControlLabel>Jira Access Token</ControlLabel>
        <InputGroup>
          <FormControl
            type="text"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
          />
          <InputGroup.Button>
            <Button onClick={handleSaveAccessToken}>{t('save')}</Button>
          </InputGroup.Button>
        </InputGroup>
      </FormGroup>
    </Form>
  )
}
JiraAccessTokenForm.mountPoint = 'settings.customerServiceProfile.associatedAccounts'

export function jiraClientPlugin() {
  return {
    name: 'TGB_Jira',
    customElements: [CreateJireIssue, JiraAccessTokenForm],
  }
}
