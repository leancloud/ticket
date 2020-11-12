import React from 'react'
import PropTypes from 'prop-types'
import {Link} from 'react-router'
import {Image, FormControl} from 'react-bootstrap'
import _ from 'lodash'
import AV from 'leancloud-storage/live-query'

Object.assign(exports, require('../lib/common'))

exports.getCategoryPathName = (category, categoriesTree) => {
  const c = exports.depthFirstSearchFind(
    categoriesTree,
    c => c.id == (category.id || category.objectId)
  )
  return exports
    .getNodePath(c)
    .map(c => exports.getCategoryName(c))
    .join(' / ')
}

exports.requireAuth = (nextState, replace) => {
  if (!AV.User.current()) {
    replace({
      pathname: '/login',
      state: { nextPathname: nextState.location.pathname }
    })
  }
}

exports.requireCustomerServiceAuth = (nextState, replace, next) => {
  exports
    .isCustomerService(AV.User.current())
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
  return new AV.Query(AV.Role)
    .equalTo('name', 'customerService')
    .first()
    .then(role => {
      return role
        .getUsers()
        .query()
        .ascending('username')
        .find()
    })
}

exports.isCustomerService = user => {
  if (!user) {
    return Promise.resolve(false)
  }
  return new AV.Query(AV.Role)
    .equalTo('name', 'customerService')
    .equalTo('users', user)
    .first()
    .then(role => {
      return !!role
    })
}

exports.uploadFiles = files => {
  return Promise.all(
    _.map(files, file =>
      new AV.File(file.name, file).save({
        keepFileName: true
      })
    )
  )
}

exports.getTicketAndRelation = nid => {
  return new AV.Query('Ticket')
    .equalTo('nid', parseInt(nid))
    .include('author')
    .include('files')
    .first()
    .then(ticket => {
      if (!ticket) {
        return
      }
      return Promise.all([
        new AV.Query('Reply')
          .equalTo('ticket', ticket)
          .include('author')
          .include('files')
          .ascending('createdAt')
          .find(),
        new AV.Query('OpsLog')
          .equalTo('ticket', ticket)
          .ascending('createdAt')
          .find()
      ]).spread((replies, opsLogs) => {
        return { ticket, replies, opsLogs }
      })
    })
}

exports.fetchUsers = (userIds) => {
  return Promise.all(_.map(_.chunk(userIds, 50), (userIds) => {
    return new AV.Query('_User')
    .containedIn('objectId', userIds)
    .find()
  }))
  .then(_.flatten)
}

exports.UserLabel = (props) => {
  if (!props.user) {
    return <span>data err</span>
  }
  const username = props.user.username || props.user.get('username')
  const name = props.user.name || exports.getUserDisplayName(props.user)

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
    </span>
  )
}

exports.UserLabel.displayName = 'UserLabel'
exports.UserLabel.propTypes = {
  user: PropTypes.object,
  simple: PropTypes.bool
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

exports.CategoriesSelect = ({
  categoriesTree,
  selected,
  onChange,
  hiddenDisable = true
}) => {
  const options = _.compact(
    exports.depthFirstSearchMap(categoriesTree, c => {
      if (hiddenDisable && c.get('deletedAt')) {
        return
      }
      return (
        <option
          key={c.id}
          value={c.id}
          disabled={selected && (selected.id || selected.objectId) == c.id}
        >
          {exports.getNodeIndentString(c) + exports.getCategoryName(c)}
        </option>
      )
    })
  )
  return (
    <FormControl
      componentClass="select"
      value={selected ? selected.id || selected.objectId : ''}
      onChange={onChange}
    >
      <option value="" />
      {options}
    </FormControl>
  )
}
exports.CategoriesSelect.displayName = 'CategoriesSelect'
exports.CategoriesSelect.propTypes = {
  categoriesTree: PropTypes.array.isRequired,
  selected: PropTypes.object,
  onChange: PropTypes.func,
  hiddenDisable: PropTypes.bool
}


exports.getCategoriesTree = (hiddenDisable = true) => {
  const query = new AV.Query('Category')
  if (hiddenDisable) {
    query.doesNotExist('deletedAt')
  }
  return query
    .descending('createdAt')
    .find()
    .then(categories => {
      return exports.makeTree(categories)
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

