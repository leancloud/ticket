import React from 'react'
import PropTypes from 'prop-types'
import {Link} from 'react-router'
import {Image, FormControl} from 'react-bootstrap'
import _ from 'lodash'
import AV from 'leancloud-storage/live-query'

const {TICKET_STATUS, TICKET_STATUS_MSG, getTinyCategoryInfo, getCategoryPathName} = require('../lib/common')

exports.getTinyCategoryInfo = getTinyCategoryInfo

exports.getCategoryPathName = (category, categoriesTree) => {
  const c = exports.depthFirstSearchFind(categoriesTree, c => c.id == (category.id || category.objectId))
  return getCategoryPathName(exports.getNodePath(c))
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
  exports.isCustomerService(AV.User.current())
  .then((isCustomerService) => {
    if (!isCustomerService) {
      replace({
        pathname: '/error',
        state: { code: 'requireCustomerServiceAuth' }
      })
    }
    return next()
  })
  .catch((err) => {
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
    .then((role) => {
      return role.getUsers()
        .query()
        .ascending('username')
        .find()
    })
}

exports.isCustomerService = (user) => {
  if (!user) {
    return Promise.resolve(false)
  }
  return new AV.Query(AV.Role)
    .equalTo('name', 'customerService')
    .equalTo('users', user)
    .first()
    .then((role) => {
      return !!role
    })
}

exports.uploadFiles = (files) => {
  return Promise.all(_.map(files, file => new AV.File(file.name, file).save()))
}

exports.getTicketAndRelation = (nid) => {
  return new AV.Query('Ticket')
  .equalTo('nid', parseInt(nid))
  .include('author')
  .include('files')
  .first()
  .then((ticket) => {
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
        .find(),
    ]).spread((replies, opsLogs) => {
      return {ticket, replies, opsLogs}
    })
  })
}

exports.UserLabel = (props) => {
  if (!props.user) {
    return (
      <span>data err</span>
    )
  }
  const username = props.user.username || props.user.get('username')
  const name = props.user.name || props.user.get('name')
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
}

exports.TicketStatusLabel = (props) => {
  switch (props.status) {
  case TICKET_STATUS.FULFILLED:
    return <span className='label label-success'>{TICKET_STATUS_MSG[props.status]}</span>
  case TICKET_STATUS.REJECTED:
    return <span className='label label-default'>{TICKET_STATUS_MSG[props.status]}</span>
  case TICKET_STATUS.PRE_FULFILLED:
    return <span className='label label-primary'>{TICKET_STATUS_MSG[props.status]}</span>
  case TICKET_STATUS.NEW:
    return <span className='label label-danger'>{TICKET_STATUS_MSG[props.status]}</span>
  case TICKET_STATUS.WAITING_CUSTOMER_SERVICE:
    return <span className='label label-warning'>{TICKET_STATUS_MSG[props.status]}</span>
  case TICKET_STATUS.WAITING_CUSTOMER:
    return <span className='label label-primary'>{TICKET_STATUS_MSG[props.status]}</span>
  default:
    throw new Error('unkonwn ticket status:', props.status)
  }
}
exports.TicketStatusLabel.displayName = 'TicketStatusLabel'
exports.TicketStatusLabel.propTypes = {
  status: PropTypes.number.isRequired,
}

exports.Avatar = (props) => {
  let src = `https://cdn.v2ex.com/gravatar/${props.user.gravatarHash || props.user.get('gravatarHash')}?s=${props.height || 16}&r=pg&d=identicon`
  return <Image height={props.height || 16} width={props.width || 16} src={src} rounded />
}
exports.Avatar.displayName = 'Avatar'
exports.Avatar.propTypes = {
  user: PropTypes.object.isRequired,
  height: PropTypes.string,
  width: PropTypes.string
}

exports.CategoriesSelect = ({categoriesTree, selected, onChange}) => {
  const options = exports.depthFirstSearchMap(categoriesTree, c => {
    return <option key={c.id} value={c.id} disabled={selected && (selected.id || selected.objectId) == c.id}>{exports.getNodeIndentString(c) + c.get('name')}</option>
  })
  return (
    <FormControl componentClass='select'
      value={selected ? (selected.id || selected.objectId) : ''}
      onChange={onChange}>
      <option value=''></option>
      {options}
    </FormControl>
  )
}
exports.CategoriesSelect.displayName = 'CategoriesSelect'
exports.CategoriesSelect.propTypes = {
  categoriesTree: PropTypes.array.isRequired,
  selected: PropTypes.object,
  onChange: PropTypes.func,
}

exports.getCategoreisTree = () => {
  return new AV.Query('Category')
    .descending('createdAt')
    .find()
    .then(categories => {
      return makeTree(categories)
    })
}

const makeTree = (objs) => {
  const sortFunc = (o) => {
    return o.get('order') != null ? o.get('order') : o.createdAt.getTime()
  }
  const innerFunc = (parents, children) => {
    if (parents && children) {
      parents.forEach(p => {
        const [cs, others] = _.partition(children, c => c.get('parent').id == p.id)
        p.children = _.sortBy(cs, sortFunc)
        cs.forEach(c => c.parent = p)
        innerFunc(p.children, others)
      })
    }
  }
  const [parents, children] = _.partition(objs, o => !o.get('parent'))
  innerFunc(parents, children)
  return _.sortBy(parents, sortFunc)
}

exports.depthFirstSearchMap = (array, fn) => {
  return _.flatten(array.map((a, index, array) => {
    const result = fn(a, index, array)
    if (a.children) {
      return [result, ...exports.depthFirstSearchMap(a.children, fn)]
    }
    return result
  }))
}

exports.depthFirstSearchFind = (array, fn) => {
  for (let i = 0; i < array.length; i++) {
    const obj = array[i]
    if (fn(obj)) {
      return obj
    }

    if (obj.children) {
      const finded = exports.depthFirstSearchFind(obj.children, fn)
      if (finded) {
        return finded
      }
    }
  }
}

const getNodeDepth = (obj) => {
  if (!obj.parent) {
    return 0
  }
  return 1 + getNodeDepth(obj.parent)
}

exports.getNodePath = (obj) => {
  if (!obj.parent) {
    return [obj]
  }
  const result = exports.getNodePath(obj.parent)
  result.push(obj)
  return result
}

exports.getNodeIndentString = (treeNode) => {
  const depth = getNodeDepth(treeNode)
  return depth == 0 ? '' : '　'.repeat(depth) + '└ '
}
