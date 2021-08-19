import React from 'react'
import PropTypes from 'prop-types'

const AROUND_LENGTH = 40
const OVERFLOW = '...'

/**
 * @param {object} props
 * @param {string} props.content
 * @param {string} props.searchString
 */
export function BlodSearchString({ content, searchString }) {
  const index = content.indexOf(searchString)
  if (index < 0) {
    return null
  }

  let before = content.slice(0, index)
  if (before.length > AROUND_LENGTH) {
    before = OVERFLOW + before.slice(before.length - AROUND_LENGTH)
  }

  let after = content.slice(index + searchString.length)
  if (after.length > AROUND_LENGTH) {
    after = after.slice(0, AROUND_LENGTH) + OVERFLOW
  }

  return (
    <div>
      {before}
      <b>{searchString}</b>
      {after}
    </div>
  )
}
BlodSearchString.propTypes = {
  content: PropTypes.string.isRequired,
  searchString: PropTypes.string.isRequired,
}
