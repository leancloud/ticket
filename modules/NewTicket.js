/* global ALGOLIA_API_KEY, ENABLE_LEANCLOUD_INTEGRATION */
import React, { memo, useEffect, useMemo, useState, useCallback, useRef } from 'react'
import PropTypes from 'prop-types'
import { Button, Form, Tooltip, OverlayTrigger } from 'react-bootstrap'
import * as Icon from 'react-bootstrap-icons'
import { useHistory } from 'react-router-dom'
import docsearch from 'docsearch.js'
import _ from 'lodash'
import { useQuery } from 'react-query'
import { useTranslation, Trans } from 'react-i18next'

import { auth, cloud, db, http } from '../lib/leancloud'
import { useURLSearchParam } from './utils/hooks'
import CustomField from './components/CustomField'
import TextareaWithPreview from './components/TextareaWithPreview'
import { WeekendWarning } from './components/WeekendWarning'
import Select from './components/Select'
import { useAppContext } from 'modules/context'
import { defaultLeanCloudRegion, getLeanCloudRegionText, getTicketAcl } from '../lib/common'
import { uploadFiles } from './common'
import OrganizationSelect from './OrganizationSelect'
import { DocumentTitle } from './utils/DocumentTitle'
import FAQ from './components/FAQ'
import { useCategories } from './Settings/Categories'
import useTicketForm from './Settings/TicketForm/useTicketForm'

const AssociatedApplication = memo(({ value, onChange }) => {
  const { t } = useTranslation()
  const { addNotification } = useAppContext()
  const { data: apps } = useQuery({
    queryKey: 'newTicket/apps',
    queryFn: () => cloud.run('getLeanCloudApps'),
    retry: false,
    initialData: [],
    onError: (err) => {
      if (err.message.indexOf('code: 1, error: Could not find LeanCloud authData:') === 0) {
        return
      }
      addNotification(err)
    },
  })
  const appOptions = useMemo(
    () =>
      apps.map((app) =>
        defaultLeanCloudRegion === app.region
          ? [app.appId, app.appName]
          : [app.appId, `${app.appName} (${getLeanCloudRegionText(app.region)})`]
      ),
    [apps]
  )
  return (
    <Form.Group>
      <Form.Label>
        {t('associatedApplication')}{' '}
        <OverlayTrigger
          placement="top"
          overlay={<Tooltip id="appTooltip">{t('appTooltip')}</Tooltip>}
        >
          <Icon.QuestionCircleFill />
        </OverlayTrigger>
      </Form.Label>
      <Select value={value} onChange={onChange} options={appOptions} />
    </Form.Group>
  )
})

const useSelectedCategories = () => {
  const { t } = useTranslation()
  const [categoryIds, setCategoryIds] = useState([])
  const { addNotification } = useAppContext()
  const { data: categories } = useCategories({
    onError: addNotification,
    select: undefined, // 不转为树型结构
  })

  useEffect(() => {
    if (localStorage.getItem('ticket:new:categoryIds')) {
      try {
        setCategoryIds(JSON.parse(localStorage.getItem('ticket:new:categoryIds')))
      } catch (error) {
        localStorage.removeItem('ticket:new:categoryIds')
      }
    }
  }, [setCategoryIds])

  const getOptions = useCallback(
    (parentId = '') => {
      return categories
        .filter((category) => category.parent_id === parentId)
        .sort((categoryA, categoryB) => (categoryB.position > categoryA.position ? -1 : 1))
        .map((category) => [category.id, category.name])
    },
    [categories]
  )

  const node = useMemo(() => {
    const reCategoryIds = [...categoryIds, undefined]
    return reCategoryIds.map((categoryId, index) => {
      const options = getOptions(categoryIds[index - 1])
      if (options.length < 1) {
        return null
      }
      return (
        <Form.Group key={index}>
          <Form.Label>
            {index > 0 ? (
              <Trans i18nKey="levelCategory" values={{ level: index + 1 }} />
            ) : (
              t('category')
            )}
          </Form.Label>
          <Select
            required
            options={options}
            value={categoryId}
            onChange={(v) => {
              const newIds = categoryIds.slice(0, index + 1)
              newIds[index] = v
              localStorage.setItem('ticket:new:categoryIds', JSON.stringify(newIds))
              setCategoryIds(newIds)
            }}
          />
        </Form.Group>
      )
    })
  }, [categoryIds, getOptions, t])

  const selectedCategories = useMemo(() => {
    if (categories.length === 0) {
      return []
    }
    return categories
      .filter((category) => categoryIds.includes(category.id))
      .sort((A, B) => categoryIds.indexOf(A.id) - categoryIds.indexOf(B.id))
  }, [categoryIds, categories])

  return [selectedCategories, node]
}

const useContent = (category) => {
  const { t } = useTranslation()
  const [content, setContent] = useState(localStorage.getItem('ticket:new:content') || '')

  useEffect(() => {
    if (
      category &&
      category.template &&
      category.template !== localStorage.getItem('ticket:new:content')
    ) {
      if (confirm(t('categoryChangeConfirm'))) {
        localStorage.setItem('ticket:new:content', category.template)
        setContent(category.template)
      }
    }
  }, [category, t])

  const node = (
    <Form.Group>
      <Form.Label>
        {t('description')}{' '}
        <OverlayTrigger
          placement="top"
          overlay={<Tooltip id="tooltip">{t('supportMarkdown')}</Tooltip>}
        >
          <Icon.Markdown />
        </OverlayTrigger>
      </Form.Label>
      <TextareaWithPreview
        rows="8"
        value={content || ''}
        onChange={(value) => {
          localStorage.setItem('ticket:new:content', value)
          setContent(value)
        }}
      />
    </Form.Group>
  )
  return [content, node]
}

const FAQs = memo(({ categoryId }) => {
  const { t } = useTranslation()
  const { addNotification } = useAppContext()
  const { data } = useQuery({
    queryKey: ['newTicket/faqs', categoryId],
    queryFn: () =>
      db
        .class('Category')
        .include('FAQs')
        .where('objectId', '==', categoryId)
        .select(['FAQs'])
        .limit(1000)
        .find(),
    select: (data) => {
      if (!data) {
        return
      }
      const [firstElement] = data
      return firstElement ? firstElement.get('FAQs') : []
    },
    cacheTime: 10 * 60 * 60,
    onError: (err) => {
      addNotification(err)
    },
  })
  return (
    <Form.Group>
      <Form.Label>{t('FAQ')}</Form.Label>
      {data && data.map((faq) => <FAQ faq={faq} key={faq.id} />)}
    </Form.Group>
  )
})

const useCustomForm = (formId) => {
  const [values, setValues] = useState({})
  const { data } = useTicketForm(formId)
  useEffect(() => {
    setValues({})
  }, [formId])
  const node = useMemo(() => {
    if (!data) {
      return null
    }
    return data.fields.map((field) => {
      const { required, title, type, variants, id } = field
      return (
        <CustomField
          type={type}
          label={title}
          value={values[id]}
          key={id}
          onChange={(value) =>
            setValues((pre) => ({
              ...pre,
              [id]: value,
            }))
          }
          required={!!required}
          options={variants && variants[0] ? variants[0].options : undefined}
        />
      )
    })
  }, [data, values])
  return [values, node]
}

const NewTicket = memo((props) => {
  const { t } = useTranslation()
  const history = useHistory()
  const fileInput = useRef()
  const { organizations, selectedOrgId, handleOrgChange } = props
  const { addNotification } = useAppContext()
  const [urlAppId] = useURLSearchParam('appId')
  const [urlTitle] = useURLSearchParam('title')
  const [selectedCategories, selectedCategoriesNode] = useSelectedCategories()
  const category = useMemo(() => _.last(selectedCategories), [selectedCategories])
  const [title, setTitle] = useState(urlTitle || localStorage.getItem('ticket:new:title') || '')
  const [appId, setAppId] = useState(urlAppId)
  const [content, contentNode] = useContent(category)
  const [loggedIn, setLoggedIn] = useState(false)
  const [formValues, FormNode] = useCustomForm(category ? category.form_id : undefined)
  const [submitting, setSubmitting] = useState(false)

  const FAQCategory = useMemo(
    () => selectedCategories.filter((item) => item.faq_ids && item.faq_ids.length > 0).pop(),
    [selectedCategories]
  )

  useEffect(() => {
    if (ALGOLIA_API_KEY) {
      docsearch({
        apiKey: ALGOLIA_API_KEY,
        indexName: 'leancloud',
        inputSelector: '.docsearch-input',
        debug: false, // Set debug to true if you want to inspect the dropdown
      })
    }
  }, [])

  useQuery({
    queryKey: 'newTicket/permission',
    queryFn: () => cloud.run('checkPermission'),
    retry: false,
    onSuccess: () => setLoggedIn(true),
    onError: (err) => {
      setLoggedIn(false)
      addNotification(err)
    },
  })

  const submit = async () => {
    try {
      setSubmitting(true)
      let fileIds = []
      if (fileInput.current && fileInput.current.files.length > 0) {
        const files = Array.from(fileInput.current.files)
        fileIds = await uploadFiles(files).then((data) => data.map((file) => file.id))
      }
      const ticket = await http.post('/api/2/tickets', {
        title,
        content,
        fileIds,
        categoryId: category.id,
        organizationId: selectedOrgId,
        customFields: _.isEmpty(formValues)
          ? undefined
          : Object.entries(formValues).map(([field, value]) => ({ field, value })),
      })
      // ENABLE_LEANCLOUD_INTEGRATION && loggedIn && appId
      if (appId) {
        await db.class('Tag').add({
          ticket: db.class('Ticket').object(ticket.id),
          key: 'appId',
          value: appId,
          author: auth.currentUser,
          ACL: getTicketAcl(auth.currentUser, selectedOrgId ? { id: selectedOrgId } : undefined),
        })
      }
      setSubmitting(false)
      localStorage.removeItem('ticket:new:content')
      localStorage.removeItem('ticket:new:title')
      history.push('/tickets')
    } catch (error) {
      setSubmitting(false)
      addNotification(error)
    }
  }

  return (
    <div>
      <DocumentTitle title={`${t('newTicket')}`} />
      <WeekendWarning />
      <Form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        {organizations.length > 0 && (
          <OrganizationSelect
            organizations={organizations}
            selectedOrgId={selectedOrgId}
            onOrgChange={handleOrgChange}
          />
        )}
        <Form.Group>
          <Form.Label>{t('title')}</Form.Label>
          <Form.Control
            className="docsearch-input"
            value={title}
            required
            name="title"
            id="title"
            onChange={(e) => {
              const { value } = e.target
              setTitle(value)
              // TODO 加个防抖
              localStorage.setItem('ticket:new:title', e.target.value)
            }}
          />
        </Form.Group>
        {ENABLE_LEANCLOUD_INTEGRATION && loggedIn && (
          <AssociatedApplication value={appId} onChange={setAppId} />
        )}
        {selectedCategoriesNode}
        {FAQCategory && <FAQs categoryId={FAQCategory.id} />}
        {FormNode}
        {contentNode}
        <Form.Group>
          <Form.File id="ticketFile" multiple ref={fileInput} />
        </Form.Group>
        <Button type="submit" variant="success" disabled={submitting}>
          {t('submit')}
        </Button>
      </Form>
    </div>
  )
})

NewTicket.propTypes = {
  organizations: PropTypes.array,
  handleOrgChange: PropTypes.func,
  selectedOrgId: PropTypes.string,
}

export default NewTicket
