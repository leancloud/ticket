import React from 'react'
import { Link } from 'react-router'
import AV from 'leancloud-storage'
import {TICKET_STATUS_OPEN} from '../lib/constant'

export default React.createClass({
  getInitialState() {
    return {tickets: []}
  },
  componentDidMount() {
    new AV.Query('Ticket')
    .descending('updatedAt')
    .find().then((tickets) => {
      this.setState({tickets})
    }).catch((err) => {
      alert(err);
    })
  },
  contextTypes: {
    router: React.PropTypes.object
  },
  addTicket(ticket) {
    new AV.Object('Ticket').save({
      title: ticket.title,
      category: ticket.category,
      content: ticket.content,
      status: TICKET_STATUS_OPEN,
    }).then((ticket) => {
      return ticket.fetch({
        keys: 'nid',
      });
    }).then((ticket) => {
      const tickets = this.state.tickets
      tickets.unshift(ticket)
      this.setState({tickets})
      this.context.router.push('/tickets/' + ticket.get('nid'))
    }).catch((err) => {
      alert(err);
    })
  },
  render() {
    const ticketLinks = this.state.tickets.map((ticket) => {
      return (
        <li className="list-group-item" key={ticket.get('nid')}><Link to={`/tickets/${ticket.get('nid')}`}>#{ticket.get('nid')} {ticket.get('title')}</Link></li>
      )
    })
    return (
      <div>
        <div className="row">
          <div className="col-md-4">
            <div className="form-group">
              <Link to='/tickets/new' className="btn btn-primary">新建工单</Link>
            </div>
            <ul className="list-group">
              {ticketLinks}
            </ul>
          </div> 
          <div className="col-md-8">
            {this.props.children && React.cloneElement(this.props.children,
              {
                addTicket: this.addTicket,
              })
            }
          </div>
        </div>
      </div>
    )
  }
})
