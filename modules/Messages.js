import React, {Component} from 'react'
import { Link } from 'react-router'
import { Table } from 'react-bootstrap'
import moment from 'moment'
import AV from 'leancloud-storage/live-query'

import {UserLabel} from './common'

export default class Messages extends Component {

  constructor(props) {
    super(props)
    this.state = {
      messages: []
    }
  }

  componentDidMount () {
    return new AV.Query('Message')
      .equalTo('to', AV.User.current())
      .include(['from', 'ticket', 'reply'])
      .descending('createdAt')
      .limit(20)
      .find()
      .then(messages => {
        this.setState({messages})
        return
      })
  }

  render() {
    return <Table>
      <tbody>
        {this.state.messages.map(m => {
          const ticket = m.get('ticket')
          console.log('>>', m.get('type'))
          switch(m.get('type')) {
          case 'newTicket': {
            return <tr>
              <td>
                <div>
                  <Link to={'tickets/' + ticket.get('nid')}>
                    <span className="glyphicon glyphicon-record" aria-hidden="true"></span>
                    {' '}
                    <UserLabel user={m.get('from')} simple={true} />
                    {' '}提交工单{' '}
                    #{ticket.get('nid') + ' ' + ticket.get('title')}
                  </Link>
                  {' '}
                  <small>{moment(m.get('createdAt')).fromNow()}</small>
                  {' '}
                  {!m.get('isRead') &&
                    <span className='label label-default'>未读</span>
                  }
                </div>
                <span>{ticket.get('content')}</span>
              </td>
            </tr>
          }
          case 'reply': {
            return <tr>
              <td>
                <div>
                  <Link to={'tickets/' + ticket.get('nid')}>
                    <span className="glyphicon glyphicon-share-alt" aria-hidden="true"></span>
                    {' '}
                    <UserLabel user={m.get('from')} simple={true} />
                    {' '}回复工单{' '}
                    #{ticket.get('nid') + ' ' + ticket.get('title')}
                  </Link>
                  {' '}
                  <small>{moment(m.get('createdAt')).fromNow()}</small>
                  {' '}
                  {!m.get('isRead') &&
                    <span className='label label-default'>未读</span>
                  }
                </div>
                <span>{m.get('reply').get('content')}</span>
              </td>
            </tr>
          }
          case 'changeAssignee': {
            return <tr>
              <td>
                <div>
                  <Link to={'tickets/' + ticket.get('nid')}>
                    <span className="glyphicon glyphicon-transfer" aria-hidden="true"></span>
                    {' '}
                    <UserLabel user={m.get('from')} simple={true} />
                    {' '}将工单交由你处理{' '}
                    #{ticket.get('nid') + ' ' + ticket.get('title')}
                  </Link>
                  {' '}
                  <small>{moment(m.get('createdAt')).fromNow()}</small>
                  {' '}
                  {!m.get('isRead') &&
                    <span className='label label-default'>未读</span>
                  }
                </div>
              </td>
            </tr>
          }}
        })}
      </tbody>
    </Table>
  }
}

Messages.propTypes = {
}

