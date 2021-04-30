import React from 'react'
import { ProgressBar, Table } from 'react-bootstrap'
import PropTypes from 'prop-types'
import classnames from 'classnames'
import styles from './index.module.scss'
const Loader = React.memo(() => (
  <div className={styles.loadingOverlay}>
    <ProgressBar animated now={100} variant="info" className={styles.loader} />
  </div>
))

const _Table = (props) => {
  const { loading, ...rest } = props
  return (
    <div
      className={classnames(styles.container, {
        [styles.loading]: loading,
      })}
    >
      <Table {...rest} />
      {loading && <Loader />}
    </div>
  )
}
_Table.propTypes = {
  loading: PropTypes.bool,
  bsPrefix: PropTypes.string,
  striped: PropTypes.bool,
  bordered: PropTypes.bool,
  borderless: PropTypes.bool,
  hover: PropTypes.bool,
  size: PropTypes.string,
  variant: PropTypes.string,
  responsive: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
}

export default Object.assign(_Table, Table)
