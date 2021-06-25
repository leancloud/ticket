import React, { memo } from 'react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import { Form, Modal, Button } from 'react-bootstrap'
import NoData from 'modules/components/NoData'
import CustomField from '../TicketField/CustomField'

function PreviewContent({ close, data }) {
  const { t } = useTranslation()
  return (
    <>
      <Modal.Header closeButton>
        <Modal.Title>{t('preview')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          {data.length === 0 ? (
            <NoData info={t('ticketForm.filedRequired')} />
          ) : (
            data.map((field) => {
              return <CustomField type={field.type} label={field.title} key={field.id} />
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
