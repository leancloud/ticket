import React from 'react'
import PropTypes from 'prop-types'
import moment from 'moment'

export function Time({ value, href }) {
  if (!moment.isMoment(value)) {
    value = moment(value)
  }
  const diff = moment().diff(value)
  const diffDays = moment().dayOfYear() - value.dayOfYear()
  const sameYear = moment().year() === value.year()

  const display =
    diff < 3600000 * 21.5
      ? value.fromNow()
      : diffDays === 1
      ? value.calendar()
      : sameYear
      ? value.format('MM-DD LT')
      : value.format('lll')
  const Component = href ? 'a' : 'span'
  return (
    <Component className="timestamp" href={href} title={value.format('llll')}>
      {display}
    </Component>
  )
}
Time.propTypes = {
  value: PropTypes.any.isRequired,
  href: PropTypes.string,
}
