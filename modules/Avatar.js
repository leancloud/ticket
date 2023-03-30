import React from 'react'
import PropTypes from 'prop-types'
import { Image } from 'react-bootstrap'
import { getGravatarHash } from '../lib/common'

// or https://www.gravatar.com/avatar
const GRAVATAR_URL = window.GRAVATAR_URL || 'https://gravatar.tapglb.com/avatar'

export function Avatar({ user, height = 16, width = 16 }) {
  const url = React.useMemo(() => {
    const userInfo = user.toJSON ? user.toJSON() : user
    if (userInfo.avatarUrl) {
      return userInfo.avatarUrl
    }
    const hash = userInfo.gravatarHash || getGravatarHash(userInfo.email || userInfo.username)
    return `${GRAVATAR_URL}/${hash}?s=${height * 2}&r=pg&d=identicon`
  }, [user])

  return <Image height={height} width={width} src={url} rounded />
}
Avatar.displayName = 'Avatar'
Avatar.propTypes = {
  user: PropTypes.object.isRequired,
  height: PropTypes.number,
  width: PropTypes.number,
}
