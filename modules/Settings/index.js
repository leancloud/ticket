import React from 'react'
import { Col, ListGroup, Row } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import { NavLink, Redirect, Route, Switch, useRouteMatch } from 'react-router-dom'

import Profile from './Profile'
import Organization from './Organization'
import Organizations from './Organizations'
import OrganizationNew from './OrganizationNew'
import Tags from './Tags'
import Tag from './Tag'
import SettingsCSProfile from './CustomerServiceProfile'
import Members from './Members'
import Groups from './Groups'
import FAQs from './FAQs'
import FAQ from './FAQ'
import Categories from './Categories'
import Category from './Category'
import CategorySort from './CategorySort'
import DynamicContent from './DynamicContent'
import Trigger from './Rule/Trigger'
import Automation from './Rule/Automation'
import QuickReplies from './QuickReply'
import TicketField from './TicketField'
import TicketForm from './TicketForm'

export default function Settings(props) {
  const { path } = useRouteMatch()
  const { t } = useTranslation()
  const childrenProps = {
    currentUser: props.currentUser,
    updateCurrentUser: props.updateCurrentUser,
    organizations: props.organizations,
    joinOrganization: props.joinOrganization,
    leaveOrganization: props.leaveOrganization,
  }

  return (
    <Row className="my-2">
      <Col md={3}>
        <section className="mb-4">
          <h6>{t('userSettings')}</h6>
          <ListGroup>
            <ListGroup.Item as={NavLink} to="/settings/profile">
              {t('personalSettings')}
            </ListGroup.Item>
            <ListGroup.Item as={NavLink} to="/settings/organizations">
              {t('organizationSettings')}
            </ListGroup.Item>
          </ListGroup>
        </section>
        {props.isCustomerService && (
          <section className="mb-4">
            <h6>{t('staffSettings')}</h6>
            <ListGroup>
              <ListGroup.Item as={NavLink} to="/settings/customerServiceProfile">
                {t('personalSettings')}
              </ListGroup.Item>
              <ListGroup.Item as={NavLink} to="/settings/members">
                {t('member')}
              </ListGroup.Item>
              <ListGroup.Item as={NavLink} to="/settings/groups">
                {t('group')}
              </ListGroup.Item>
              <ListGroup.Item as={NavLink} to="/settings/categories">
                {t('category')}
              </ListGroup.Item>
              <ListGroup.Item as={NavLink} to="/settings/ticketField">
                {t('ticketField')}
              </ListGroup.Item>
              <ListGroup.Item as={NavLink} to="/settings/ticketForm">
                {t('ticketForm')}
              </ListGroup.Item>
              <ListGroup.Item as={NavLink} to="/settings/tags">
                {t('tag')}
              </ListGroup.Item>
              <ListGroup.Item as={NavLink} to="/settings/quick-replies">
                Quick reply
              </ListGroup.Item>
              <ListGroup.Item as={NavLink} to="/settings/faqs">
                {t('FAQ')}
              </ListGroup.Item>
              <ListGroup.Item as={NavLink} to="/settings/dynamicContent">
                {t('dynamicContent')}
              </ListGroup.Item>
              <ListGroup.Item as={NavLink} to="/settings/triggers">
                Trigger
              </ListGroup.Item>
              <ListGroup.Item as={NavLink} to="/settings/automations">
                Automation
              </ListGroup.Item>
            </ListGroup>
          </section>
        )}
      </Col>
      <Col md={9}>
        <Switch>
          <Route path={`${path}/profile`}>
            <Profile {...childrenProps} />
          </Route>
          <Route path={`${path}/organizations`} exact>
            <Organizations {...childrenProps} />
          </Route>
          <Route path={`${path}/organizations/new`}>
            <OrganizationNew {...childrenProps} />
          </Route>
          <Route path={`${path}/organizations/:id`}>
            <Organization {...childrenProps} />
          </Route>
          <Route path={`${path}/tags`} exact>
            <Tags {...childrenProps} />
          </Route>
          <Route path={`${path}/tags/:id`}>
            <Tag {...childrenProps} />
          </Route>
          <Route path={`${path}/customerServiceProfile`}>
            <SettingsCSProfile {...childrenProps} />
          </Route>
          <Route path={`${path}/members`}>
            <Members {...childrenProps} />
          </Route>
          <Route path={`${path}/groups`}>
            <Groups {...childrenProps} />
          </Route>
          <Route path={`${path}/faqs`} exact>
            <FAQs {...childrenProps} />
          </Route>
          <Route path={`${path}/faqs/:id`}>
            <FAQ {...childrenProps} />
          </Route>
          <Route path={`${path}/categories`} exact>
            <Categories {...childrenProps} />
          </Route>
          <Route path={`${path}/categories/:id`}>
            <Category {...childrenProps} />
          </Route>
          <Route path={`${path}/categorySort`}>
            <CategorySort {...childrenProps} />
          </Route>
          <Route path={`${path}/dynamicContent`}>
            <DynamicContent />
          </Route>
          <Route path={`${path}/triggers`}>
            <Trigger />
          </Route>
          <Route path={`${path}/automations`}>
            <Automation />
          </Route>
          <Route path={`${path}/ticketField`} component={TicketField} />
          <Route path={`${path}/ticketForm`} component={TicketForm} />
          <Route path={`${path}/quick-replies`}>
            <QuickReplies />
          </Route>
          <Redirect exact from={path} to={`${path}/profile`} />
        </Switch>
      </Col>
    </Row>
  )
}

Settings.propTypes = {
  children: PropTypes.object,
  currentUser: PropTypes.object,
  updateCurrentUser: PropTypes.func,
  isCustomerService: PropTypes.bool,
  organizations: PropTypes.array,
  joinOrganization: PropTypes.func,
  leaveOrganization: PropTypes.func,
}
