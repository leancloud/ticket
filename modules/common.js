import React from 'react'
import PropTypes from 'prop-types'
import {Link} from 'react-router'
import {Image} from 'react-bootstrap'
import _ from 'lodash'
import {auth, db, storage} from '../lib/leancloud'
import {depthFirstSearchFind, getUserDisplayName, makeTree, getUserTags} from '../lib/common'
import {UserTagGroup} from './components/UserTag'

Object.assign(exports, require('../lib/common'))

exports.getCategoryPathName = (category, categoriesTree, t) => {
  const c = depthFirstSearchFind(categoriesTree, c => c.id == (category.id || category.objectId))
  return exports.getNodePath(c).map(c => exports.getCategoryName(c, t)).join(' / ')
}

exports.requireAuth = (nextState, replace) => {
  if (!auth.currentUser()) {
    replace({
      pathname: '/login',
      state: { nextPathname: nextState.location.pathname }
    })
  }
}

exports.requireCustomerServiceAuth = (nextState, replace, next) => {
  exports
    .isCustomerService(auth.currentUser())
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

exports.getCustomerServices = () => {
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

exports.isCustomerService = user => {
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

exports.uploadFiles = files => {
  return Promise.all(
    _.map(files, file =>
      storage.upload(file.name, file)
    )
  )
}

exports.getTicketAndRelation = nid => {
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

exports.fetchUsers = (userIds) => {
  return Promise.all(_.map(_.chunk(userIds, 50), (userIds) => {
    return auth.queryUser()
      .where('objectId', 'in', userIds)
      .find()
  }))
  .then(_.flatten)
}

exports.UserLabel = (props) => {
  if (!props.user) {
    return <span>data err</span>
  }
  const username = props.user.username || props.user.get('username')
  const name = props.user.name || getUserDisplayName(props.user)

  if (props.simple) {
    return <span>{name}</span>
  }

  return (
    <span>
      <Link to={'/users/' + username} className="avatar">
        <exports.Avatar user={props.user} />
      </Link>
      <Link to={'/users/' + username} className="username">
        {name}
      </Link>
      {props.displayTags && <UserTagGroup tags={getUserTags(props.user)} />}
    </span>
  )
}

exports.UserLabel.displayName = 'UserLabel'
exports.UserLabel.propTypes = {
  user: PropTypes.object,
  simple: PropTypes.bool,
  displayTags: PropTypes.bool
}


exports.Avatar = props => {
  let src = `https://cdn.v2ex.com/gravatar/${props.user.gravatarHash ||
    props.user.get('gravatarHash')}?s=${props.height || 16}&r=pg&d=identicon`
  return (
    <Image
      height={props.height || 16}
      width={props.width || 16}
      src={src}
      rounded
    />
  )
}
exports.Avatar.displayName = 'Avatar'
exports.Avatar.propTypes = {
  user: PropTypes.object.isRequired,
  height: PropTypes.string,
  width: PropTypes.string
}


exports.getCategoriesTree = (hiddenDisable = true) => {
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
        return exports.getCategoriesTree(false)
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

exports.getNodePath = obj => {
  if (!obj.parent) {
    return [obj]
  }
  const result = exports.getNodePath(obj.parent)
  result.push(obj)
  return result
}

exports.getNodeIndentString = treeNode => {
  const depth = getNodeDepth(treeNode)
  return depth == 0 ? '' : '　'.repeat(depth) + '└ '
}

exports.getCategoryName = (category, t) => {
  return category.get('name') + (category.get('deletedAt') ? t('disabled') : '')
}

exports.isCN = () => {
  return window.location.hostname.endsWith('.cn')
}

