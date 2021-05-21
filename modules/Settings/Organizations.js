import React, { Component } from 'react'
import { Button, Card, ListGroup } from 'react-bootstrap'
import { withTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import PropTypes from 'prop-types'
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
    return Promise.all(
      organizations.map((o) => {
        return cloud.run('getRoleUsersCount', { roleId: o.get('memberRole').id }).then((count) => {
          organizationMembersCount[o.id] = count
          return
        })
      })
    )
      .then(() => {
        this.setState({ organizationMembersCount })
        return
      })
      .catch(this.context.addNotification)
  }

  handleLeaveOrganization(org) {
    return cloud
      .run('leaveOrganization', { organizationId: org.id })
      .then(() => {
        this.props.leaveOrganization(org)
        return
      })
      .catch(this.context.addNotification)
  }

  render() {
    const { t } = this.props
    return (
      <div>
        <div>
          <Link to={'/settings/organizations/new'}>{t('newOrganization')}</Link>
        </div>
        <Card className="mt-1">
          <ListGroup variant="flush">
            {this.props.organizations.length === 0 ? (
              <Card.Body>{t('notInOrganization')}</Card.Body>
            ) : (
              this.props.organizations.map((o) => (
                <ListGroup.Item key={o.id}>
                  <Link to={'/settings/organizations/' + o.id}>
                    <strong>{o.data.name}</strong>
                  </Link>{' '}
                  <span>{t('totalMembers') + this.state.organizationMembersCount[o.id]}</span>{' '}
                  <Button variant="light" size="sm" onClick={() => this.handleLeaveOrganization(o)}>
                    {t('leave')}
                  </Button>
                </ListGroup.Item>
              ))
            )}
          </ListGroup>
        </Card>
      </div>
    )
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
