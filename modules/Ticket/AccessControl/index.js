import React, { useContext } from 'react'
import PropTypes from 'prop-types'
import { Dropdown, DropdownButton, ButtonGroup } from 'react-bootstrap'
import * as Icon from 'react-bootstrap-icons'
import { useMutation, useQueryClient } from 'react-query'
import { AppContext } from '../../context'
import { updateTicket } from '../'
import classNames from 'classnames'
import styles from './index.module.scss'

export const AccessControl = ({ ticket }) => {
  const { addNotification } = useContext(AppContext)

  const queryClient = useQueryClient()
  const { mutate, isLoading } = useMutation(
    (isPrivate) => updateTicket(ticket.id, { private: isPrivate }),
    {
      onSuccess: () => queryClient.invalidateQueries(['ticket', ticket.id]),
      onError: (error) => addNotification(error),
    }
  )

  return (
    <DropdownButton
      as={ButtonGroup}
      variant={ticket.private ? 'outline-warning' : 'light'}
      size="sm"
      disabled={isLoading}
      title={
        isLoading ? (
          'Updating...'
        ) : (
          <>
            {ticket.private ? <Icon.Lock /> : <Icon.Unlock />}{' '}
            {ticket.private ? 'Private' : 'Internal'}
          </>
        )
      }
    >
      <Dropdown.Item as="button" onClick={() => mutate(false)}>
        Internal {!ticket.private && <Icon.Check />}
        <br />
        <span className={classNames('text-muted', styles.description)}>Visible to all staffs</span>
      </Dropdown.Item>
      <Dropdown.Divider />
      <Dropdown.Item as="button" onClick={() => mutate(true)}>
        Private {ticket.private && <Icon.Check />}
        <br />
        <span className={classNames('text-muted', styles.description)}>
          Visible to customer services only
        </span>
      </Dropdown.Item>
    </DropdownButton>
  )
}

AccessControl.propTypes = {
  ticket: PropTypes.shape({
    id: PropTypes.string.isRequired,
    private: PropTypes.boolean,
  }).isRequired,
}
