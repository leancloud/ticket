import React, { useContext, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import * as Icon from 'react-bootstrap-icons'

import { getCategoryPathName } from '../common'
import { UserLabel } from '../UserLabel'
import TagForm from '../TagForm'
import css from './index.css'
import csCss from '../CustomerServiceTickets.css'
import { depthFirstSearchFind } from '../../lib/common'
import CategoriesSelect from '../CategoriesSelect'
import { getConfig } from '../config'
import { MountCustomElement } from '../custom/element'
import { AppContext } from '../context'
import { useUpdateAssignee, useUpdateCategory, useSaveTicketTag } from './hooks'
import { useCustomerServices } from '../CustomerService/hooks'
import { useCategoriesTree } from '../category/hooks'

export default function TicketMetadata({ ticket, isCustomerService }) {
  const { t } = useTranslation()
  const { tagMetadatas, addNotification } = useContext(AppContext)
  const { data: categoriesTree, isLoading: isLoadingCategoriesTree } = useCategoriesTree()
  const { data: customerServices } = useCustomerServices()
  const [updatingAssignee, setUpdatingAssignee] = useState(false)
  const [updatingCategory, setUpdatingCategory] = useState(false)

  const { mutate: updateAssignee, setLocalAssignee } = useUpdateAssignee(ticket.nid)
  const { mutate: updateCateogry, setLocalCategory } = useUpdateCategory(ticket.nid)
  const { mutate: saveTags, setLocalTags } = useSaveTicketTag(ticket.nid)

  const handleChangeAssignee = (e) => {
    const assigneeId = e.target.value
    const assignee = customerServices.find(({ objectId }) => objectId === assigneeId)
    updateAssignee(assigneeId, {
      onSuccess: () => {
        setLocalAssignee(assignee)
        setUpdatingAssignee(false)
      },
      onError: addNotification,
    })
  }

  const handleChangeCategory = (e) => {
    const categoryId = e.target.value
    const category = depthFirstSearchFind(categoriesTree, (c) => c.id === categoryId)
    updateCateogry(categoryId, {
      onSuccess: () => {
        setLocalCategory(category.toJSON())
        setUpdatingCategory(false)
      },
      onError: addNotification,
    })
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
    saveTags(
      { tags, isPrivate },
      {
        onSuccess: () => setLocalTags({ tags, isPrivate }),
        onError: addNotification,
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
