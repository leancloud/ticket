import React, {
  memo,
  isValidElement,
  cloneElement,
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react'
import PropTypes from 'prop-types'
import { Button, Modal } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import styles from './index.module.scss'

const ConfirmModal = memo((props) => {
  const mountedRef = useRef(false)
  const { t } = useTranslation()
  const [disabled, setDisabled] = useState(false)
  const { show, close, confirmButtonText, danger, header, content, onConfirm, onCancel } = props

  useEffect(() => {
    mountedRef.current = true
    return () => {
      setDisabled(false)
      mountedRef.current = false
    }
  }, [])

  const cancel = useCallback(() => {
    close()
    if (onCancel) {
      onCancel()
    }
  }, [onCancel, close])

  const confirm = useCallback(async () => {
    if (!onConfirm) {
      close()
    } else {
      setDisabled(true)
      return new Promise((resolve) => resolve(onConfirm()))
        .then(() => {
          if (mountedRef.current) {
            setDisabled(false)
            close()
          }
          return
        })
        .catch((error) => {
          console.log(error)
        })
    }
  }, [onConfirm, close])
  return (
    <Modal show={show} onHide={cancel} className={styles.confirm}>
      {header && (
        <Modal.Header>
          <Modal.Title as="h5">{header}</Modal.Title>
        </Modal.Header>
      )}
      {content && <Modal.Body>{content}</Modal.Body>}
      <Modal.Footer>
        <Button onClick={close} autoFocus={danger} variant="outline-primary">
          {t('cancel')}
        </Button>
        <Button onClick={confirm} disabled={disabled} variant={danger ? 'danger' : 'primary'}>
          {confirmButtonText || t('confirm')}
        </Button>
      </Modal.Footer>
    </Modal>
  )
})
const Confirm = memo(({ trigger, ...rest }) => {
  const [show, setShow] = useState(false)
  const open = useCallback(() => setShow(true), [])
  const close = useCallback(() => {
    setShow(false)
  }, [setShow])
  if (isValidElement(trigger)) {
    const reTrigger = cloneElement(trigger, {
      onClick: open,
    })
    return (
      <React.Fragment>
        {reTrigger}
        <ConfirmModal show={show} close={close} {...rest} />
      </React.Fragment>
    )
  }
  return null
})

ConfirmModal.prototype = {
  show: PropTypes.bool.isRequired,
  close: PropTypes.func.isRequired,

  confirmButtonText: PropTypes.string,
  danger: PropTypes.bool,
  header: PropTypes.node,
  content: PropTypes.node,
  onConfirm: PropTypes.func,
  onCancel: PropTypes.func,
}

Confirm.propTypes = {
  trigger: PropTypes.node.isRequired,
  confirmButtonText: PropTypes.string,
  danger: PropTypes.bool,
  header: PropTypes.node,
  content: PropTypes.node,
  onConfirm: PropTypes.func,
  onCancel: PropTypes.func,
}

export default Confirm
