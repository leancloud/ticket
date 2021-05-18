import React from 'react'
import PropTypes from 'prop-types'
import moment from 'moment'

export function Time({ value, href }) {
  if (!moment.isMoment(value)) {
    value = moment(value)
  }
  if (moment().diff(value) > 86400000) {
    return (
      <a className="timestamp" href={href} title={value.format()}>
        {value.calendar()}
      </a>
    )
  } else {
    return (
      <a className="timestamp" href={href} title={value.format()}>
        {value.fromNow()}
      </a>
    )
  }
}
Time.propTypes = {
  value: PropTypes.any.isRequired,
  href: PropTypes.string,
}
