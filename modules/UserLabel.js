import React, { useState, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Overlay, OverlayTrigger, Popover as BootstrapPopover, Tooltip } from 'react-bootstrap'
import PropTypes from 'prop-types'
import moment from 'moment'
import { throttle } from 'lodash'

import css from './UserLabel.css'
import { Avatar } from './Avatar'
import { getUserDisplayName } from '../lib/common'
import { getConfig } from './config'

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
  const createdAt = user.createdAt || user.created_at
  if (createdAt) {
    const now = moment()
    if (now.diff(createdAt, 'month') <= 3) {
      tags.push('new')
    }
    if (now.diff(createdAt, 'year') >= 2) {
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

export function UserTags({ user, className }) {
  const tags = getUserTags(user)
  if (tags.length === 0) {
    return null
  }
  return (
    <span className={className}>
      {tags.map((tag) => (
        <UserTag key={tag} name={tag} />
      ))}
    </span>
  )
}
UserTags.propTypes = {
  user: PropTypes.object.isRequired,
  className: PropTypes.string,
}

const Popover = ({ children, overlay, placement = 'bottom', ...props }) => {
  const [show, setShow] = useState(false)
  const target = useRef(null)

  const throttledSetShow = useMemo(() => throttle(setShow, 250, { leading: false }), [])

  const handleMouseOver = (event) => {
    !show && (target.current = event.target)
    throttledSetShow(true)
  }

  const handleMouseLeave = () => {
    throttledSetShow(false)
  }

  const handleOverlayMouseEnter = () => {
    throttledSetShow(true)
  }

  const handleOverlayMouseLeave = () => {
    throttledSetShow(false)
  }

  return (
    <>
      <span onMouseOver={handleMouseOver} onMouseLeave={handleMouseLeave} ref={target} {...props}>
        {children}
      </span>
      <Overlay
        target={target.current}
        show={show}
        placement={placement}
        flip={true}
        transition={false}
      >
        {(props) =>
          overlay && (
            <BootstrapPopover
              onMouseEnter={handleOverlayMouseEnter}
              onMouseLeave={handleOverlayMouseLeave}
              {...props}
            >
              <BootstrapPopover.Content>{overlay}</BootstrapPopover.Content>
            </BootstrapPopover>
          )
        }
      </Overlay>
    </>
  )
}
Popover.propTypes = {
  placement: PropTypes.string,
  overlay: PropTypes.node.isRequired,
  children: PropTypes.node.isRequired,
}

const isGenaratedName = (name) => /^[0-9a-z]{25}$/.test(name)
export function UserLabel({ user, simple, displayTags, displayId }) {
  const name = getUserDisplayName(user)
  const { overlay: UserLabelOverlay } =
    getConfig('ticket.metadata.customMetadata.userLabelOverlay') ?? {}

  if (simple) {
    return <span>{name}</span>
  }

  return (
    <span>
      <Popover
        overlay={UserLabelOverlay ? <UserLabelOverlay user={user} /> : false}
        placement="bottom"
        id={`popover-${name}`}
      >
        <Link to={'/users/' + user.username} className="avatar">
          <Avatar user={user} />
        </Link>
        <Link to={'/users/' + user.username} className="username">
          {name}
        </Link>
      </Popover>
      {displayId && name !== user.username && !isGenaratedName(user.username) && (
        <span className="text-muted"> ({user.username})</span>
      )}
      {displayTags && <UserTags user={user} />}
    </span>
  )
}
UserLabel.displayName = 'UserLabel'
UserLabel.propTypes = {
  user: PropTypes.object.isRequired,
  simple: PropTypes.bool,
  displayTags: PropTypes.bool,
  displayId: PropTypes.bool,
}
