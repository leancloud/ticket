import React, { memo, useState, useCallback, useEffect } from 'react'
import {
  Form,
  Button,
  InputGroup,
  FormControl,
  Breadcrumb,
  Spinner,
  Card,
  Badge,
  Modal,
} from 'react-bootstrap'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { Link, useHistory } from 'react-router-dom'
import { useMutation, useQuery } from 'react-query'
import { useDebounce, useUpdate } from 'react-use'
import classnames from 'classnames'
import _ from 'lodash'
import { http, httpWithLimitation } from 'lib/leancloud'
import * as Icon from 'react-bootstrap-icons'
import { useTranslation } from 'react-i18next'
import { useAppContext } from 'modules/context'
import { DocumentTitle } from 'modules/utils/DocumentTitle'
import NoData from 'modules/components/NoData'
import { includeOptionsType } from 'modules/components/CustomField'
import { useFormId } from './'
import Preview from './Preview'
import styles from './index.module.scss'
import { systemFieldData } from '../TicketField'
import useTicketForm from './useTicketForm'

const FieldList = ({ list, remove, add }) => {
  const { t } = useTranslation()
  return list.map((item, index) => (
    <Draggable key={item.id} draggableId={item.id} index={index}>
      {(provided, snapshot) => {
        return (
          <Card
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={classnames('mb-2', 'mx-2', {
              'border-primary': snapshot.isDragging,
            })}
            style={provided.draggableProps.style}
          >
            <Card.Body className="p-2">
              <Card.Text>
                {item.system && (
                  <>
                    {t(item.id)} <Badge variant="info">{t('ticketField.defaultField')}</Badge>
                  </>
                )}
                {!item.system && item.title}{' '}
                <Badge variant="info">{t(`ticketField.type.${item.type}`)}</Badge>
                {!item.system && (
                  <>
                    {remove && (
                      <Button
                        size="sm"
                        variant="light"
                        className="float-right"
                        onClick={() => remove(index)}
                      >
                        {t('remove')}
                      </Button>
                    )}
                    {add && (
                      <Button
                        size="sm"
                        variant="light"
                        className="float-right"
                        onClick={() => add(index)}
                      >
                        {t('add')}
                      </Button>
                    )}
                  </>
                )}
              </Card.Text>
            </Card.Body>
          </Card>
        )
      }}
    </Draggable>
  ))
}

const TicketForm = memo(({ onSubmit, submitting, initData }) => {
  const { t, i18n } = useTranslation()
  const update = useUpdate()
  const { addNotification } = useAppContext()
  const [previewModalActive, setPreviewModalActive] = useState(false)
  const [title, setTitle] = useState('')
  const [searchValue, setSearchValue] = useState('')
  const [debouncedSearchValue, setDebouncedSearchValue] = useState()
  const [activeFiledList, setActiveFiledList] = useState(systemFieldData)
  const [fieldList, setFiledList] = useState([])

  useEffect(() => {
    if (initData) {
      setTitle(initData.title)
      setActiveFiledList(() => {
        const hasSystemFiled = _.intersectionBy(systemFieldData, initData.fields, 'id')
        if (hasSystemFiled.length > 0) {
          return initData.fields.map((field) => {
            const filterField = systemFieldData.filter((fieldItem) => fieldItem.id === field.id)
            return filterField.length > 0 ? filterField[0] : field
          })
        }
        return [...systemFieldData, ...initData.fields]
      })
      setFiledList((pre) => {
        const activeIds = initData.fields.map((field) => field.id)
        return pre.filter((field) => !activeIds.includes(field.id))
      })
    }
  }, [initData])

  useDebounce(
    () => {
      setDebouncedSearchValue(searchValue.trim())
    },
    300,
    [searchValue]
  )

  const { isFetching } = useQuery(
    ['settings/ticketTemplate', debouncedSearchValue],
    () =>
      httpWithLimitation.get('/api/1/ticket-fields', {
        params: {
          size: 30,
          skip: 0,
          search: debouncedSearchValue,
        },
      }),
    {
      initialData: [[], 0],
      keepPreviousData: true,
      onSuccess: (data) => {
        if (!data) {
          return
        }
        setFiledList(
          data[0].filter((field) => !activeFiledList.some((item) => item.id === field.id))
        )
      },
      onError: (err) => addNotification(err),
    }
  )

  const { mutate } = useMutation({
    mutationKey: [i18n.language],
    mutationFn: (id) =>
      http.get(`/api/1/ticket-fields/${id}`, {
        params: {
          locale: i18n.language || 'default',
        },
      }),
    onSuccess: (fieldData) => {
      setActiveFiledList((pre) =>
        pre.map((preFieldData) => {
          if (preFieldData.id !== fieldData.id) {
            return preFieldData
          }
          return {
            ...preFieldData,
            variant: fieldData.variants[0],
          }
        })
      )
    },
    onError: (err) => addNotification(err),
  })

  const appendFieldData = useCallback(
    (fieldData) => {
      if (!includeOptionsType.includes(fieldData.type)) {
        return
      }
      if (fieldData.variant) {
        return
      }
      mutate(fieldData.id)
    },
    [mutate]
  )

  const remove = useCallback(
    (sourceIndex, destIndex) => {
      destIndex = destIndex ? destIndex : 0
      const [removed] = [...activeFiledList].splice(sourceIndex, 1)
      if (!removed.system) {
        setActiveFiledList((preList) => {
          preList.splice(sourceIndex, 1)
          return preList
        })
        setFiledList((preList) => {
          preList.splice(destIndex, 0, removed)
          return preList
        })
      }
      update()
    },
    [activeFiledList, update]
  )

  const add = useCallback(
    (sourceIndex, destIndex) => {
      destIndex = destIndex === undefined ? fieldList.length : destIndex
      const [removed] = [...fieldList].splice(sourceIndex, 1)
      setFiledList((preList) => {
        preList.splice(sourceIndex, 1)
        return preList
      })
      setActiveFiledList((preList) => {
        preList.splice(destIndex, 0, removed)
        return preList
      })
      appendFieldData(removed)
      update()
    },
    [fieldList, update, appendFieldData]
  )

  const onDragEnd = useCallback(
    (result) => {
      const { source, destination } = result
      if (!destination) {
        return
      }
      if (source.droppableId === destination.droppableId) {
        if (source.droppableId === 'waitingArea') {
          setFiledList((preList) => {
            const [removed] = preList.splice(source.index, 1)
            preList.splice(destination.index, 0, removed)
            return preList
          })
        } else {
          setActiveFiledList((preList) => {
            const [removed] = preList.splice(source.index, 1)
            preList.splice(destination.index, 0, removed)
            return preList
          })
        }
        update()
      } else {
        if (source.droppableId === 'waitingArea') {
          add(source.index, destination.index)
        } else {
          remove(source.index, destination.index)
        }
      }
    },
    [add, remove, update]
  )

  const closePreview = useCallback(() => setPreviewModalActive(false), [])

  return (
    <Form
      onSubmit={(e) => {
        e.preventDefault()
        const fieldIds = activeFiledList.map((field) => field.id)
        if (fieldIds.length < 1) {
          return
        }
        onSubmit({
          title,
          fieldIds,
        })
      }}
    >
      <Form.Group>
        <Form.Label htmlFor="title">{t('name')}</Form.Label>
        <Form.Control
          required
          id="title"
          name="title"
          type="text"
          placeholder={t('ticketTemplate.nameHint')}
          value={title}
          onChange={(e) => {
            const { value } = e.target
            setTitle(value)
          }}
        />
      </Form.Group>
      <div className="d-flex flex-column-reverse flex-md-row">
        <DragDropContext onDragEnd={onDragEnd}>
          <Form.Group className={`${styles.group} d-flex flex-column`}>
            <Form.Label>{t('ticketTemplate.fieldSelected')}</Form.Label>
            <Droppable droppableId="selectedArea">
              {(provided, snapshot) => (
                <div
                  className={classnames(
                    'flex-fill mr-4 py-2 bg-light',
                    {
                      'border border-primary': snapshot.isDraggingOver,
                    },
                    styles.list
                  )}
                  ref={provided.innerRef}
                >
                  <FieldList list={activeFiledList} remove={remove} />
                  {activeFiledList.length === 0 && <NoData info={t('ticketTemplate.fieldAdd')} />}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </Form.Group>
          <Form.Group className={`${styles.group} d-flex flex-column`}>
            <Form.Label htmlFor="search">{t('ticketTemplate.fieldOptional')}</Form.Label>
            <InputGroup className="mb-2" size="sm">
              <FormControl
                name="search"
                id="search"
                placeholder={t('ticketTemplate.fieldSearchHint')}
                value={searchValue}
                onChange={(e) => {
                  const { value } = e.target
                  setSearchValue(value)
                }}
              />
              <InputGroup.Append>
                <InputGroup.Text>
                  {isFetching ? (
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                    />
                  ) : (
                    <Icon.Search />
                  )}
                </InputGroup.Text>
              </InputGroup.Append>
            </InputGroup>
            <Droppable droppableId="waitingArea">
              {(provided, snapshot) => (
                <div
                  className={classnames(
                    'flex-fill py-2 bg-light',
                    {
                      'border border-primary': snapshot.isDraggingOver,
                    },
                    styles.list
                  )}
                  ref={provided.innerRef}
                >
                  <FieldList list={fieldList} add={add} />
                  {fieldList.length === 0 && (
                    <NoData info={t('ticketTemplate.fieldOptionalRequired')} />
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </Form.Group>
        </DragDropContext>
      </div>
      <div className="d-flex mt-2">
        <Button variant="secondary" className="mr-auto" onClick={() => setPreviewModalActive(true)}>
          {t('preview')}
        </Button>
        <Link to="/settings/ticketTemplate">
          <Button className="mr-2" variant="outline-primary">
            {t('cancel')}
          </Button>
        </Link>
        <Button
          type="submit"
          variant="primary"
          disabled={submitting || activeFiledList.length === 0}
        >
          {t('save')}
        </Button>
      </div>
      <Modal show={previewModalActive} onHide={closePreview} size="lg">
        {previewModalActive && <Preview close={closePreview} data={activeFiledList} />}
      </Modal>
    </Form>
  )
})

const AddForm = memo(() => {
  const { t } = useTranslation()
  const { addNotification } = useAppContext()
  const history = useHistory()
  const { mutateAsync, isLoading } = useMutation({
    mutationFn: (data) => http.post('/api/1/ticket-forms', data),
    onSuccess: () => {
      addNotification({
        message: t('ticketField.success'),
      })
      history.push('/settings/ticketTemplate')
    },
    onError: (err) => addNotification(err),
  })
  return (
    <>
      <DocumentTitle title={`${t('ticketTemplate.add')}`} />
      <Breadcrumb>
        <Breadcrumb.Item linkProps={{ to: '/settings/ticketTemplate' }} linkAs={Link}>
          {t('ticketTemplate.list')}
        </Breadcrumb.Item>
        <Breadcrumb.Item active>{t('ticketTemplate.add')}</Breadcrumb.Item>
      </Breadcrumb>
      <TicketForm onSubmit={mutateAsync} submitting={isLoading} />
    </>
  )
})

const EditorForm = () => {
  const { t } = useTranslation()
  const { addNotification } = useAppContext()
  const formId = useFormId()
  const { data, error } = useTicketForm(formId)
  useEffect(() => {
    if (error) {
      addNotification(error)
    }
  }, [error, addNotification])

  const { mutateAsync, isLoading } = useMutation({
    mutationFn: (data) => http.patch(`/api/1/ticket-forms/${formId}`, data),
    onSuccess: () => {
      addNotification({
        message: t('ticketField.success'),
      })
    },
    onError: (err) => addNotification(err),
  })

  return (
    <>
      <DocumentTitle title={`${t('ticketField.edit')}`} />
      <Breadcrumb>
        <Breadcrumb.Item linkProps={{ to: '/settings/ticketTemplate' }} linkAs={Link}>
          {t('ticketTemplate.list')}
        </Breadcrumb.Item>
        <Breadcrumb.Item active>{formId}</Breadcrumb.Item>
      </Breadcrumb>
      <TicketForm onSubmit={mutateAsync} submitting={isLoading} initData={data} />
    </>
  )
}

export { AddForm, EditorForm }
