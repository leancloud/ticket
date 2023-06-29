import React, { memo, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Form, Modal } from 'react-bootstrap'
import * as Icon from 'react-bootstrap-icons'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import PropTypes from 'prop-types'
import _ from 'lodash'
import Select from 'react-select'
import { Link } from 'react-router-dom'

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
      if (isCollaborator) {
        alert('Window is about to close')
        close()
      }
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
    if (!customerServices) {
      return [[], []]
    }
    // XXX: /api/1/ticket/:id 不向协作者返回 ticket.group
    // 所以协作者视角下候选负责人列表始终是全部客服和协作者, 没有组员
    const memberIdSet = new Set(groupMembers)
    const [members, others] = _.partition(customerServices, (user) => memberIdSet.has(user.id))
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
        label: members.length ? '其他客服' : '客服',
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
          value={ticket.categoryId}
          onChange={updateCategory}
          onBlur={() => setEditingCategory(false)}
          disabled={isLoading || updating}
        />
      ) : (
        <div className="d-flex align-items-center">
          <Category block categoryId={ticket.categoryId} />
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
    categoryId: PropTypes.string.isRequired,
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
    Object.entries(metadata ?? {}).length > 0 && (
      <Form.Group>
        <hr />
        {Object.entries(metadata ?? {}).map(([key, value]) => (
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
      const tags = [...(ticket[isPrivate ? 'privateTags' : 'tags'] ?? [])]
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
    const tags = tagMetadata.data.isPrivate ? ticket.privateTags : ticket.tags
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
// eslint-disable-next-line react/display-name
const TicketFormValues = memo(({ ticket, loadMoreOpsLogs }) => {
  const { t, i18n } = useTranslation()
  const { addNotification } = useAppContext()
  const queryClient = useQueryClient()
  const [edit, setEdit] = useState(false)
  const close = useCallback(() => setEdit(false), [])

  const { data: formId } = useQuery({
    queryKey: ['meta/category', ticket ? ticket.categoryId : ''],
    queryFn: () =>
      http.get('/api/1/categories', {
        params: {
          id: ticket.categoryId,
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
    select: (data) =>
      data.fieldIds.filter((id) => id !== 'title' && id !== 'details' && id !== 'attachments'),
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
    const otherFields = _(ids)
      .filter((id) => !fieldIds.includes(id))
      .map((id) => map[id])
      .filter((v) => !!v)
      .sortBy((field) => field.meta?.['priority'] ?? 0)
      .reverse()
      .value()
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
      {formFields.length > 0 && (
        <>
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
            <Button
              variant="light"
              size="sm"
              onClick={() => setEdit(true)}
              className="align-baseline"
            >
              {t('edit')}
            </Button>
          </Form.Label>
        </>
      )}
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

// eslint-disable-next-line react/display-name
const AssociateTickets = memo(({ ticket }) => {
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  const { data: associatedTickets } = useQuery({
    queryKey: ['associatedTickets', ticket.id],
    queryFn: () => http.get(`/api/2/tickets/${ticket.id}/associated-tickets`),
  })

  const { mutate: disassociate } = useMutation({
    mutationFn: async (id) => {
      await http.delete(`/api/2/tickets/${ticket.id}/associated-tickets/${id}`)
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries(['ticket'])
      queryClient.invalidateQueries(['tickets'])
      queryClient.invalidateQueries(['associatedTickets'])
    },
  })

  return (
    <Form.Group>
      <Form.Label>{t('ticket.associateTicket')}</Form.Label>
      <div>
        {associatedTickets?.map(({ id, title, nid }) => (
          <div key={id} className="d-flex justify-content-between">
            <Link to={`/tickets/${nid}`} title={title} className={styles.link}>
              <span className={styles.nid}>#{nid}</span>
              {title}
            </Link>
            <Button onClick={() => disassociate(id)} variant="light" size="sm">
              {t('ticket.disassociate')}
            </Button>
          </div>
        )) ?? t('ticket.noAssociation')}
      </div>
    </Form.Group>
  )
})

AssociateTickets.propTypes = {
  ticket: PropTypes.object.isRequired,
}

// eslint-disable-next-line react/display-name
const LanguageSection = memo(({ ticket }) => {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const { isCustomerService } = useContext(AppContext)

  const [editingLanguage, setEditingLanguage] = useState(false)

  const { mutate: update, isLoading } = useMutation({
    mutationFn: (language) => http.patch(`/api/2/tickets/${ticket.id}`, { language }),
    onSuccess: () => {
      queryClient.invalidateQueries(['ticket', ticket.id])
      setEditingLanguage(false)
    },
  })

  const options = useMemo(
    () =>
      // TODO: configurable
      ['zh', 'en', 'ja', 'ko', 'id', 'th', 'de', 'fr', 'ru', 'es', 'pt', 'tr', 'vi']
        .map((lang) => ({
          label: t(`locale.${lang}`),
          value: lang,
        }))
        .concat({ label: t('none'), value: null }),
    [t]
  )

  const value = useMemo(() => options.find(({ value }) => value === (ticket.language ?? null)), [
    ticket,
    options,
  ])

  const handleUpdateLanguage = useCallback(
    (option) => {
      update(option?.value ?? null)
    },
    [update]
  )

  return (
    <Form.Group>
      <Form.Label>
        {t('ticket.language')} <InternalBadge />
      </Form.Label>
      {editingLanguage ? (
        <Select
          isClearable
          isLoading={isLoading}
          isDisabled={isLoading}
          options={options}
          value={value}
          onChange={handleUpdateLanguage}
          onBlur={() => setEditingLanguage(false)}
        />
      ) : (
        <div className="d-flex align-items-center">
          {ticket.language ? t(`locale.${ticket.language}`) : t('none')}
          {isCustomerService && (
            <Button variant="link" onClick={() => setEditingLanguage(true)}>
              <Icon.PencilFill />
            </Button>
          )}
        </div>
      )}
    </Form.Group>
  )
})

LanguageSection.propTypes = {
  ticket: PropTypes.object.isRequired,
}

export function Fields({ ticket, loadMoreOpsLogs }) {
  const { isUser } = useContext(AppContext)
  return (
    <>
      <CategorySection ticket={ticket} />

      <TicketFormValues ticket={ticket} loadMoreOpsLogs={loadMoreOpsLogs} />

      {!isUser && <CustomMetadata metadata={ticket.metaData} />}
    </>
  )
}

export function TicketMetadata({ ticket }) {
  const { isStaff, isCustomerService } = useContext(AppContext)
  return (
    <>
      {isStaff && <GroupSection ticket={ticket} />}

      <AssigneeSection ticket={ticket} />

      {isStaff && <LanguageSection ticket={ticket} />}

      <AssociateTickets ticket={ticket} />

      <MountCustomElement point="ticket.metadata" props={{ ticket, isCustomerService }} />

      <TagSection ticket={ticket} />
    </>
  )
}

TicketMetadata.propTypes = {
  ticket: PropTypes.object.isRequired,
  loadMoreOpsLogs: PropTypes.func,
}
