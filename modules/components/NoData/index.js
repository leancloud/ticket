import React from 'react'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import classNames from 'classnames'
import styles from './index.module.scss'

const NoData = React.memo((props) => {
  const { t } = useTranslation()
  const { info = t('noData'), extra, className } = props
  return (
    <div className={classNames(styles.noData, 'text-muted', className)}>
      <p className={styles.info}> {info}</p>
      {extra}
    </div>
  )
})

export default NoData
export const NoDataRow = React.memo((props) => (
  <tr disabled>
    <td colSpan="999">
      <NoData {...props} />
    </td>
  </tr>
))

NoDataRow.propTypes = NoData.propTypes = {
  info: PropTypes.string,
  extra: PropTypes.node,
  className: PropTypes.string,
}
