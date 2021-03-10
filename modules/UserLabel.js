import React from 'react'
import { Link } from 'react-router-dom'
import { OverlayTrigger, Tooltip } from 'react-bootstrap'
import PropTypes from 'prop-types'
import moment from 'moment'

import css from './UserLabel.css'
import { Avatar } from './Avatar'
import { getUserDisplayName } from '../lib/common'

const USER_TAG = {
  new: {
    content: 'New',
    tip: 'Registered within 3 months',
  },
  early: {
    content: 'Early',
    tip: 'Registered before 2 years ago',
  },
  vip: {
    content: 'VIP',
  },
}

function getUserTags(user) {
  const tags = []
  if (user.createdAt) {
    const now = moment()
    if (now.diff(user.createdAt, 'month') <= 3) {
      tags.push('new')
    }
    if (now.diff(user.createdAt, 'year') >= 2) {
      tags.push('early')
    }
  }
  return user.tags ? tags.concat(user.tags) : tags
}

function UserTag({ name }) {
  if (!USER_TAG[name]) {
    return <span className={css.tag}>{name}</span>
  }
  const { content, tip } = USER_TAG[name]
  const element = <span className={`${css.tag} ${css[name]}`}>{content}</span>
  if (tip) {
    return (
      <OverlayTrigger placement="bottom" overlay={<Tooltip id={`user-tag-${name}`}>{tip}</Tooltip>}>
        {element}
      </OverlayTrigger>
    )
  }
  return element
}
UserTag.propTypes = {
  name: PropTypes.string.isRequired,
}

export function UserTags({ user }) {
  const tags = getUserTags(user)
  if (tags.length === 0) {
    return null
  }
  return (
    <span>
      {tags.map((tag) => (
        <UserTag key={tag} name={tag} />
      ))}
    </span>
  )
}
UserTags.propTypes = {
  user: PropTypes.object.isRequired,
}

export function UserLabel({ user, simple, displayTags }) {
  const name = getUserDisplayName(user)
  if (simple) {
    return <span>{name}</span>
  }
  return (
    <span>
      <Link to={'/users/' + user.username} className="avatar">
        <Avatar user={user} />
      </Link>
      <Link to={'/users/' + user.username} className="username">
        {name}
      </Link>
      {displayTags && <UserTags user={user} />}
    </span>
  )
}
UserLabel.displayName = 'UserLabel'
UserLabel.propTypes = {
  user: PropTypes.object.isRequired,
  simple: PropTypes.bool,
  displayTags: PropTypes.bool,
}
