/*global BRAND_NAME */
import React, { useContext } from 'react'
import { Button, Container, Nav, Navbar, NavDropdown } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import i18next from 'i18next'
import PropTypes from 'prop-types'
import * as Icon from 'react-bootstrap-icons'
import { getUserDisplayName } from '../lib/common'
import { getConfig } from './config'
import { AppContext } from './context'
import { http } from '../lib/leancloud'
import { useQuery } from 'react-query'
import EmptyBadge from './components/EmptyBadge'
import { Avatar } from './Avatar'

export default function GlobalNav({ user, onLogout }) {
  const { t } = useTranslation()
  const { currentUser, isUser, isStaff, isCustomerService, isAdmin, isCollaborator } = useContext(
    AppContext
  )

  const handleChangeLanguage = (lang) => {
    i18next.changeLanguage(lang)
  }

  const { data: unread } = useQuery({
    queryKey: 'unread',
    queryFn: () => http.get('/api/2/unread'),
    staleTime: 300_000,
    enabled: !!currentUser,
  })

  return (
    <Navbar bg="light" expand="md" fixed="top">
      <Container fluid="xl">
        <Navbar.Brand className="font-logo" as={Link} to="/">
          {getConfig('nav.home.title', BRAND_NAME)}
        </Navbar.Brand>

        <Navbar.Toggle />

        <Navbar.Collapse>
          <Nav className="mr-auto">
            {!isUser ? (
              <>
                <Nav.Link
                  as={Link}
                  to={getConfig(
                    'nav.customerServiceTickets.href',
                    '/customerService/tickets?assignee=me&stage=todo'
                  )}
                >
                  {t('customerServiceTickets')}
                </Nav.Link>
                <Nav.Link as={Link} to={getConfig('nav.stats.href', '/customerService/stats')}>
                  {t('statistics')}
                </Nav.Link>
              </>
            ) : (
              <Nav.Link as={Link} to={getConfig('nav.tickets.href', '/tickets')}>
                {t('ticketList')}
              </Nav.Link>
            )}
          </Nav>
          <Nav>
            {user && (
              <Button className="mx-3" variant="success" as={Link} to="/tickets/new">
                {t('newTicket')}
              </Button>
            )}
            <Nav.Link as={Link} to="/notifications">
              <Icon.BellFill />
              {unread > 0 && <EmptyBadge />}
            </Nav.Link>
            {/* eslint-disable i18n/no-chinese-character */}
            <NavDropdown className="mx-2" title="EN/中">
              <NavDropdown.Item onClick={() => handleChangeLanguage('en')}>
                English
              </NavDropdown.Item>
              <NavDropdown.Item onClick={() => handleChangeLanguage('zh')}>中文</NavDropdown.Item>
              <NavDropdown.Item onClick={() => handleChangeLanguage('ko')}>한국어</NavDropdown.Item>
            </NavDropdown>
            {/* eslint-enable i18n/no-chinese-character */}
            {user ? (
              <NavDropdown
                title={
                  <span>
                    <Avatar user={user} width={20} height={20} />
                    <span className="ml-1">{getUserDisplayName(user)}</span>
                    {isAdmin ? (
                      <Icon.PersonFillGear title="Admin" className="ml-1" />
                    ) : isCustomerService ? (
                      <Icon.Headset title="Agent" className="ml-1" />
                    ) : isStaff ? (
                      <Icon.PersonBadge title="Staff" className="ml-1" />
                    ) : isCollaborator ? (
                      <Icon.WrenchAdjustable title="Staff" className="ml-1" />
                    ) : null}
                  </span>
                }
              >
                <NavDropdown.Item as={Link} to="/settings">
                  {t('settings')}
                </NavDropdown.Item>
                <NavDropdown.Item onClick={onLogout}>{t('logout')}</NavDropdown.Item>
              </NavDropdown>
            ) : (
              <Nav.Link as={Link} to="/login">
                {t('login')}
              </Nav.Link>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  )
}
GlobalNav.propTypes = {
  user: PropTypes.object,
  onLogout: PropTypes.func.isRequired,
}
