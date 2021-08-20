import React, { Component } from 'react'
import { Button, FormGroup, Table } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import moment from 'moment'
import * as Icon from 'react-bootstrap-icons'
import { auth, db } from '../lib/leancloud'

import { UserLabel } from './UserLabel'

export default class Messages extends Component {
  constructor(props) {
    super(props)
    this.state = {
      messages: [],
    }
  }

  componentDidMount() {
    return db
      .class('Message')
      .where('to', '==', auth.currentUser)
      .include(['from', 'ticket', 'reply'])
      .orderBy('createdAt', 'desc')
      .limit(20)
      .find()
      .then((messages) => {
        this.setState({ messages })
        return
      })
  }

  markAllReaded() {
    const unreadMessages = this.state.messages.filter((m) => !m.get('isRead'))
    const p = db.pipeline()
    unreadMessages.forEach((m) => {
      m.data.isRead = true
      p.update(m, { isRead: true })
    })
    p.commit()
    const messages = this.state.messages
    this.setState({ messages })
  }

  render() {
    return (
      <div>
        <FormGroup>
          <Button variant="light" onClick={() => this.markAllReaded()}>
            全部标记为已读
          </Button>
        </FormGroup>
        <Table>
          <tbody>
            {this.state.messages.map((m) => {
              const ticket = m.data.ticket
              const sender = m.data.from.data

              switch (m.get('type')) {
                case 'newTicket': {
                  return (
                    <tr key={m.id}>
                      <td>
                        <div>
                          <Link to={'tickets/' + ticket.get('nid')}>
                            <Icon.RecordCircle /> <UserLabel user={sender} simple /> 提交工单 #
                            {ticket.get('nid') + ' ' + ticket.get('title')}
                          </Link>{' '}
                          <small>{moment(m.get('createdAt')).fromNow()}</small>{' '}
                          {!m.get('isRead') && <span className="label label-default">未读</span>}
                        </div>
                        <span style={{ color: 'black' }}>{ticket.get('content')}</span>
                      </td>
                    </tr>
                  )
                }
                case 'reply': {
                  return (
                    <tr key={m.id}>
                      <td>
                        <div>
                          <Link to={'tickets/' + ticket.get('nid')}>
                            <Icon.ChatLeft /> <UserLabel user={sender} simple /> 回复工单 #
                            {ticket.get('nid') + ' ' + ticket.get('title')}
                          </Link>{' '}
                          <small>{moment(m.get('createdAt')).fromNow()}</small>{' '}
                          {!m.get('isRead') && <span className="label label-default">未读</span>}
                        </div>
                        {/* The reply might be undefined because of an ACL bug */}
                        <span style={{ color: 'black' }}>{m.get('reply')?.get('content')}</span>
                      </td>
                    </tr>
                  )
                }
                case 'changeAssignee': {
                  return (
                    <tr key={m.id}>
                      <td>
                        <div>
                          <Link to={'tickets/' + ticket.get('nid')}>
                            <Icon.ArrowLeftRight /> <UserLabel user={sender} simple />{' '}
                            将工单交由你处理 #{ticket.get('nid') + ' ' + ticket.get('title')}
                          </Link>{' '}
                          <small>{moment(m.get('createdAt')).fromNow()}</small>{' '}
                          {!m.get('isRead') && <span className="label label-default">未读</span>}
                        </div>
                      </td>
                    </tr>
                  )
                }
              }
            })}
          </tbody>
        </Table>
      </div>
    )
  }
}
