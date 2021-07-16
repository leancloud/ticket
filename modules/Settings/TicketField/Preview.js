import React, { memo, useState } from 'react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import { Form, Modal, Button } from 'react-bootstrap'
import CustomField from 'modules/components/CustomField'

function PreviewContent({ close, params }) {
  const { t } = useTranslation()
  const { type, variant } = params
  const [value, setValue] = useState()
  return (
    <>
      <Modal.Header closeButton>
        <Modal.Title>{t('preview')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <CustomField
            value={value}
            onChange={setValue}
            type={type}
            label={variant ? variant.title : ''}
            options={variant ? variant.options : undefined}
          />
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
  params: PropTypes.object.isRequired,
}
export default memo(PreviewContent)
