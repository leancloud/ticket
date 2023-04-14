import React, { memo, useState, useMemo, useEffect } from 'react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import { Form, Button, Modal } from 'react-bootstrap'
export const AllLocales = [
  'zh-cn',
  'zh-tw',
  'zh-hk',
  'en',
  'ja',
  'ko',
  'id',
  'th',
  'de',
  'fr',
  'ru',
  'es',
  'pt',
  'tr',
  'vi',
]

const defaultSelected = AllLocales.reduce((pre, current) => {
  pre[current] = false
  return pre
}, {})

const LocaleManage = memo(({ close, locales, onUpdated }) => {
  const { t } = useTranslation()
  const [selected, setSelected] = useState(defaultSelected)
  useEffect(() => {
    setSelected((pre) => {
      const tmp = {
        ...pre,
      }
      locales.forEach((locale) => (tmp[locale] = true))
      return tmp
    })
  }, [locales])
  const allSelected = useMemo(() => Object.values(selected).every((v) => v), [selected])
  const noSelected = useMemo(() => Object.values(selected).every((v) => !v), [selected])
  return (
    <>
      <Modal.Header closeButton>
        <Modal.Title>{t('ticketField.locale')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form
          id="localeManage"
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (noSelected) {
              return
            }
            const selectedLocales = Object.keys(selected).filter((locale) => selected[locale])
            onUpdated(selectedLocales)
            close()
          }}
        >
          <Form.Check
            className="mb-1"
            custom
            type="checkbox"
            id="selectAll"
            checked={allSelected}
            onChange={() => {
              setSelected((pre) => {
                const tmp = {
                  ...pre,
                }
                AllLocales.forEach((locale) => (tmp[locale] = !allSelected))
                return tmp
              })
            }}
            label={t('selectAll')}
          />
          {AllLocales.map((locale) => {
            return (
              <Form.Check
                className="mb-1"
                key={locale}
                custom
                type="checkbox"
                id={locale}
                checked={selected[locale]}
                onChange={() => {
                  setSelected((pre) => ({
                    ...pre,
                    [locale]: !selected[locale],
                  }))
                }}
                label={t(`locale.${locale}`)}
              />
            )
          })}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button className="mr-2" variant="secondary" onClick={close}>
          {t('cancel')}
        </Button>
        <Button variant="primary" type="submit" form="localeManage" disabled={noSelected}>
          {t('confirm')}
        </Button>
      </Modal.Footer>
    </>
  )
})

LocaleManage.propTypes = {
  close: PropTypes.func.isRequired,
  locales: PropTypes.array.isRequired,
  onUpdated: PropTypes.func.isRequired,
}

export default LocaleManage
