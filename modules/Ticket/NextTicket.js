import { useQuery } from 'react-query'
import React, { useCallback } from 'react'
import { fetch } from '../../lib/leancloud'
import PropTypes from 'prop-types'
import { Button, Form } from 'react-bootstrap'
import { useHistory } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

/**
 *
 * @param {string} id
 * @returns {import('react-query').UseQueryResult<{ id?: string, nid?: string }, Error>}
 */
const useNextTicketId = (id) =>
  useQuery({
    queryFn: () => fetch(`/api/2/tickets/${id}/next`),
    queryKey: ['tickets', 'next', id],
  })

export const NextTicketButton = ({ id }) => {
  const { data, isLoading } = useNextTicketId(id)

  const history = useHistory()
  const { t } = useTranslation()

  const handleNextTicket = useCallback(() => {
    history.push(`/tickets/${data?.nid}`)
  }, [data, history])

  return (
    <Button variant="light" disabled={isLoading || !data?.nid} onClick={handleNextTicket}>
      {data?.nid ? t('nextProcessableTicket') : t('noProcessableTicket')}
    </Button>
  )
}

NextTicketButton.propTypes = {
  id: PropTypes.string,
}

export const NextTicketSection = ({ id }) => {
  const { t } = useTranslation()

  return (
    <Form.Group>
      <Form.Label>{t('otherOperations')}</Form.Label>
      <div>
        <NextTicketButton id={id} />
      </div>
    </Form.Group>
  )
}

NextTicketSection.propTypes = {
  id: PropTypes.string,
}
