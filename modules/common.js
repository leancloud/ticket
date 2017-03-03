import React from 'react'
import qs from 'qs'
import Promise from 'bluebird'
import moment from 'moment'
import _ from 'lodash'
import AV from 'leancloud-storage'

import {TICKET_STATUS_OPEN} from '../lib/constant'

exports.userLabel = (user) => {
  return (
    <span>{user.username || user.get('username')}</span>
  )
}

exports.getTinyCategoryInfo = (category) => {
  return {
    objectId: category.id,
    name: category.get('name'),
  }
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
  new AV.Query(AV.Role)
    .equalTo('name', 'customerService')
    .equalTo('users', AV.User.current())
    .first()
    .then((role) => {
      if (!role) {
        replace({
          pathname: '/error',
          state: { code: 'requireCustomerServiceAuth' }
        })
      }
      next()
    }).catch((err) => {
      replace({
        pathname: '/error',
        state: { code: 'orz', err }
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
  return Promise.map(files, (file) => {
    return new Promise((resolve, reject) => {
      var reader = new FileReader()
      reader.onload = (function() {
        return function(e) {
          const result = e.target.result
          const macher = result.match(new RegExp('^data:([a-zA-Z0-9-/]+)?;base64,([a-zA-Z0-9+/=]+)$'))
          new AV.File(file.name, {base64: macher[2]}).save().then(resolve).catch(reject)
        }
      })()
      reader.readAsDataURL(file)
    })
  })
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

exports.ticketTimeline = (avObj) => {
  if (avObj.className === 'OpsLog') {
    switch (avObj.get('action')) {
    case 'selectAssignee':
      return (
        <p key={avObj.id}>
          系统 于 {moment(avObj.get('createdAt')).fromNow()} 将工单分配给 {exports.userLabel(avObj.get('data').assignee)} 处理
        </p>
      )
    case 'changeStatus':
      return (
        <p key={avObj.id}>
          {exports.userLabel(avObj.get('data').operator)} 于 {moment(avObj.get('createdAt')).fromNow()} 将工单状态修改为 {avObj.get('data').status === 0 ? '开启' : '关闭'}
        </p>
      )
    case 'changeCategory':
      return (
        <p key={avObj.id}>
          {exports.userLabel(avObj.get('data').operator)} 于 {moment(avObj.get('createdAt')).fromNow()} 将工单类别改为 {avObj.get('data').category.name}
        </p>
      )
    case 'changeAssignee':
      return (
        <p key={avObj.id}>
          {exports.userLabel(avObj.get('data').operator)} 于 {moment(avObj.get('createdAt')).fromNow()} 将工单负责人改为 {exports.userLabel(avObj.get('data').assignee)}
        </p>
      )
    }
  } else {
    let panelFooter = <div></div>
    const files = avObj.get('files')
    if (files && files.length !== 0) {
      const fileLinks = _.map(files, (file) => {
        return (
          <span><a href={file.url()} target='_blank'><span className="glyphicon glyphicon-paperclip"></span> {file.get('name')}</a> </span>
        )
      })
      panelFooter = <div className="panel-footer">{fileLinks}</div>
    }
    return (
      <div key={avObj.id} className="panel panel-default">
        <div className="panel-heading">
          {exports.userLabel(avObj.get('author'))} 于 {moment(avObj.get('createdAt')).fromNow()}提交
        </div>
        <div className="panel-body">
          <pre>{avObj.get('content')}</pre>
        </div>
        {panelFooter}
      </div>
    )
  }
}
