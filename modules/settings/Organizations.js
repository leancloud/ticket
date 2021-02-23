import React, { Component } from 'react'
import { withTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import PropTypes from 'prop-types'
import { Form, FormGroup, Panel, ListGroup, ListGroupItem, Button } from 'react-bootstrap'
import { cloud } from '../../lib/leancloud'

class Organizations extends Component {
  constructor(props) {
    super(props)
    this.state = {
      organizationMembersCount: {},
    }
  }

  componentDidMount() {
    this.fetchRoleUsers(this.props.organizations)
  }

  fetchRoleUsers(organizations) {
    const organizationMembersCount = {}
    return Promise.all(organizations.map(o => {
      return cloud.run('getRoleUsers', {roleId: o.get('memberRole').id}).then(users => {
        organizationMembersCount[o.id] = users.length
        return
      })
    }))
    .then(() => {
      this.setState({organizationMembersCount})
      return
    })
    .catch(this.context.addNotification)
  }

  handleLeaveOrganization(org) {
    return cloud.run('leaveOrganization', {organizationId: org.id})
    .then(() => {
      this.props.leaveOrganization(org)
      return
    })
    .catch(this.context.addNotification)
  }

  render() {
    const { t } = this.props
    return <div>
      <Form inline>
        <FormGroup>
          <Link to={'/settings/organizations/new'}>{t('newOrganization')}</Link>
        </FormGroup>{' '}
      </Form>
      <Panel>
        <ListGroup>
          {this.props.organizations.length  == 0
            && <Panel.Body>{t('notInOrganization')}</Panel.Body>
            ||
            this.props.organizations.map(o => {
              return <ListGroupItem key={o.id}>
                <Link to={'/settings/organizations/' + o.id}><strong>{o.get('name')}</strong></Link>{' '}
                <span>{t('totalMembers')} {this.state.organizationMembersCount[o.id]}</span>{' '}
                <span><Button onClick={() => this.handleLeaveOrganization(o)}>{t('leave')}</Button></span>
              </ListGroupItem>
            })
          }
        </ListGroup>
      </Panel>
    </div>
  }
}

Organizations.propTypes = {
  organizations: PropTypes.array,
  leaveOrganization: PropTypes.func,
  t: PropTypes.func.isRequired,
}

Organizations.contextTypes = {
  addNotification: PropTypes.func.isRequired,
}

export default withTranslation()(Organizations)
