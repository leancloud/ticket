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
import FAQs from './FAQs'
import FAQ from './FAQ'
import Categories from './Categories'
import Category from './Category'
import CategorySort from './CategorySort'
import QuickReplies from './QuickReply'

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
              <ListGroup.Item as="a" href="/next/admin/settings/vacations">
                {t('vacation')}
              </ListGroup.Item>
              <ListGroup.Item as="a" href="/next/admin/settings/members">
                {t('member')}
              </ListGroup.Item>
              <ListGroup.Item as="a" href="/next/admin/settings/groups">
                {t('group')}
              </ListGroup.Item>
              <ListGroup.Item as="a" href="/next/admin/settings/ticket-fields">
                {t('ticketField')}
              </ListGroup.Item>
              <ListGroup.Item as="a" href="/next/admin/settings/ticket-forms">
                {t('ticketTemplate')}
              </ListGroup.Item>
              <ListGroup.Item as={NavLink} to="/settings/categories">
                {t('category')}
              </ListGroup.Item>
              <ListGroup.Item as={NavLink} to="/settings/tags">
                {t('tag')}
              </ListGroup.Item>
              <ListGroup.Item as={NavLink} to="/settings/quick-replies">
                {t('quickReply')}
              </ListGroup.Item>
              <ListGroup.Item as="a" href="/next/admin/settings/articles">
                {t('kb')} / {t('FAQ')}
              </ListGroup.Item>
              <ListGroup.Item as="a" href="/next/admin/settings/triggers">
                Triggers
              </ListGroup.Item>
              <ListGroup.Item as="a" href="/next/admin/settings/time-triggers">
                Time triggers
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
          <Route path={`${path}/articles`} exact>
            <FAQs {...childrenProps} />
          </Route>
          <Route path={`${path}/articles/:id`}>
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
