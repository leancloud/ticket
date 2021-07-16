import React, { memo, useState } from 'react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import { Form, Modal, Button } from 'react-bootstrap'
import NoData from 'modules/components/NoData'
import CustomField from 'modules/components/CustomField'

function PreviewContent({ close, data }) {
  const { t } = useTranslation()
  const [values, setValues] = useState({})
  return (
    <>
      <Modal.Header closeButton>
        <Modal.Title>{t('preview')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          {data.length === 0 ? (
            <NoData info={t('ticketTemplate.fieldRequired')} />
          ) : (
            data.map((field) => {
              const variant = field.variant
              return (
                <CustomField
                  value={values[field.id]}
                  onChange={(value) => {
                    setValues((pre) => {
                      return {
                        ...pre,
                        [field.id]: value,
                      }
                    })
                  }}
                  type={field.type}
                  label={field.title}
                  key={field.id}
                  options={variant ? variant.options : undefined}
                />
              )
            })
          )}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={close} variant="outline-primary">
          {t('close')}
        </Button>
      </Modal.Footer>
    </>
  )
}
PreviewContent.propTypes = {
  close: PropTypes.func.isRequired,
  data: PropTypes.array.isRequired,
}
export default memo(PreviewContent)
