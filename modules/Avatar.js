import React from 'react'
import PropTypes from 'prop-types'
import { Image } from 'react-bootstrap'
import { getGravatarHash } from '../lib/common'

export function Avatar({ user, height, width }) {
  const userInfo = user.toJSON ? user.toJSON() : user
  const hash = userInfo.gravatarHash || getGravatarHash(userInfo.email || userInfo.username)
  return (
    <Image
      height={height || 16}
      width={width || 16}
      src={`https://experiments.sparanoid.net/avatar/${hash}?s=${height || 16}&r=pg&d=identicon`}
      
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
