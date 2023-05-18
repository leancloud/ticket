import { useQuery } from 'react-query'
import React, { useCallback } from 'react'
import { fetch } from '../../lib/leancloud'
import PropTypes from 'prop-types'
import { Button, Form } from 'react-bootstrap'
import { useHistory } from 'react-router-dom'

/**
 *
 * @param {string} id
 * @returns {import('react-query').UseQueryResult<{ id?: string, nid?: string, remain: number }, Error>}
 */
const useNextTicketId = (id) =>
  useQuery({
    queryFn: () => fetch(`/api/2/tickets/${id}/next`),
    queryKey: ['tickets', 'next', id],
  })

export const NextTicketButton = ({ id }) => {
  const { data, isLoading } = useNextTicketId(id)

  const history = useHistory()

  const handleNextTicket = useCallback(() => {
    history.push(`/tickets/${data?.nid}`)
  }, [data, history])

  return (
    <Button variant="light" disabled={isLoading || !data?.nid} onClick={handleNextTicket}>
      {data?.nid ? '下一个待处理工单' : '没有待处理工单了'}
    </Button>
  )
}

NextTicketButton.propTypes = {
  id: PropTypes.string,
}

export const NextTicketSection = ({ id }) => {
  return (
    <Form.Group>
      <Form.Label>其他操作</Form.Label>
      <div>
        <NextTicketButton id={id} />
      </div>
    </Form.Group>
  )
}

NextTicketSection.propTypes = {
  id: PropTypes.string,
}
