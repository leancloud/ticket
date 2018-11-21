import React from 'react'
import PropTypes from 'prop-types'
import {Link} from 'react-router'
import {Image, FormGroup, FormControl, Form, ControlLabel, Button} from 'react-bootstrap'
import _ from 'lodash'
import AV from 'leancloud-storage/live-query'

Object.assign(module.exports, require('../lib/common'))

exports.getCategoryPathName = (category, categoriesTree) => {
  const c = exports.depthFirstSearchFind(categoriesTree, c => c.id == (category.id || category.objectId))
  return exports.getNodePath(c).map(c => exports.getCategoryName(c)).join(' / ')
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
  case exports.TICKET_STATUS.FULFILLED:
    return <span className='label label-success'>{exports.TICKET_STATUS_MSG[props.status]}</span>
  case exports.TICKET_STATUS.REJECTED:
    return <span className='label label-default'>{exports.TICKET_STATUS_MSG[props.status]}</span>
  case exports.TICKET_STATUS.PRE_FULFILLED:
    return <span className='label label-primary'>{exports.TICKET_STATUS_MSG[props.status]}</span>
  case exports.TICKET_STATUS.NEW:
    return <span className='label label-danger'>{exports.TICKET_STATUS_MSG[props.status]}</span>
  case exports.TICKET_STATUS.WAITING_CUSTOMER_SERVICE:
    return <span className='label label-warning'>{exports.TICKET_STATUS_MSG[props.status]}</span>
  case exports.TICKET_STATUS.WAITING_CUSTOMER:
    return <span className='label label-primary'>{exports.TICKET_STATUS_MSG[props.status]}</span>
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

exports.CategoriesSelect = ({categoriesTree, selected, onChange, hiddenDisable = true}) => {
  const options = _.compact(exports.depthFirstSearchMap(categoriesTree, c => {
    if (hiddenDisable && c.get('deletedAt')) {
      return
    }
    return <option key={c.id} value={c.id} disabled={selected && (selected.id || selected.objectId) == c.id}>{exports.getNodeIndentString(c) + exports.getCategoryName(c)}</option>
  }))
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
  hiddenDisable: PropTypes.bool
}

exports.UserForm = class UserForm extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      username: ''
    }
  }

  handleNameChange(e) {
    this.setState({username: e.target.value})
  }

  handleSubmit(e) {
    e.preventDefault()
    AV.Cloud.run('getUserInfo', {username: this.state.username})
    .then(user => {
      if (!user) {
        throw new Error(`找不到用户名为 ${this.state.username} 的用户`)
      }
      return AV.Object.createWithoutData('_User', user.objectId).fetch()
    })
    .then(user => {
      this.props.addUser(user)
      this.setState({username: ''})
      return
    })
    .catch(this.context.addNotification)
  }

  render() {
    return <Form inline onSubmit={this.handleSubmit.bind(this)}>
      <FormControl type='text' value={this.state.username} onChange={this.handleNameChange.bind(this)} placeholder='用户名' />
      {' '}
      <Button type='submit' bsStyle='primary'>添加</Button>
    </Form>
  }
}
exports.UserForm.propTypes = {
  addUser: PropTypes.func,
}
exports.UserForm.contextTypes = {
  addNotification: PropTypes.func.isRequired,
}

exports.OrganizationSelect = class OrganizationSelect extends React.Component {

  render() {
    return <FormGroup controlId='orgSelect'>
      <ControlLabel>所属：</ControlLabel>
      <FormControl componentClass='select' value={this.props.selectedOrgId} onChange={this.props.onOrgChange}>
        {this.props.organizations.map(o => <option key={o.id} value={o.id}>组织：{o.get('name')}</option>)}
        <option value=''>个人：{AV.User.current().get('username')}</option>
      </FormControl>
    </FormGroup>
  }
}

exports.OrganizationSelect.propTypes = {
  organizations: PropTypes.array,
  selectedOrgId: PropTypes.string,
  onOrgChange: PropTypes.func,
}

exports.getCategoriesTree = (hiddenDisable = true) => {
  const query = new AV.Query('Category')
  if (hiddenDisable) {
    query.doesNotExist('deletedAt')
  }
  return query.descending('createdAt')
    .find()
    .then(categories => {
      return exports.makeTree(categories)
    })
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

exports.getCategoryName = (category) => {
  return category.get('name') + (category.get('deletedAt') ? '（停用）' : '')
}
