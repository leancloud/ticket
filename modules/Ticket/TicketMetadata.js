import React, { memo, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Form, Modal } from 'react-bootstrap'
import * as Icon from 'react-bootstrap-icons'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import PropTypes from 'prop-types'
import _ from 'lodash'
import Select from 'react-select'

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
import styles from './index.css'

function updateTicket(id, data) {
  return http.patch(`/api/2/tickets/${id}`, data)
}

function GroupSection({ ticket }) {
  const { t } = useTranslation()
  const [editingGroup, setEditingGroup] = useState(false)
  const { data: groups, isLoading } = useGroups()

  const { addNotification, isCustomerService } = useContext(AppContext)
  const queryClient = useQueryClient()
  const { mutate: updateGroup, isLoading: updating } = useMutation({
    mutationFn: (groupId) => updateTicket(ticket.id, { groupId }),
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
          {isCustomerService && (
            <Button variant="link" onClick={() => setEditingGroup(true)}>
              <Icon.PencilFill />
            </Button>
          )}
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

const prioritize = (items, check) =>
  items?.reduce((prev, item) => (check(item) ? [item, ...prev] : [...prev, item]), [])

function AssigneeSection({ ticket }) {
  const { t } = useTranslation()
  const { addNotification, isCustomerService, isCollaborator } = useContext(AppContext)
  const [editingAssignee, setEditingAssignee] = useState(false)
  const { data: customerServices, isLoading } = useQuery({
    queryKey: 'customerServices',
    queryFn: () =>
      http.get('/api/2/customer-services', {
        params: {
          active: true,
        },
      }),
    enabled: editingAssignee,
    staleTime: Infinity,
  })
  const queryClient = useQueryClient()

  const { mutate: updateAssignee, isLoading: updating } = useMutation({
    mutationFn: (assigneeId) => updateTicket(ticket.id, { assigneeId }),
    onSuccess: () => {
      queryClient.invalidateQueries(['ticket', ticket.id])
      setEditingAssignee(false)
    },
    onError: (error) => addNotification(error),
  })

  const { group } = ticket
  const { data: groupMembers, isLoading: loadingGroupMembers } = useQuery({
    queryKey: ['groups', group?.id],
    queryFn: () => fetch(`/api/2/groups/${group?.id}`).then((group) => group.userIds),
    enabled: !!group,
  })
  const groupIncludesAssignee = groupMembers?.includes(ticket.assignee?.id)

  const { currentUser } = useContext(AppContext)
  const [members, others] = useMemo(() => {
    if (!customerServices || !groupMembers) {
      return [[], []]
    }
    const [members, others] = _.partition(customerServices, (user) =>
      groupMembers.includes(user.id)
    )
    const isCurrentUser = (user) => user.id === currentUser.id
    return [prioritize(members, isCurrentUser), prioritize(others, isCurrentUser)]
  }, [currentUser.id, customerServices, groupMembers])

  const { data: collaborators, isLoading: loadingCollaborators } = useQuery({
    queryKey: ['collaborators'],
    queryFn: () => http.get('/api/2/collaborators'),
    enabled: editingAssignee,
    staleTime: Infinity,
  })

  const options = useMemo(() => {
    const options = []
    const getOptions = (users) => {
      return users.map((user) => ({
        label: user.id === currentUser.id ? user.nickname + ' (you)' : user.nickname,
        value: user.id,
      }))
    }
    if (group && members.length) {
      options.push({
        label: group.name,
        options: getOptions(members),
      })
    }
    if (others.length) {
      options.push({
        label: '其他客服',
        options: getOptions(others),
      })
    }
    if (collaborators && collaborators.length) {
      options.push({
        label: '协作者',
        options: getOptions(collaborators),
      })
    }
    return options
  }, [group, members, others, collaborators])

  const value = useMemo(() => {
    if (ticket.assignee) {
      return options
        .flatMap((option) => option.options)
        .find((option) => option.value === ticket.assignee.id)
    }
  }, [ticket.assignee, options])

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
        <Select
          isClearable
          isLoading={isLoading || loadingGroupMembers || loadingCollaborators}
          isDisabled={updating}
          options={options}
          value={value}
          onChange={(option) => updateAssignee(option ? option.value : null)}
          onBlur={() => setEditingAssignee(false)}
        />
      ) : (
        <div className="d-flex align-items-center">
          {ticket.assignee ? <UserLabel user={ticket.assignee} /> : '<unset>'}
          {(isCustomerService || isCollaborator) && (
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
      {isCustomerService && ticket.assignee && ticket.group && !groupIncludesAssignee && (
        <Alert variant="warning" className={styles.metaAlert}>
          {ticket.assignee.name} is not a member of {ticket.group.name}{' '}
          <Button variant="light" size="sm" onClick={() => updateAssignee(null)}>
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
    group: PropTypes.object,
  }),
}

function CategorySection({ ticket }) {
  const { t } = useTranslation()
  const { addNotification, isCustomerService } = useContext(AppContext)
  const [editingCategory, setEditingCategory] = useState(false)
  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories', { active: true }],
    queryFn: () => fetch('/api/2/categories?active=true'),
  })
  const queryClient = useQueryClient()

  const { mutate: updateCategory, isLoading: updating } = useMutation({
    mutationFn: (categoryId) => updateTicket(ticket.id, { categoryId }),
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
          <Category block categoryId={ticket.category_id} />
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
  }),
}

const tryToCall = (fn, ...params) => {
  try {
    return fn(...params)
  } catch (error) {
    return error.message
  }
}

function CustomMetadata({ metadata }) {
  const { t } = useTranslation()
  const comments = getConfig('ticket.metadata.customMetadata.comments', {})
  const valueRenderers = getConfig('ticket.metadata.customMetadata.valueRenderers', {})

  return (
    Object.entries(metadata).length > 0 && (
      <Form.Group>
        <hr />
        {Object.entries(metadata).map(([key, value]) => (
          <div className={css.customMetadata} key={key}>
            <span className={css.key}>{comments[key] || key}: </span>
            {typeof valueRenderers[key] === 'function'
              ? tryToCall(valueRenderers[key], value)
              : typeof value === 'string'
              ? value
              : JSON.stringify(value)}
          </div>
        ))}
      </Form.Group>
    )
  )
}
CustomMetadata.propTypes = {
  metadata: PropTypes.object.isRequired,
}

function TagSection({ ticket }) {
  const { addNotification, tagMetadatas, isCustomerService } = useContext(AppContext)
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
      return mutateAsync({ [isPrivate ? 'privateTags' : 'tags']: tags })
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

  const { mutate, isLoading } = useMutation({
    mutationFn: (data) => http.put(`/api/2/tickets/${ticketId}/custom-fields`, data),
    onSuccess: (data, variables) => {
      onUpdated(variables)
      close()
    },
    onError: addNotification,
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
            const newValues = Object.entries(formValues)
              .filter(([, value]) => !_.isEmpty(value))
              .map(([field, value]) => ({ field, value }))
            mutate(newValues)
          }}
        >
          {fields.map((field) => {
            const variant = field.variants[0] || {}
            return (
              <CustomField
                value={formValues[field.id]}
                key={field.id}
                id={field.id}
                type={field.type}
                required={field.required}
                options={variant.options}
                label={variant.title}
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
const TicketFormValues = memo(({ ticket, loadMoreOpsLogs }) => {
  const { t, i18n } = useTranslation()
  const { addNotification } = useAppContext()
  const queryClient = useQueryClient()
  const [edit, setEdit] = useState(false)
  const close = useCallback(() => setEdit(false), [])

  const { data: formId } = useQuery({
    queryKey: ['meta/category', ticket ? ticket.category_id : ''],
    queryFn: () =>
      http.get('/api/1/categories', {
        params: {
          id: ticket.category_id,
          active: true,
        },
      }),
    select: (data) => (data[0] ? data[0].form_id : undefined),
    enabled: !!ticket,
    onError: (err) => addNotification(err),
  })

  const { data: formValues } = useQuery({
    queryKey: ['meta/formValues', ticket ? ticket.id : ''],
    queryFn: () => http.get(`/api/2/tickets/${ticket.id}/custom-fields`),
    enabled: !!ticket,
    select: (data) =>
      data.reduce((map, item) => {
        map[item.field] = item.value
        return map
      }, {}),
    onError: (err) => addNotification(err),
  })

  const { data: fieldIds } = useQuery({
    queryKey: ['meta/form', formId],
    queryFn: () => http.get(`/api/1/ticket-forms/${formId}`),
    select: (data) => data.fieldIds.filter((id) => id !== 'title' && id !== 'description'),
    enabled: !!formId,
    onError: (err) => addNotification(err),
  })

  const matchFormValues = useMemo(() => {
    if (!fieldIds || !formValues) {
      return {}
    }
    return fieldIds.reduce((pre, curr) => {
      pre[curr] = formValues[curr]
      return pre
    }, {})
  }, [fieldIds, formValues])

  const ids = useMemo(() => {
    if (!formValues || !fieldIds) {
      return
    }
    return _(formValues).keys().concat(fieldIds).uniq().value()
  }, [formValues, fieldIds])

  const { data: fields } = useQuery({
    queryKey: ['meta/fieldMap', i18n.language, ids],
    queryFn: () =>
      http.get(`/api/1/ticket-fields`, {
        params: {
          ids: ids.join(','),
          includeVariant: true,
          locale: i18n.language || 'default',
        },
      }),
    onError: (err) => addNotification(err),
    enabled: !!ids,
  })

  const { formFields, otherFields } = useMemo(() => {
    if (!fieldIds || !fields) {
      return {
        formFields: [],
        otherFields: [],
      }
    }
    const map = fields.reduce((pre, curr) => {
      pre[curr.id] = curr
      return pre
    }, {})
    const formFields = fieldIds.map((id) => map[id]).filter((v) => !!v)
    const otherFields = _.filter(ids, (id) => !fieldIds.includes(id))
      .map((id) => map[id])
      .filter((v) => !!v)
    return {
      formFields,
      otherFields,
    }
  }, [fieldIds, fields, ids])

  const onUpdated = useCallback(
    (data) => {
      queryClient.setQueryData(['meta/formValues', ticket ? ticket.id : ''], data)
      loadMoreOpsLogs()
    },
    [queryClient, ticket, loadMoreOpsLogs]
  )

  if (!fields || fields.length === 0) {
    return null
  }

  return (
    <Form>
      <hr />
      {formFields.map((field) => {
        return (
          <CustomFieldDisplay
            key={field.id}
            field={field}
            value={matchFormValues[field.id]}
            user={ticket.author}
            className={styles.field}
          />
        )
      })}
      <Form.Label>
        <Button variant="light" size="sm" onClick={() => setEdit(true)} className="align-baseline">
          {t('edit')}
        </Button>
      </Form.Label>
      {otherFields.length > 0 && (
        <>
          <hr />
          {otherFields.map((field) => {
            return (
              <CustomFieldDisplay
                key={field.id}
                field={field}
                value={formValues ? formValues[field.id] : undefined}
                user={ticket.author}
                className={styles.field}
              />
            )
          })}
        </>
      )}

      <Modal show={edit} onHide={close}>
        <TicketFormModal
          ticketId={ticket.id}
          fields={formFields}
          values={matchFormValues}
          onUpdated={onUpdated}
          close={close}
        />
      </Modal>
    </Form>
  )
})

export function Fields({ ticket, loadMoreOpsLogs }) {
  const { isUser } = useContext(AppContext)
  return (
    <>
      <CategorySection ticket={ticket} />

      <TicketFormValues ticket={ticket} loadMoreOpsLogs={loadMoreOpsLogs} />

      {!isUser && <CustomMetadata metadata={ticket.metadata} />}
    </>
  )
}
TicketMetadata.propTypes = {
  ticket: PropTypes.object.isRequired,
  loadMoreOpsLogs: PropTypes.func,
}

export function TicketMetadata({ ticket }) {
  const { isStaff, isCustomerService } = useContext(AppContext)
  return (
    <>
      {isStaff && <GroupSection ticket={ticket} />}

      <AssigneeSection ticket={ticket} />

      <MountCustomElement point="ticket.metadata" props={{ ticket, isCustomerService }} />

      <TagSection ticket={ticket} />
    </>
  )
}
TicketMetadata.propTypes = {
  ticket: PropTypes.object.isRequired,
}
