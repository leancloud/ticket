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
import { Link } from 'react-router-dom'
import { useMutation, useQuery } from 'react-query'
import { useDebounce, useUpdate } from 'react-use'
import classnames from 'classnames'
import { http } from 'lib/leancloud'
import * as Icon from 'react-bootstrap-icons'
import { useTranslation } from 'react-i18next'
import { useAppContext } from 'modules/context'
import { DocumentTitle } from 'modules/utils/DocumentTitle'
import NoData from 'modules/components/NoData'
import { includeOptionsType } from '../TicketField/CustomField'
import { useFormId } from './'
import Preview from './Preview'
import styles from './index.module.scss'

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
                {item.title} <Badge variant="info"> {t(`ticketField.type.${item.type}`)}</Badge>
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
              </Card.Text>
            </Card.Body>
          </Card>
        )
      }}
    </Draggable>
  ))
}

const TicketForm = memo(({ onSubmit, submitting, initData }) => {
  const { t } = useTranslation()
  const update = useUpdate()
  const { addNotification } = useAppContext()
  const [previewModalActive, setPreviewModalActive] = useState(false)
  const [title, setTitle] = useState('')
  const [searchValue, setSearchValue] = useState('')
  const [debouncedSearchValue, setDebouncedSearchValue] = useState()
  const [activeFiledList, setActiveFiledList] = useState([])
  const [fieldList, setFiledList] = useState([])

  useEffect(() => {
    if (initData) {
      setTitle(initData.title)
      setActiveFiledList(initData.fields)
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
    ['settings/ticketForm', debouncedSearchValue],
    () =>
      http.get('/api/1/ticket-fields', {
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
    mutationFn: (id) => http.get(`/api/1/ticket-fields/${id}`),
    onSuccess: (fieldData) => {
      setActiveFiledList((pre) =>
        pre.map((preFieldData) => {
          if (preFieldData.id !== fieldData.id) {
            return preFieldData
          }
          const filterVariant = fieldData.variants.filter(
            (variant) => variant.locale === fieldData.defaultLocale
          )
          return {
            ...preFieldData,
            variant: filterVariant[0],
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
      setActiveFiledList((preList) => {
        preList.splice(sourceIndex, 1)
        return preList
      })
      setFiledList((preList) => {
        preList.splice(destIndex, 0, removed)
        return preList
      })
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
      } else {
        if (source.droppableId === 'waitingArea') {
          add(source.index, destination.index)
        } else {
          remove(source.index, destination.index)
        }
      }
    },
    [add, remove]
  )

  const closePreview = useCallback(() => setPreviewModalActive(false), [])

  console.log(activeFiledList)
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
          placeholder={t('ticketForm.nameHint')}
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
            <Form.Label>{t('ticketForm.fieldSelected')}</Form.Label>
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
                  {activeFiledList.length === 0 && <NoData info={t('ticketForm.fieldAdd')} />}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </Form.Group>
          <Form.Group className={`${styles.group} d-flex flex-column`}>
            <Form.Label htmlFor="search">{t('ticketForm.fieldOptional')}</Form.Label>
            <InputGroup className="mb-2" size="sm">
              <FormControl
                name="search"
                id="search"
                placeholder={t('ticketForm.fieldSearchHint')}
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
                    <NoData info={t('ticketForm.fieldOptionalRequired')} />
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
        <Link to="/settings/ticketForm">
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
  const { mutateAsync, isLoading } = useMutation({
    mutationFn: (data) => http.post('/api/1/ticket-forms', data),
    onSuccess: () => {
      addNotification({
        message: t('ticketField.success'),
      })
    },
    onError: (err) => addNotification(err),
  })
  return (
    <>
      <DocumentTitle title={`${t('ticketForm.add')} - LeanTicket`} />
      <Breadcrumb>
        <Breadcrumb.Item linkProps={{ to: '/settings/ticketForm' }} linkAs={Link}>
          {t('ticketForm.list')}
        </Breadcrumb.Item>
        <Breadcrumb.Item active>{t('ticketForm.add')}</Breadcrumb.Item>
      </Breadcrumb>
      <TicketForm onSubmit={mutateAsync} submitting={isLoading} />
    </>
  )
})

const EditorForm = () => {
  const { t } = useTranslation()
  const { addNotification } = useAppContext()
  const fieldId = useFormId()
  const { data } = useQuery({
    queryKey: ['setting/forms', fieldId],
    queryFn: () => http.get(`/api/1/ticket-forms/${fieldId}/details`),
    onError: (err) => addNotification(err),
  })
  const { mutateAsync, isLoading } = useMutation({
    mutationFn: (data) => http.patch(`/api/1/ticket-forms/${fieldId}`, data),
    onSuccess: () => {
      addNotification({
        message: t('ticketField.success'),
      })
    },
    onError: (err) => addNotification(err),
  })
  return (
    <>
      <DocumentTitle title={`${t('ticketField.edit')} - LeanTicket`} />
      <Breadcrumb>
        <Breadcrumb.Item linkProps={{ to: '/settings/ticketForm' }} linkAs={Link}>
          {t('ticketForm.list')}
        </Breadcrumb.Item>
        <Breadcrumb.Item active>{fieldId}</Breadcrumb.Item>
      </Breadcrumb>
      <TicketForm onSubmit={mutateAsync} submitting={isLoading} initData={data} />
    </>
  )
}

export { AddForm, EditorForm }
