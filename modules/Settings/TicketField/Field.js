import React, { memo, useState, useMemo, useCallback, useEffect } from 'react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import { Form, Button, Modal, Dropdown, Breadcrumb, Col } from 'react-bootstrap'
import { Link, useHistory } from 'react-router-dom'
import * as Icon from 'react-bootstrap-icons'
import { useMutation, useQuery } from 'react-query'
import { DocumentTitle } from 'modules/utils/DocumentTitle'
import { RadioGroup } from 'modules/components/Radio'
import Divider from 'modules/components/Divider'
import { fieldType, includeOptionsType } from 'modules/components/CustomField'
import { useAppContext } from 'modules/context'
import _ from 'lodash'
import Preview from './Preview'
import { CustomFieldLabel, DisplayCustomField } from './util'
import LocaleManage, { AllLocales } from './LocaleManage'
import { http } from 'lib/leancloud'
import { useFieldId } from '.'
import styles from './index.module.scss'

const defaultOption = {
  title: '',
  value: '',
}
const defaultOptions = [defaultOption]
const DropdownOptions = memo(({ options = defaultOptions, onChange }) => {
  const { t } = useTranslation()
  const sameTagIndexes = useMemo(() => {
    const result = []
    const map = new Map()
    options.forEach(({ title }, index) => {
      if (title !== '') {
        if (map.has(title)) {
          result.push(map.get(title))
          result.push(index)
        } else {
          map.set(title, index)
        }
      }
    })
    return result
  }, [options])

  const reOptions = useMemo(() => {
    if (options.length === 0) {
      return defaultOptions
    } else {
      if (_.last(options).value !== '') {
        return [...options, defaultOption]
      }
      return options
    }
  }, [options])

  return (
    <Form.Group>
      <Form.Label>{t('ticketField.options')}</Form.Label>
      {reOptions.map((option, index) => {
        const duplicateTag = sameTagIndexes.includes(index)
        const isLast = index === reOptions.length - 1
        const required = reOptions.length === 1 ? true : !isLast
        const { value, title } = option
        return (
          <Form.Row key={index}>
            <Form.Group as={Col}>
              <Form.Control
                type="text"
                placeholder="value"
                value={value || ''}
                required={!!title || required}
                onChange={(e) => {
                  const inputValue = e.target.value
                  const tmp = [...options]
                  tmp[index] = {
                    title: title === value ? inputValue : title,
                    value: inputValue,
                  }
                  onChange(tmp)
                }}
              />
            </Form.Group>
            <Form.Group as={Col}>
              <Form.Control
                type="text"
                placeholder="title"
                value={title || ''}
                required={!!value || required}
                onChange={(e) => {
                  const tmp = [...options]
                  tmp[index] = {
                    title: e.target.value,
                    value,
                  }
                  onChange(tmp)
                }}
                isInvalid={duplicateTag}
              />
              <Form.Control.Feedback type="invalid">
                {t('ticketField.options.titleHint')}
              </Form.Control.Feedback>
            </Form.Group>
            <Col className={styles.removeBtn}>
              {!isLast && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => {
                    if (value.length > 0) {
                      onChange(
                        options.filter((value, i) => {
                          return i !== index
                        })
                      )
                    }
                  }}
                >
                  <Icon.XCircle size={20} />
                </Button>
              )}
            </Col>
          </Form.Row>
        )
      })}
    </Form.Group>
  )
})

DropdownOptions.propTypes = {
  options: PropTypes.array,
  onChange: PropTypes.func.isRequired,
}

const DEFAULT_LOCALE = AllLocales[0]
const FieldForm = memo(({ onSubmit, initData, submitting }) => {
  const { t } = useTranslation()
  const { addNotification } = useAppContext()
  const [previewModalActive, setPreviewModalActive] = useState(false)
  const [localeModalActive, setLocaleModalActive] = useState(false)
  const [locales, setLocales] = useState([DEFAULT_LOCALE])
  const [activeLocale, setActiveLocale] = useState(DEFAULT_LOCALE)
  const [defaultLocale, setDefaultLocale] = useState(DEFAULT_LOCALE)

  const [title, setTitle] = useState()
  const [type, setType] = useState('text')
  const [required, setRequired] = useState(false)
  const [variants, setVariants] = useState({})

  useEffect(() => {
    if (initData && initData.title) {
      setTitle(initData.title)
      setType(initData.type)
      setRequired(initData.required)
      setVariants(initData.variants)
      setDefaultLocale(initData.default_locale)
      setLocales(Object.keys(initData.variants))
    }
  }, [initData])

  useEffect(() => {
    setVariants((pre) => {
      const newVariants = {}
      locales.map((locale) => {
        newVariants[locale] = pre[locale]
      })
      return newVariants
    })
  }, [locales])

  useEffect(() => {
    if (!locales.includes(activeLocale)) {
      setActiveLocale(locales[0] || DEFAULT_LOCALE)
    }
  }, [locales, activeLocale])

  // 必须包含默认语言
  useEffect(() => {
    if (!locales.includes(defaultLocale)) {
      setDefaultLocale(locales[0] || DEFAULT_LOCALE)
    }
  }, [locales, defaultLocale])

  const updateVariant = useCallback(
    (params) => {
      setVariants((pre) => ({
        ...pre,
        [activeLocale]: {
          ...pre[activeLocale],
          ...params,
        },
      }))
    },
    [activeLocale]
  )

  const closePreview = useCallback(() => setPreviewModalActive(false), [])
  const closeLocaleManage = useCallback(() => setLocaleModalActive(false), [])

  const errorLocales = useMemo(() => {
    if (!type) {
      return []
    }
    return locales.filter((locale) => {
      const { title, options } = variants[locale] || {}
      if (!title) {
        return true
      }
      if (includeOptionsType.includes(type) && (!options || options.length === 0)) {
        return true
      }
      return false
    })
  }, [locales, variants, type])

  return (
    <>
      <Form
        onSubmit={(e) => {
          e.preventDefault()
          if (errorLocales.length < 1) {
            onSubmit({
              title,
              type,
              required,
              defaultLocale,
              variants: includeOptionsType.includes(type)
                ? variants
                : _.mapValues(variants, (v) => _.omit(v, 'options')),
            })
          } else {
            addNotification({
              message: t('ticketField.locale.required'),
              level: 'error',
            })
          }
        }}
      >
        <Form.Group>
          <Form.Label htmlFor="title">{t('name')}</Form.Label>
          <Form.Control
            required
            id="title"
            name="title"
            type="text"
            value={title || ''}
            onChange={(e) => {
              const { value } = e.target
              setTitle(value)
            }}
          />
        </Form.Group>
        <Form.Group>
          <Form.Label htmlFor="type">{t('type')}</Form.Label>
          {!initData && (
            <RadioGroup
              id="type"
              required
              name="type"
              value={type}
              onChange={setType}
              radios={fieldType.map((value) => {
                return {
                  value,
                  label: <CustomFieldLabel type={value} />,
                }
              })}
            />
          )}
          {initData && type && <DisplayCustomField type={type} />}
        </Form.Group>
        <Form.Group>
          <Form.Label htmlFor="required">{t('ticketField.required')}</Form.Label>
          <div>
            <Form.Check
              type="radio"
              name="required"
              checked={!required}
              id="no"
              label={t('ticketField.required.no')}
              inline
              onChange={() => setRequired(false)}
            />
            <Form.Check
              className="ml-2"
              type="radio"
              name="required"
              id="yes"
              checked={required}
              label={t('ticketField.required.yes')}
              inline
              onChange={() => setRequired(true)}
            />
          </div>
        </Form.Group>
        <Form.Group>
          <Form.Label>{t('ticketField.locale')}</Form.Label>
          <div className={styles.localeSelect}>
            <Dropdown className="mr-2">
              <Dropdown.Toggle id="dropdown-basic" className={styles.select} variant="default">
                {t(`locale.${activeLocale}`)}
              </Dropdown.Toggle>
              <Dropdown.Menu>
                {locales.map((locale) => {
                  const isDefault = defaultLocale === locale
                  const hasError = errorLocales.includes(locale)
                  return (
                    <Dropdown.Item
                      as="span"
                      key={locale}
                      className={styles.item}
                      onClick={() => setActiveLocale(locale)}
                    >
                      <span className={styles.content}>
                        {hasError && <Icon.ExclamationCircle className={'text-warning mr-1'} />}
                        {!hasError && <Icon.Check className={'text-success mr-1'} />}
                        {t(`locale.${locale}`)}
                      </span>

                      {isDefault && (
                        <span className={styles.default}>{t('ticketField.default')}</span>
                      )}

                      {!isDefault && (
                        <span
                          className={`${styles.default} ${styles.defaultBtn}`}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setDefaultLocale(locale)
                          }}
                        >
                          {t('ticketField.setDefault')}
                        </span>
                      )}
                    </Dropdown.Item>
                  )
                })}
              </Dropdown.Menu>
            </Dropdown>
            <Button variant="link" size="sm" onClick={() => setLocaleModalActive(true)}>
              <Icon.Plus className={styles.plus} /> {t('ticketField.locale.switch')}
            </Button>
          </div>
        </Form.Group>
        <Divider />
        <Form.Group>
          <Form.Label htmlFor="name">{t('ticketField.name')}</Form.Label>
          <Form.Control
            required
            id="name"
            name="name"
            type="text"
            value={_.get(variants, `${activeLocale}.title`, '')}
            onChange={(e) => {
              const { value } = e.target
              updateVariant({
                title: value,
              })
            }}
          />
        </Form.Group>
        <Form.Group>
          <Form.Label htmlFor="fieldDesc">{t('description')}</Form.Label>
          <Form.Control
            required
            id="fieldDesc"
            name="fieldDesc"
            type="text"
            value={_.get(variants, `${activeLocale}.description`, '')}
            onChange={(e) => updateVariant({ description: e.target.value })}
          />
        </Form.Group>
        {includeOptionsType.includes(type) && (
          <DropdownOptions
            options={variants[activeLocale] ? variants[activeLocale].options : undefined}
            onChange={(options) =>
              updateVariant({
                options,
              })
            }
          />
        )}
        <div className="d-flex mt-4">
          <Button
            variant="secondary"
            className="mr-auto"
            disabled={!type}
            onClick={() => setPreviewModalActive(true)}
          >
            {t('preview')}
          </Button>
          <Link to="/settings/ticketField">
            <Button className="mr-2" variant="outline-primary">
              {t('cancel')}
            </Button>
          </Link>
          <Button type="submit" variant="primary" disabled={submitting}>
            {t('save')}
          </Button>
        </div>
      </Form>
      <Modal show={previewModalActive} onHide={closePreview}>
        {previewModalActive && (
          <Preview
            close={closePreview}
            params={{
              type,
              variant: variants[activeLocale],
            }}
          />
        )}
      </Modal>
      <Modal show={localeModalActive} onHide={closeLocaleManage}>
        {localeModalActive && (
          <LocaleManage locales={locales} onUpdated={setLocales} close={closeLocaleManage} />
        )}
      </Modal>
    </>
  )
})

FieldForm.propTypes = {
  initData: PropTypes.object,
  onSubmit: PropTypes.func.isRequired,
  submitting: PropTypes.bool,
}

const AddField = memo(() => {
  const { t } = useTranslation()
  const history = useHistory()
  const { addNotification } = useAppContext()
  const { mutateAsync, isLoading } = useMutation({
    mutationFn: (data) => http.post('/api/2/ticket-fields', data),
    onSuccess: () => {
      addNotification({
        message: t('ticketField.success'),
      })
      history.push('/settings/ticketField')
    },
    onError: (err) => addNotification(err),
  })

  return (
    <>
      <DocumentTitle title={`${t('ticketField.add')}`} />
      <Breadcrumb>
        <Breadcrumb.Item linkProps={{ to: '/settings/ticketField' }} linkAs={Link}>
          {t('ticketField.list')}
        </Breadcrumb.Item>
        <Breadcrumb.Item active>{t('ticketField.add')}</Breadcrumb.Item>
      </Breadcrumb>
      <FieldForm onSubmit={mutateAsync} submitting={isLoading} />
    </>
  )
})

const EditorField = memo(() => {
  const { t } = useTranslation()
  const { addNotification } = useAppContext()
  const fieldId = useFieldId()
  const { data } = useQuery({
    queryKey: ['ticketField', fieldId],
    queryFn: () => http.get(`/api/2/ticket-fields/${fieldId}`),
    onError: (err) => addNotification(err),
  })

  const { mutateAsync, isLoading } = useMutation({
    mutationFn: (data) => http.patch(`/api/2/ticket-fields/${fieldId}`, data),
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
        <Breadcrumb.Item linkProps={{ to: '/settings/ticketField' }} linkAs={Link}>
          {t('ticketField.list')}
        </Breadcrumb.Item>
        <Breadcrumb.Item active>{fieldId}</Breadcrumb.Item>
      </Breadcrumb>
      <FieldForm initData={data} onSubmit={mutateAsync} submitting={isLoading} />
    </>
  )
})

export { AddField, EditorField }
