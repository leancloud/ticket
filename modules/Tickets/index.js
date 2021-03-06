import React, { Component } from 'react'
import { Button, Dropdown, DropdownButton, Form } from 'react-bootstrap'
import { withTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import PropTypes from 'prop-types'
import _ from 'lodash'
import { auth, db } from '../../lib/leancloud'
import css from '../CustomerServiceTickets.css'

import { getCategoryPathName, getCategoriesTree } from '../common'
import OrganizationSelect from '../OrganizationSelect'
import TicketsMoveButton from '../TicketsMoveButton'
import { getTicketAcl } from '../../lib/common'
import { TicketItem } from './TicketItem'
import { DocumentTitle } from '../utils/DocumentTitle'

class Tickets extends Component {
  constructor(props) {
    super(props)
    this.state = {
      organization: null,
      categoriesTree: [],
      tickets: [],
      batchOpsEnable: false,
      checkedTickets: new Set(),
      isCheckedAll: false,
      filters: {
        page: 0,
        size: 20,
      },
    }
  }

  componentDidMount() {
    getCategoriesTree(false)
      .then((categoriesTree) => {
        this.setState({ categoriesTree })
        this.findTickets({ organizationId: this.props.selectedOrgId })
        return
      })
      .catch(this.props.addNotification)
  }

  componentDidUpdate(prevProps) {
    if (this.props.selectedOrgId !== prevProps.selectedOrgId) {
      this.findTickets({ organizationId: this.props.selectedOrgId })
    }
  }

  findTickets(filter) {
    const filters = _.assign({}, this.state.filters, filter)
    let query = db.class('Ticket')
    if (filter.organizationId) {
      query = query.where(
        'organization',
        '==',
        _.find(this.props.organizations, { id: filter.organizationId })
      )
    } else {
      query = query.where({
        author: auth.currentUser,
        organization: db.cmd.or(null, db.cmd.notExists()),
      })
    }
    query
      .include('author')
      .include('assignee')
      .limit(filters.size)
      .skip(filters.page * filters.size)
      .orderBy('createdAt', 'desc')
      .find()
      .then((tickets) => {
        this.setState({ tickets, filters })
        return
      })
      .catch(this.props.addNotification)
  }

  handleClickCheckbox(id) {
    const checkedTickets = this.state.checkedTickets
    if (this.state.checkedTickets.has(id)) {
      checkedTickets.delete(id)
    } else {
      checkedTickets.add(id)
    }
    this.setState({
      checkedTickets,
      isCheckedAll: checkedTickets.size == this.state.tickets.length,
    })
  }

  handleClickCheckAll(e) {
    if (e.target.checked) {
      this.setState({
        checkedTickets: new Set(this.state.tickets.map((t) => t.id)),
        isCheckedAll: true,
      })
    } else {
      this.setState({ checkedTickets: new Set(), isCheckedAll: false })
    }
  }

  handleBatchOps(batchOpsEnable) {
    this.setState({ batchOpsEnable })
  }

  handleTicketsMove(organization) {
    const tickets = _.filter(this.state.tickets, (t) => this.state.checkedTickets.has(t.id))
    const p = db.pipeline()
    tickets.forEach((t) => {
      const ACL = getTicketAcl(t.get('author'), organization)
      if (organization) {
        p.update(t, { ACL, organization })
      } else {
        p.update(t, { ACL, organization: db.op.unset() })
      }
    })
    p.commit()
      .then(() => {
        this.setState({ checkedTickets: new Set(), isCheckedAll: false })
        this.findTickets({ organizationId: this.props.selectedOrgId })
        return
      })
      .catch(this.props.addNotification)
  }

  render() {
    const { t } = this.props
    const { tickets } = this.state

    return (
      <div>
        <DocumentTitle title={`${t('ticketList')} - LeanTicket`} />
        {this.props.organizations.length > 0 && (
          <Form inline>
            {(this.state.batchOpsEnable && (
              <>
                <Form.Check
                  className={css.ticketSelectCheckbox}
                  onChange={this.handleClickCheckAll.bind(this)}
                  checked={this.state.isCheckedAll}
                  label={t('selectAll')}
                />
                <TicketsMoveButton
                  className="ml-1"
                  selectedOrgId={this.props.selectedOrgId}
                  organizations={this.props.organizations}
                  onTicketsMove={this.handleTicketsMove.bind(this)}
                />
                <Button className="ml-1" variant="link" onClick={() => this.handleBatchOps(false)}>
                  {t('return')}
                </Button>
              </>
            )) || (
              <>
                <OrganizationSelect
                  organizations={this.props.organizations}
                  selectedOrgId={this.props.selectedOrgId}
                  onOrgChange={this.props.handleOrgChange}
                />
                <DropdownButton id="tickets-ops" className="ml-1" variant="light" title="">
                  <Dropdown.Item onClick={() => this.handleBatchOps(true)}>
                    {t('batchOperation')}
                  </Dropdown.Item>
                </DropdownButton>
              </>
            )}
          </Form>
        )}
        {tickets.length ? (
          tickets.map((ticket) => (
            <TicketItem
              key={ticket.data.nid}
              ticket={ticket.toJSON()}
              checkable={this.state.batchOpsEnable}
              checked={this.state.checkedTickets.has(ticket.id)}
              onCheckboxChange={() => this.handleClickCheckbox(ticket.id)}
              category={getCategoryPathName(ticket.data.category, this.state.categoriesTree)}
            />
          ))
        ) : (
          <div key={0}>
            {t('ticketsNotFound')}
            <Link to="/tickets/new">{t('createANewOne')}</Link>
          </div>
        )}
        <div className="my-2 d-flex justify-content-between">
          <Button
            variant="light"
            disabled={this.state.filters.page === 0}
            onClick={() =>
              this.findTickets({
                page: this.state.filters.page - 1,
                organizationId: this.props.selectedOrgId,
              })
            }
          >
            &larr; {t('previousPage')}
          </Button>
          <Button
            variant="light"
            disabled={this.state.filters.size !== this.state.tickets.length}
            onClick={() =>
              this.findTickets({
                page: this.state.filters.page + 1,
                organizationId: this.props.selectedOrgId,
              })
            }
          >
            {t('nextPage')} &rarr;
          </Button>
        </div>
      </div>
    )
  }
}

Tickets.propTypes = {
  organizations: PropTypes.array,
  handleOrgChange: PropTypes.func,
  selectedOrgId: PropTypes.string,
  addNotification: PropTypes.func,
  t: PropTypes.func.isRequired,
}

export default withTranslation()(Tickets)
