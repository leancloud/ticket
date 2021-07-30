import React from 'react'
import PropTypes from 'prop-types'
import styles from './index.css'
export default function Divider({ inline }) {
  return <span className={inline ? styles.inlineDivider : styles.divider} />
}

Divider.propTypes = {
  inline: PropTypes.bool,
}
