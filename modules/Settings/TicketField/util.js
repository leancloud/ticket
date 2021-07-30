import React, { memo } from 'react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import { Badge } from 'react-bootstrap'
import * as Icon from 'react-bootstrap-icons'
import { fieldType } from 'modules/components/CustomField'
import styles from './index.module.scss'

const fieldIconMap = {
  text: Icon.Fonts, // text-height
  'multi-line': Icon.TextLeft,
  checkbox: Icon.CheckSquare,
  dropdown: Icon.ChevronDown,
  'multi-select': Icon.ListCheck, // th-list
  radios: Icon.UiRadiosGrid,
  file: Icon.FileText,
}
export const CustomFieldLabel = memo(({ type }) => {
  const { t } = useTranslation()
  const TypeIcon = fieldIconMap[type]
  return (
    <div className={`d-flex flex-column align-items-center ${styles.radio}`}>
      <TypeIcon className={styles.icon} />
      <span className="mt-2">{t(`ticketField.type.${type}`)}</span>
    </div>
  )
})
CustomFieldLabel.propTypes = {
  type: PropTypes.oneOf(fieldType).isRequired,
}
export const DisplayCustomField = memo(({ type }) => {
  const { t } = useTranslation()
  return (
    <p>
      <Badge variant="info" className={styles.displayType}>
        {t(`ticketField.type.${type}`)}
      </Badge>
    </p>
  )
})
DisplayCustomField.propTypes = {
  type: PropTypes.oneOf(fieldType).isRequired,
}
