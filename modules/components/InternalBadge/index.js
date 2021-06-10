import React from 'react'
import { Badge, OverlayTrigger, Tooltip } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'

export const InternalBadge = (props) => {
  const { t } = useTranslation()
  return (
    <OverlayTrigger placement="top" overlay={<Tooltip>{t('internalTip')}</Tooltip>}>
      <Badge variant="secondary" {...props}>Internal</Badge>
    </OverlayTrigger>
  )
}
