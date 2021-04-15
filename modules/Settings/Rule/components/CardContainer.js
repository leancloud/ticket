import React from 'react'
import { Card } from 'react-bootstrap'
import PropTypes from 'prop-types'

import style from './CardContainer.module.scss'

export function CardContainer({ onClose, children }) {
  return (
    <Card>
      <Card.Body className="p-3">
        <i className={`bi bi-x ${style.close}`} onClick={onClose}></i>
        {children}
      </Card.Body>
    </Card>
  )
}
CardContainer.propTypes = {
  onClose: PropTypes.func,
  children: PropTypes.element,
}
