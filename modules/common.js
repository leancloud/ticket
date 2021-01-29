import React from 'react'
import PropTypes from 'prop-types'
import {Link} from 'react-router'
import _ from 'lodash'
import {auth, db, storage} from '../lib/leancloud'
import {depthFirstSearchFind, getUserDisplayName, makeTree, getUserTags} from '../lib/common'
import {UserTagGroup} from './components/UserTag'
import {Avatar} from './Avatar'

export * from '../lib/common'

export const getCategoryPathName = (category, categoriesTree, t) => {
  const c = depthFirstSearchFind(categoriesTree, c => c.id == (category.id || category.objectId))
  return getNodePath(c).map(c => getCategoryName(c, t)).join(' / ')
}

export const requireAuth = (nextState, replace) => {
  if (!auth.currentUser()) {
    replace({
      pathname: '/login',
      state: { nextPathname: nextState.location.pathname }
    })
  }
}

export const requireCustomerServiceAuth = (nextState, replace, next) => {
  isCustomerService(auth.currentUser())
    .then(isCustomerService => {
      if (!isCustomerService) {
        replace({
          pathname: '/error',
          state: { code: 'requireCustomerServiceAuth' }
        })
      }
      return next()
    })
    .catch(err => {
      replace({
        pathname: '/error',
        state: { code: err.code, err }
      })
      next()
    })
}

export const getCustomerServices = () => {
  return auth.queryRole()
    .where('name', '==', 'customerService')
    .first()
    .then(role => {
      return role
        .queryUser()
        .orderBy('username')
        .find()
    })
}

export const isCustomerService = user => {
  if (!user) {
    return Promise.resolve(false)
  }
  return auth.queryRole()
    .where('name', '==', 'customerService')
    .where('users', '==', user)
    .first()
    .then(role => {
      return !!role
    })
}

export const uploadFiles = files => {
  return Promise.all(
    _.map(files, file =>
      storage.upload(file.name, file)
    )
  )
}

export const getTicketAndRelation = nid => {
  return db.class('Ticket')
    .where('nid', '==', parseInt(nid))
    .include('author', 'files')
    .first()
    .then(ticket => {
      if (!ticket) {
        return
      }
      return Promise.all([
        db.class('Reply')
          .where('ticket', ticket)
          .include('author', 'files')
          .orderBy('createdAt')
          .find(),
        db.class('OpsLog')
          .where('ticket', '==', ticket)
          .orderBy('createdAt')
          .find()
      ]).spread((replies, opsLogs) => {
        return { ticket, replies, opsLogs }
      })
    })
}

export const fetchUsers = (userIds) => {
  return Promise.all(_.map(_.chunk(userIds, 50), (userIds) => {
    return auth.queryUser()
      .where('objectId', 'in', userIds)
      .find()
  }))
  .then(_.flatten)
}

export const UserLabel = (props) => {
  if (!props.user) {
    return <span>data err</span>
  }
  const username =
    props.user.username ||
    (props.user.get ? props.user.get('username') : undefined)
  const name = props.user.name || getUserDisplayName(props.user) || username

  if (props.simple) {
    return <span>{name}</span>
  }

  return (
    <span>
      <Link to={'/users/' + username} className="avatar">
        <Avatar user={props.user} />
      </Link>
      <Link to={'/users/' + username} className="username">
        {name}
      </Link>
      {props.displayTags && <UserTagGroup tags={getUserTags(props.user)} />}
    </span>
  )
}
UserLabel.displayName = 'UserLabel'
UserLabel.propTypes = {
  user: PropTypes.object,
  simple: PropTypes.bool,
  displayTags: PropTypes.bool
}

export const getCategoriesTree = (hiddenDisable = true) => {
  const query = db.class('Category')
    .where({
      deletedAt: hiddenDisable ? db.cmd.notExists() : undefined
    })
  return query
    .orderBy('createdAt', 'desc')
    .find()
    .then(categories => {
      return makeTree(categories)
    })
    .catch(err => {
      // 如果还没有被停用的分类，deletedAt 属性可能不存在
      if (err.code == 700 && err.message.includes('deletedAt')) {
        return getCategoriesTree(false)
      }
      throw err
    })
}

const getNodeDepth = obj => {
  if (!obj.parent) {
    return 0
  }
  return 1 + getNodeDepth(obj.parent)
}

export const getNodePath = obj => {
  if (!obj.parent) {
    return [obj]
  }
  const result = getNodePath(obj.parent)
  result.push(obj)
  return result
}

export const getNodeIndentString = treeNode => {
  const depth = getNodeDepth(treeNode)
  return depth == 0 ? '' : '　'.repeat(depth) + '└ '
}

export const getCategoryName = (category, t) => {
  return category.get('name') + (category.get('deletedAt') ? t('disabled') : '')
}

export const isCN = () => {
  return window.location.hostname.endsWith('.cn')
}
