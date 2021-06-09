import React, { useCallback, useContext, useMemo, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import * as Icon from 'react-bootstrap-icons'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'

import { db, fetch } from '../../lib/leancloud'
import { UserLabel } from '../UserLabel'
import { AppContext } from '../context'
import { getConfig } from '../config'
import { MountCustomElement } from '../custom/element'
import css from './index.css'
import { Category, CategorySelect } from './Category'
import { TagForm } from './TagForm'

function updateTicket(id, data) {
  return fetch(`/api/1/tickets/${id}`, {
    method: 'PATCH',
    body: data,
  })
}

function GroupSection({ ticket }) {
  const { t } = useTranslation()
  const [editingGroup, setEditingGroup] = useState(false)
  const { data: groups, isLoading } = useQuery({
    queryKey: 'groups',
    queryFn: () => db.class('Group').find(),
    enabled: editingGroup,
  })

  const { addNotification } = useContext(AppContext)
  const queryClient = useQueryClient()
  const { mutate: updateGroup, isLoading: updating } = useMutation({
    mutationFn: (group_id) => updateTicket(ticket.id, { group_id }),
    onSuccess: () => {
      queryClient.invalidateQueries(['ticket', ticket.id])
      setEditingGroup(false)
    },
    onError: (error) => addNotification(error),
  })

  return (
    <Form.Group>
      <Form.Label>{t('group')}</Form.Label>
      {editingGroup ? (
        <Form.Control
          as="select"
          value={ticket.group?.objectId}
          disabled={isLoading || updating}
          onChange={(e) => updateGroup(e.target.value)}
          onBlur={() => setEditingGroup(false)}
        >
          {isLoading ? (
            <option key="loading" value={ticket.group?.objectId}>
              {t('loading') + '...'}
            </option>
          ) : (
            <option key="" value="" />
          )}
          {groups?.map((group) => (
            <option key={group.id} value={group.id}>
              {group.data.name}
            </option>
          ))}
        </Form.Control>
      ) : (
        <div className="d-flex align-items-center">
          {ticket.group && ticket.group !== '' ? (
            <Link to={`/settings/groups/${ticket.group.objectId}`} className="username">
              {ticket.group.name}
            </Link>
          ) : (
            '<Not set>'
          )}
          <Button variant="link" onClick={() => setEditingGroup(true)}>
            <Icon.PencilFill />
          </Button>
        </div>
      )}
    </Form.Group>
  )
}
GroupSection.propTypes = {
  ticket: PropTypes.shape({
    id: PropTypes.string.isRequired,
    group: PropTypes.object,
  }),
}

function AssigneeSection({ ticket, isCustomerService }) {
  const { t } = useTranslation()
  const { addNotification } = useContext(AppContext)
  const [editingAssignee, setEditingAssignee] = useState(false)
  const { data: customerServices, isLoading } = useQuery({
    queryKey: 'customerServices',
    queryFn: () => fetch('/api/1/customer-services'),
    enabled: editingAssignee,
  })
  const queryClient = useQueryClient()

  const { mutate: updateAssignee, isLoading: updating } = useMutation({
    mutationFn: (assignee_id) => updateTicket(ticket.id, { assignee_id }),
    onSuccess: () => {
      queryClient.invalidateQueries(['ticket', ticket.id])
      setEditingAssignee(false)
    },
    onError: (error) => addNotification(error),
  })

  return (
    <Form.Group>
      <Form.Label>{t('assignee')}</Form.Label>
      {editingAssignee ? (
        <Form.Control
          as="select"
          value={ticket.assignee.id}
          disabled={isLoading || updating}
          onChange={(e) => updateAssignee(e.target.value)}
          onBlur={() => setEditingAssignee(false)}
        >
          {isLoading && <option value={ticket.assignee.id}>{t('loading') + '...'}</option>}
          {customerServices?.map((cs) => (
            <option key={cs.id} value={cs.id}>
              {cs.name || cs.username}
            </option>
          ))}
        </Form.Control>
      ) : (
        <div className="d-flex align-items-center">
          <UserLabel user={ticket.assignee} />
          {isCustomerService && (
            <Button variant="link" onClick={() => setEditingAssignee(true)}>
              <Icon.PencilFill />
            </Button>
          )}
        </div>
      )}
    </Form.Group>
  )
}
AssigneeSection.propTypes = {
  ticket: PropTypes.shape({
    id: PropTypes.string.isRequired,
    assignee: PropTypes.object.isRequired,
  }),
  isCustomerService: PropTypes.bool,
}

function CategorySection({ ticket, isCustomerService }) {
  const { t } = useTranslation()
  const { addNotification } = useContext(AppContext)
  const [editingCategory, setEditingCategory] = useState(false)
  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories', { active: true }],
    queryFn: () => fetch('/api/1/categories?active=true'),
  })
  const queryClient = useQueryClient()

  const { mutate: updateCategory, isLoading: updating } = useMutation({
    mutationFn: (category_id) => updateTicket(ticket.id, { category_id }),
    onSuccess: () => {
      queryClient.invalidateQueries(['ticket', ticket.id])
      setEditingCategory(false)
    },
    onError: (error) => addNotification(error),
  })

  return (
    <Form.Group>
      <Form.Label>{t('category')}</Form.Label>
      {editingCategory ? (
        <CategorySelect
          categories={categories || []}
          value={ticket.category_id}
          onChange={updateCategory}
          onBlur={() => setEditingCategory(false)}
          disabled={isLoading || updating}
        />
      ) : (
        <div className="d-flex align-items-center">
          <Category block categoryPath={ticket.category_path} />
          {isCustomerService && (
            <Button variant="link" onClick={() => setEditingCategory(true)}>
              <Icon.PencilFill />
            </Button>
          )}
        </div>
      )}
    </Form.Group>
  )
}
CategorySection.propTypes = {
  ticket: PropTypes.shape({
    id: PropTypes.string.isRequired,
    category_id: PropTypes.string.isRequired,
    category_path: PropTypes.array.isRequired,
  }),
  isCustomerService: PropTypes.bool,
}

function CustomMetadata({ metadata }) {
  const { t } = useTranslation()
  const comments = getConfig('ticket.metadata.customMetadata.comments', {})
  const filteredMetadata = useMemo(() => {
    return Object.entries(metadata).reduce((arr, [key, value]) => {
      if (typeof value === 'string' || typeof value === 'number') {
        arr.push([key, value])
      }
      return arr
    }, [])
  }, [metadata])

  return (
    filteredMetadata.length > 0 && (
      <Form.Group>
        <Form.Label>{t('details')}</Form.Label>
        {filteredMetadata.map(([key, value]) => (
          <div className={css.customMetadata} key={key}>
            <span className={css.key}>{comments[key] || key}: </span>
            {value}
          </div>
        ))}
      </Form.Group>
    )
  )
}
CustomMetadata.propTypes = {
  metadata: PropTypes.object.isRequired,
}

function TagSection({ ticket, isCustomerService }) {
  const { addNotification, tagMetadatas } = useContext(AppContext)
  const queryClient = useQueryClient()
  const { mutateAsync, isLoading } = useMutation((data) => updateTicket(ticket.id, data), {
    onSuccess: () => queryClient.invalidateQueries(['ticket', ticket.id]),
    onError: (error) => addNotification(error),
  })

  const handleSaveTag = useCallback(
    (key, value, isPrivate) => {
      const tags = [...ticket[isPrivate ? 'private_tags' : 'tags']]
      const index = tags.findIndex((tag) => tag.key === key)
      if (index === -1) {
        if (!value) {
          return
        }
        tags.push({ key, value })
      } else {
        if (value) {
          tags[index] = { ...tags[index], value }
        } else {
          tags.splice(index, 1)
        }
      }
      return mutateAsync({ [isPrivate ? 'private_tags' : 'tags']: tags })
    },
    [ticket, mutateAsync]
  )

  return tagMetadatas.map((tagMetadata) => {
    const tags = tagMetadata.data.isPrivate ? ticket.private_tags : ticket.tags
    const tag = tags?.find((tag) => tag.key === tagMetadata.data.key)
    return (
      <TagForm
        key={tagMetadata.id}
        tagMetadata={tagMetadata.toJSON()}
        tag={tag}
        isCustomerService={isCustomerService}
        disabled={isLoading}
        onChange={handleSaveTag}
      />
    )
  })
}

export function TicketMetadata({ ticket, isCustomerService }) {
  return (
    <>
      {isCustomerService && <GroupSection ticket={ticket} isCustomerService={isCustomerService} />}

      <AssigneeSection ticket={ticket} isCustomerService={isCustomerService} />

      <CategorySection ticket={ticket} isCustomerService={isCustomerService} />

      {isCustomerService && <CustomMetadata metadata={ticket.metadata} />}

      <MountCustomElement point="ticket.metadata" props={{ ticket, isCustomerService }} />

      <TagSection ticket={ticket} isCustomerService={isCustomerService} />
    </>
  )
}
TicketMetadata.propTypes = {
  ticket: PropTypes.object.isRequired,
  isCustomerService: PropTypes.bool,
}
