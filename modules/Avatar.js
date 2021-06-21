import React from 'react'
import PropTypes from 'prop-types'
import { Image } from 'react-bootstrap'
import { getGravatarHash } from '../lib/common'

// or https://www.gravatar.com/avatar
const GRAVATAR_URL = window.GRAVATAR_URL || 'https://gravatar.tapglb.com/avatar'

export function Avatar({ user, height = 16, width = 16 }) {
  const userInfo = user.toJSON ? user.toJSON() : user
  const hash = userInfo.gravatarHash || getGravatarHash(userInfo.email || userInfo.username)
  return (
    <Image
      height={height}
      width={width}
      src={`${GRAVATAR_URL}/${hash}?s=${height * 2}&r=pg&d=identicon`}
      rounded
    />
  )
}
Avatar.displayName = 'Avatar'
Avatar.propTypes = {
  user: PropTypes.object.isRequired,
  height: PropTypes.string,
  width: PropTypes.string,
}
