import React from 'react'
import { Card, Col, ListGroup, Row } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import { Link, Route, Switch, useRouteMatch } from 'react-router-dom'

import Profile from './Profile'
import Organization from './Organization'
import Organizations from './Organizations'
import OrganizationNew from './OrganizationNew'
import Tags from './Tags'
import Tag from './Tag'
import SettingsCSProfile from './CustomerServiceProfile'
import Members from './Members'
import FAQs from './FAQs'
import FAQ from './FAQ'
import Categories from './Categories'
import Category from './Category'
import CategorySort from './CategorySort'
import DynamicContent from './DynamicContent'

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
        <Card>
          <Card.Header>{t('settings')}</Card.Header>
          <ListGroup variant="flush">
            <ListGroup.Item>
              <Link to="/settings/profile">{t('personalSettings')}</Link>
            </ListGroup.Item>
            <ListGroup.Item>
              <Link to="/settings/organizations">{t('organizationSettings')}</Link>
            </ListGroup.Item>
          </ListGroup>
        </Card>
        {props.isCustomerService && (
          <Card>
            <Card.Header>{t('staffSettings')}</Card.Header>
            <ListGroup variant="flush">
              <ListGroup.Item>
                <Link to="/settings/customerServiceProfile">{t('personalSettings')}</Link>
              </ListGroup.Item>
              <ListGroup.Item>
                <Link to="/settings/members">{t('member')}</Link>
              </ListGroup.Item>
              <ListGroup.Item>
                <Link to="/settings/categories">{t('category')}</Link>
              </ListGroup.Item>
              <ListGroup.Item>
                <Link to="/settings/tags">{t('tag')}</Link>
              </ListGroup.Item>
              <ListGroup.Item>
                <Link to="/settings/faqs">{t('FAQ')}</Link>
              </ListGroup.Item>
              <ListGroup.Item>
                <Link to="/settings/dynamicContent">{t('dynamicContent')}</Link>
              </ListGroup.Item>
            </ListGroup>
          </Card>
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
