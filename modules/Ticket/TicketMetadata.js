import React, { useCallback, useContext, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import * as Icon from 'react-bootstrap-icons'

import { getCategoryPathName } from '../common'
import { UserLabel } from '../UserLabel'
import TagForm from '../TagForm'
import css from './index.css'
import csCss from '../CustomerServiceTickets.css'
import CategoriesSelect from '../CategoriesSelect'
import { getConfig } from '../config'
import { MountCustomElement } from '../custom/element'
import { AppContext } from '../context'
import { updateTicket } from './hooks'
import { useCustomerServices } from '../CustomerService/hooks'
import { useCategoriesTree } from '../category/hooks'
import { useMutation, useQueryClient } from 'react-query'

export default function TicketMetadata({ ticket, isCustomerService }) {
  const { t } = useTranslation()
  const { tagMetadatas, addNotification } = useContext(AppContext)
  const { data: categoriesTree, isLoading: isLoadingCategoriesTree } = useCategoriesTree()
  const { data: customerServices } = useCustomerServices()
  const [updatingAssignee, setUpdatingAssignee] = useState(false)
  const [updatingCategory, setUpdatingCategory] = useState(false)

  const queryClient = useQueryClient()
  const { mutate } = useMutation((data) => updateTicket(ticket.nid, data), {
    onError: (error) => addNotification(error),
  })

  const invalidateTicketCache = useCallback(
    () => queryClient.invalidateQueries(['ticket', ticket.nid]),
    [queryClient, ticket.nid]
  )

  const handleChangeAssignee = (e) => {
    mutate(
      { assigneeId: e.target.value },
      {
        onSuccess: invalidateTicketCache,
        onSettled: () => setUpdatingAssignee(false),
      }
    )
  }

  const handleChangeCategory = (e) => {
    mutate(
      { categoryId: e.target.value },
      {
        onSuccess: invalidateTicketCache,
        onSettled: () => setUpdatingCategory(false),
      }
    )
  }

  const handleSaveTag = (key, value, isPrivate) => {
    const tags = [...ticket[isPrivate ? 'privateTags' : 'tags']]
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
    mutate(
      { [isPrivate ? 'privateTags' : 'tags']: tags },
      {
        onSuccess: (res, data) => {
          queryClient.setQueryData(['ticket', ticket.nid], (current) => ({
            ...current,
            ticket: { ...current.ticket, ...data },
          }))
        },
      }
    )
  }

  const { assignee } = ticket
  return (
    <>
      <Form.Group>
        <Form.Label>{t('assignee')}</Form.Label>
        {updatingAssignee ? (
          <Form.Control
            as="select"
            value={assignee.objectId}
            onChange={handleChangeAssignee}
            onBlur={() => setUpdatingAssignee(false)}
          >
            {customerServices.map(({ objectId, username }) => (
              <option key={objectId} value={objectId}>
                {username}
              </option>
            ))}
          </Form.Control>
        ) : (
          <Form.Group>
            <UserLabel user={assignee} />
            {isCustomerService && (
              <Button variant="link" onClick={() => setUpdatingAssignee(true)}>
                <Icon.PencilFill />
              </Button>
            )}
          </Form.Group>
        )}
      </Form.Group>

      <Form.Group>
        <Form.Label>{t('category')}</Form.Label>
        {updatingCategory ? (
          <CategoriesSelect
            categoriesTree={categoriesTree}
            selected={ticket.category}
            onChange={handleChangeCategory}
            onBlur={() => setUpdatingCategory(false)}
          />
        ) : (
          <div>
            <span className={csCss.category + ' ' + css.categoryBlock}>
              {isLoadingCategoriesTree
                ? 'Loading...'
                : getCategoryPathName(ticket.category, categoriesTree)}
            </span>
            {isCustomerService && !isLoadingCategoriesTree && (
              <Button variant="link" onClick={() => setUpdatingCategory(true)}>
                <Icon.PencilFill />
              </Button>
            )}
          </div>
        )}
      </Form.Group>

      {isCustomerService && ticket.metaData && (
        <Form.Group>
          <Form.Label>{t('details')}</Form.Label>
          {Object.entries(ticket.metaData)
            .filter(([, v]) => v && (typeof v === 'string' || typeof v === 'number'))
            .map(([key, value]) => {
              const comments = getConfig('ticket.metadata.customMetadata.comments', {})
              return (
                <div className={css.customMetadata} key={key}>
                  <span className={css.key}>{comments[key] || key}: </span>
                  {value}
                </div>
              )
            })}
        </Form.Group>
      )}

      <MountCustomElement point="ticket.metadata" props={{ isCustomerService, ticket }} />

      {tagMetadatas.map((tagMetadata) => {
        const tags = ticket[tagMetadata.get('isPrivate') ? 'privateTags' : 'tags']
        const tag = tags.find((tag) => tag.key === tagMetadata.get('key'))
        return (
          <TagForm
            key={tagMetadata.id}
            tagMetadata={tagMetadata}
            tag={tag}
            changeTagValue={handleSaveTag}
            isCustomerService={isCustomerService}
          />
        )
      })}
    </>
  )
}

TicketMetadata.propTypes = {
  isCustomerService: PropTypes.bool.isRequired,
  ticket: PropTypes.shape({
    assignee: PropTypes.object.isRequired,
    category: PropTypes.object.isRequired,
  }).isRequired,
}
