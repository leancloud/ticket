import React from 'react'
import { Card } from 'react-bootstrap'
import PropTypes from 'prop-types'
import * as Icon from 'react-bootstrap-icons'
import style from './CardContainer.module.scss'

export function CardContainer({ onClose, children }) {
  return (
    <Card>
      <Card.Body className="p-3">
        <Icon.X className={style.close} onClick={onClose} />
        {children}
      </Card.Body>
    </Card>
  )
}
CardContainer.propTypes = {
  onClose: PropTypes.func,
  children: PropTypes.element,
}
