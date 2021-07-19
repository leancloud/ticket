import React, { memo, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Form, Modal } from 'react-bootstrap'
import * as Icon from 'react-bootstrap-icons'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import PropTypes from 'prop-types'

import { auth, fetch, http } from '../../lib/leancloud'
import { UserLabel } from '../UserLabel'
import { AppContext, useAppContext } from '../context'
import { getConfig } from '../config'
import { MountCustomElement } from '../custom/element'
import css from './index.css'
import { Category, CategorySelect } from './Category'
import { TagForm } from './TagForm'
import { InternalBadge } from '../components/InternalBadge'
import { useGroups, GroupLabel } from '../components/Group'
import CustomField, { CustomFieldDisplay } from '../components/CustomField'
import { locale } from '../i18n'
import styles from './index.css'

function updateTicket(id, data) {
  return fetch(`/api/1/tickets/${id}`, {
    method: 'PATCH',
    body: data,
  })
}

function GroupSection({ ticket }) {
  const { t } = useTranslation()
  const [editingGroup, setEditingGroup] = useState(false)
  const { data: groups, isLoading } = useGroups()

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
      <Form.Label>
        {t('group')} <InternalBadge />
      </Form.Label>
      {editingGroup ? (
        <Form.Control
          as="select"
          value={ticket.group?.id}
          disabled={isLoading || updating}
          onChange={(e) => updateGroup(e.target.value)}
          onBlur={() => setEditingGroup(false)}
        >
          {isLoading ? (
            <option key="loading" value={ticket.group?.id}>
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
          <GroupLabel groupId={ticket.group?.id} />
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

  const [groupIncludesAssignee, setgGroupIncludesAssignee] = useState(false)

  useEffect(() => {
    if (!ticket.assignee || !ticket.group) {
      setgGroupIncludesAssignee(false)
      return
    }
    const ac = new AbortController()
    auth
      .role(ticket.group.role_id)
      .queryUser()
      .where('objectId', '==', ticket.assignee.id)
      .count({ abortSignal: ac.signal })
      .then((count) => {
        setgGroupIncludesAssignee(count === 0)
      })
    return ac.abort.bind(ac)
  }, [ticket.assignee, ticket.group])

  return (
    <Form.Group>
      <Form.Label>{t('assignee')}</Form.Label>{' '}
      {isCustomerService && ticket.assignee?.id !== auth.currentUser.id && (
        <Button
          variant="light"
          size="sm"
          onClick={() => updateAssignee(auth.currentUser.id)}
          className="align-baseline"
        >
          {t('assignYourself')}
        </Button>
      )}
      {editingAssignee ? (
        <Form.Control
          as="select"
          value={ticket.assignee?.id}
          disabled={isLoading || updating}
          onChange={(e) => updateAssignee(e.target.value)}
          onBlur={() => setEditingAssignee(false)}
        >
          {isLoading ? (
            <option value={ticket.assignee?.id}>{t('loading') + '...'}</option>
          ) : (
            <option key="" value="" />
          )}
          {customerServices?.map((cs) => (
            <option key={cs.id} value={cs.id}>
              {cs.name || cs.username}
            </option>
          ))}
        </Form.Control>
      ) : (
        <div className="d-flex align-items-center">
          {ticket.assignee ? <UserLabel user={ticket.assignee} /> : '<unset>'}
          {isCustomerService && (
            <Button
              variant="link"
              className="align-baseline"
              onClick={() => setEditingAssignee(true)}
            >
              <Icon.PencilFill />
            </Button>
          )}
        </div>
      )}
      {isCustomerService && ticket.assignee && ticket.group && groupIncludesAssignee && (
        <Alert variant="warning" className={styles.metaAlert}>
          {ticket.assignee.name} is not a member of {ticket.group.name}{' '}
          <Button variant="light" size="sm" onClick={() => updateAssignee('')}>
            Unassign {ticket.assignee.name}
          </Button>
        </Alert>
      )}
    </Form.Group>
  )
}
AssigneeSection.propTypes = {
  ticket: PropTypes.shape({
    id: PropTypes.string.isRequired,
    assignee: PropTypes.object,
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
  const valueRenderers = getConfig('ticket.metadata.customMetadata.valueRenderers', {})
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
            {typeof valueRenderers[key] === 'function' ? valueRenderers[key](value) : value}
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

const TicketFormModal = memo(({ fields, values, onUpdated, close, ticketId }) => {
  const { t } = useTranslation()
  const { addNotification } = useAppContext()
  const [formValues, setFormValues] = useState({})
  useEffect(() => {
    if (values) {
      setFormValues(values)
    }
  }, [values])

  const { mutateAsync, isLoading } = useMutation({
    mutationFn: (form_values) =>
      http.patch(`/api/1/tickets/${ticketId}/form-values`, {
        form_values,
      }),
  })

  return (
    <>
      <Modal.Header closeButton>
        <Modal.Title>{t('otherInfo')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form
          id="otherInfo"
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            const newValues = Object.keys(formValues).map((field) => {
              return {
                field,
                value: formValues[field],
              }
            })
            mutateAsync(newValues)
              .then(() => {
                onUpdated(newValues)
                close()
                return
              })
              .catch(addNotification)
          }}
        >
          {fields.map((field) => {
            return (
              <CustomField
                value={formValues[field.id]}
                key={field.id}
                {...field}
                onChange={(v) => {
                  setFormValues((pre) => ({
                    ...pre,
                    [field.id]: v,
                  }))
                }}
              />
            )
          })}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button className="mr-2" variant="secondary" onClick={close}>
          {t('cancel')}
        </Button>
        <Button variant="primary" type="submit" form="otherInfo" disabled={isLoading}>
          {t('confirm')}
        </Button>
      </Modal.Footer>
    </>
  )
})
const TicketFormValues = memo(({ ticket }) => {
  const { t } = useTranslation()
  const { addNotification } = useAppContext()
  const queryClient = useQueryClient()
  const [edit, setEdit] = useState(false)
  const close = useCallback(() => setEdit(false), [])
  const { data: formId } = useQuery({
    queryKey: ['ticket/category', ticket ? ticket.category_id : ''],
    queryFn: () =>
      http.get('/api/1/categories', {
        params: {
          id: ticket.category_id,
          active: true,
        },
      }),
    retry: false,
    select: (data) => (data[0] ? data[0].form_id : undefined),
    enabled: Boolean(ticket && ticket.category_id),
    onError: (err) => addNotification(err),
  })
  const { data: fields } = useQuery({
    queryKey: ['ticket/form', formId],
    queryFn: () =>
      http.get(`/api/1/ticket-forms/${formId}`, {
        params: {
          locale: locale === 'zh' ? 'zh-cn' : locale,
        },
      }),
    select: (data) =>
      data.fields.map((field) => {
        const {
          type,
          id,
          required,
          variant: { options, title },
        } = field
        return {
          type,
          id,
          required,
          options,
          label: title,
        }
      }),
    enabled: !!formId,
    retry: false,
    onError: (err) => addNotification(err),
  })
  const { data: fromValues } = useQuery({
    queryKey: ['ticket/fromValues', ticket ? ticket.id : ''],
    queryFn: () => http.get(`/api/1/tickets/${ticket.id}/form-values`),
    enabled: Boolean(formId && ticket && ticket.id),
    retry: false,
    select: (data) =>
      Array.isArray(data)
        ? data.reduce((pre, cur) => {
            pre[cur.field] = cur.value
            return pre
          }, {})
        : {},
    onError: (err) => addNotification(err),
  })
  const onUpdated = useCallback(
    (data) => {
      queryClient.setQueryData(['ticket/fromValues', ticket ? ticket.id : ''], data)
    },
    [queryClient, ticket]
  )

  if (!formId || !fields || fields.length === 0) {
    return null
  }

  return (
    <Form className={styles.otherInfo}>
      <Form.Label>
        {t('otherInfo')}{' '}
        <Button variant="light" size="sm" onClick={() => setEdit(true)} className="align-baseline">
          {t('edit')}
        </Button>
      </Form.Label>
      {fields &&
        fields.map((field) => {
          return (
            <CustomFieldDisplay
              key={field.id}
              type={field.type}
              label={field.label}
              value={fromValues ? fromValues[field.id] : undefined}
              options={field.options}
              className={styles.field}
            />
          )
        })}
      <Modal show={edit} onHide={close}>
        <TicketFormModal
          ticketId={ticket.id}
          fields={fields || []}
          values={fromValues}
          onUpdated={onUpdated}
          close={close}
        />
      </Modal>
    </Form>
  )
})

export function TicketMetadata({ ticket, isCustomerService }) {
  return (
    <>
      {isCustomerService && <GroupSection ticket={ticket} isCustomerService={isCustomerService} />}

      <AssigneeSection ticket={ticket} isCustomerService={isCustomerService} />

      <CategorySection ticket={ticket} isCustomerService={isCustomerService} />

      {isCustomerService && <CustomMetadata metadata={ticket.metadata} />}

      <MountCustomElement point="ticket.metadata" props={{ ticket, isCustomerService }} />

      <TagSection ticket={ticket} isCustomerService={isCustomerService} />

      <TicketFormValues ticket={ticket} />
    </>
  )
}
TicketMetadata.propTypes = {
  ticket: PropTypes.object.isRequired,
  isCustomerService: PropTypes.bool,
}
