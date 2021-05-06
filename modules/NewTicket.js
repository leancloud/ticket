/* global ALGOLIA_API_KEY, ENABLE_LEANCLOUD_INTEGRATION */
import React from 'react'
import { Button, Form, Tooltip, OverlayTrigger } from 'react-bootstrap'
import { withTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import { auth, cloud, db, fetch } from '../lib/leancloud'
import docsearch from 'docsearch.js'
import qs from 'query-string'
import * as Icon from 'react-bootstrap-icons'
import _ from 'lodash'

import TextareaWithPreview from './components/TextareaWithPreview'
import { WeekendWarning } from './components/WeekendWarning'
import {
  defaultLeanCloudRegion,
  depthFirstSearchFind,
  getLeanCloudRegionText,
  getTicketAcl,
} from '../lib/common'
import { uploadFiles, getCategoriesTree } from './common'
import OrganizationSelect from './OrganizationSelect'
import { DocumentTitle } from './utils/DocumentTitle'
import FAQ from './components/FAQ'
import { withRouter } from 'react-router'

/**
 * @param {object} data
 * @returns {Promise<string>}
 */
async function createTicket(data) {
  const { objectId } = await fetch('/api/1/tickets', {
    method: 'POST',
    body: data,
  })
  return objectId
}

class NewTicket extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      ticket: {
        title: '',
        category: null,
        content: '',
        files: [],
        tags: [],
      },
      categoriesTree: [],
      apps: [],
      isCommitting: false,
      appId: '',
      categoryPath: [],
      FAQs: [],
    }
  }

  componentDidMount() {
    if (ALGOLIA_API_KEY) {
      docsearch({
        apiKey: ALGOLIA_API_KEY,
        indexName: 'leancloud',
        inputSelector: '.docsearch-input',
        debug: false, // Set debug to true if you want to inspect the dropdown
      })
    }

    const params = qs.parse(this.props.location.search)

    cloud
      .run('checkPermission')
      .then(() => {
        return Promise.all([
          getCategoriesTree(),
          ENABLE_LEANCLOUD_INTEGRATION
            ? cloud.run('getLeanCloudApps').catch((err) => {
                if (err.message.indexOf('Could not find LeanCloud authData:') === 0) {
                  return []
                }
                throw err
              })
            : Promise.resolve([]),
        ])
      })
      .then(([categoriesTree, apps]) => {
        const appId = params.appId || ''
        const title = params.title || localStorage.getItem('ticket:new:title') || ''
        const categoryIds = JSON.parse(localStorage.getItem('ticket:new:categoryIds') || '[]')
        const categoryPath = _.compact(
          categoryIds.map((cid) => depthFirstSearchFind(categoriesTree, (c) => c.id == cid))
        )
        const category = _.last(categoryPath)
        const content =
          localStorage.getItem('ticket:new:content') ||
          (category && category.get('qTemplate')) ||
          ''

        const ticket = this.state.ticket
        ticket.title = title
        ticket.content = content
        this.setState({
          ticket,
          categoriesTree,
          categoryPath,
          apps,
          appId,
        })
        return
      })
      .catch(this.context.addNotification)
  }

  handleTitleChange(e) {
    localStorage.setItem('ticket:new:title', e.target.value)
    const ticket = this.state.ticket
    ticket.title = e.target.value
    this.setState({ ticket })
  }

  handleCategoryChange(e, index, t) {
    const categoryPath = this.state.categoryPath.slice(0, index)

    const category = depthFirstSearchFind(this.state.categoriesTree, (c) => c.id === e.target.value)
    if (!category) {
      localStorage.setItem('ticket:new:categoryIds', JSON.stringify(categoryPath.map((c) => c.id)))
      this.setState({ categoryPath })
      return
    }

    categoryPath.push(category)
    const ticket = this.state.ticket
    if (ticket.content && category.get('qTemplate')) {
      if (confirm(t('categoryChangeConfirm'))) {
        localStorage.setItem(
          'ticket:new:categoryIds',
          JSON.stringify(categoryPath.map((c) => c.id))
        )
        localStorage.setItem('ticket:new:content', category.get('qTemplate'))
        ticket.content = category.get('qTemplate')
        this.setState({ categoryPath, ticket })
        return
      } else {
        return false
      }
    }

    const content = category.get('qTemplate') || ticket.content || ''
    localStorage.setItem('ticket:new:categoryIds', JSON.stringify(categoryPath.map((c) => c.id)))
    localStorage.setItem('ticket:new:content', content)
    ticket.content = content
    this.setState({ categoryPath, ticket })

    this.fetchFAQs(category)
      .then((FAQs) => this.setState({ FAQs }))
      .catch((error) => {
        this.setState({ FAQs: [] })
        console.warn('Failed to fetch FAQs for category', category, error.message)
      })
  }

  async fetchFAQs(category) {
    if (!category) {
      return []
    }
    const FAQs = category.get('FAQs')
    if (!FAQs || FAQs.length === 0) {
      return []
    }
    return (await category.get({ include: ['FAQs'] })).data.FAQs
  }

  changeTagValue(key, value) {
    const ticket = this.state.ticket
    const tags = ticket.tags
    let tag = _.find(tags, { key })
    if (!tag) {
      tags.push({ key, value })
    } else {
      tag.value = value
    }
    this.setState({ ticket })
  }

  handleAppChange(e) {
    this.setState({ appId: e.target.value })
  }

  handleContentChange(value) {
    localStorage.setItem('ticket:new:content', value)
    const ticket = this.state.ticket
    ticket.content = value
    this.setState({ ticket })
  }

  async handleSubmit(t, e) {
    e.preventDefault()

    const ticket = this.state.ticket
    if (!ticket.title || ticket.title.trim().length === 0) {
      this.context.addNotification(new Error(t('titleNonempty')))
      return
    }
    if (!this.state.categoryPath) {
      this.context.addNotification(new Error(t('categoryNonempty')))
      return
    }
    if (_.last(this.state.categoryPath).children.length > 0) {
      this.context.addNotification(new Error(t('categoryIncomplete')))
      return
    }

    this.setState({ isCommitting: true })
    try {
      const organization = this.props.selectedOrgId ? { id: this.props.selectedOrgId } : undefined
      const uploadedFiles = await uploadFiles(document.getElementById('ticketFile').files)
      const ticketId = await createTicket({
        title: ticket.title,
        content: ticket.content,
        files: uploadedFiles.map((file) => ({ objectId: file.id })),
        categoryId: _.last(this.state.categoryPath).id,
        organizationId: organization?.id,
      })
      if (this.state.appId) {
        await db.class('Tag').add({
          ticket: db.class('Ticket').object(ticketId),
          key: 'appId',
          value: this.state.appId,
          author: auth.currentUser,
          ACL: getTicketAcl(auth.currentUser, organization),
        })
      }
      localStorage.removeItem('ticket:new:title')
      localStorage.removeItem('ticket:new:content')
      this.props.history.push('/tickets')
    } catch (error) {
      this.context.addNotification(error)
    } finally {
      this.setState({ isCommitting: false })
    }
  }

  render() {
    const { t } = this.props
    const getSelect = (categories, selectCategory, index) => {
      if (categories.length == 0) {
        return
      }

      const options = categories.map((category) => {
        return (
          <option key={category.id} value={category.id}>
            {category.get('name')}
          </option>
        )
      })
      return (
        <Form.Group key={'categorySelect' + index}>
          <Form.Label>
            {index == 0
              ? t('category') + ' '
              : t('categoryLevel') + ' ' + (index + 1) + ' ' + t('thCategory') + ' '}
          </Form.Label>
          <Form.Control
            as="select"
            value={(selectCategory && selectCategory.id) || ''}
            onChange={(e) => this.handleCategoryChange(e, index, t)}
          >
            <option key="empty"></option>
            {options}
          </Form.Control>
        </Form.Group>
      )
    }

    const appOptions = this.state.apps.map((app) => {
      if (defaultLeanCloudRegion === app.region) {
        return (
          <option key={app.app_id} value={app.app_id}>
            {app.app_name}
          </option>
        )
      }
      return (
        <option key={app.app_id} value={app.app_id}>
          {app.app_name} ({getLeanCloudRegionText(app.region)})
        </option>
      )
    })

    const categorySelects = []
    for (let i = 0; i < this.state.categoryPath.length + 1; i++) {
      const selected = this.state.categoryPath[i]
      if (i == 0) {
        categorySelects.push(getSelect(this.state.categoriesTree, selected, i))
      } else {
        categorySelects.push(getSelect(this.state.categoryPath[i - 1].children, selected, i))
      }
    }

    const tooltip = <Tooltip id="tooltip">{t('supportMarkdown')}</Tooltip>
    const appTooltip = <Tooltip id="appTooltip">{t('appTooltip')}</Tooltip>

    const ticket = this.state.ticket
    return (
      <div>
        <DocumentTitle title={`${t('newTicket')} - LeanTicket`} />
        <WeekendWarning />
        <Form onSubmit={this.handleSubmit.bind(this, t)}>
          {this.props.organizations.length > 0 && (
            <OrganizationSelect
              organizations={this.props.organizations}
              selectedOrgId={this.props.selectedOrgId}
              onOrgChange={this.props.handleOrgChange}
            />
          )}
          <Form.Group>
            <Form.Label>{t('title')}</Form.Label>
            <Form.Control
              className="docsearch-input"
              value={ticket.title}
              onChange={this.handleTitleChange.bind(this)}
            />
          </Form.Group>
          {ENABLE_LEANCLOUD_INTEGRATION && (
            <Form.Group>
              <Form.Label>
                {t('associatedApplication')}{' '}
                <OverlayTrigger placement="top" overlay={appTooltip}>
                  <Icon.QuestionCircleFill />
                </OverlayTrigger>
              </Form.Label>
              <Form.Control
                as="select"
                value={this.state.appId}
                onChange={this.handleAppChange.bind(this)}
              >
                <option key="empty"></option>
                {appOptions}
              </Form.Control>
            </Form.Group>
          )}

          {categorySelects}

          {this.state.FAQs.length > 0 && (
            <Form.Group>
              <Form.Label>{t('FAQ')}</Form.Label>
              {this.state.FAQs.map((faq) => (
                <FAQ faq={faq} key={faq.id} />
              ))}
            </Form.Group>
          )}

          <Form.Group>
            <Form.Label>
              {t('description')}{' '}
              <OverlayTrigger placement="top" overlay={tooltip}>
                <Icon.Markdown />
              </OverlayTrigger>
            </Form.Label>
            <TextareaWithPreview
              rows="8"
              value={ticket.content}
              onChange={this.handleContentChange.bind(this)}
            />
          </Form.Group>
          <Form.Group>
            <Form.File id="ticketFile" multiple />
          </Form.Group>
          <Button type="submit" disabled={this.state.isCommitting} variant="success">
            {t('submit')}
          </Button>
        </Form>
      </div>
    )
  }
}

NewTicket.contextTypes = {
  addNotification: PropTypes.func.isRequired,
  tagMetadatas: PropTypes.array,
}

NewTicket.propTypes = {
  history: PropTypes.object.isRequired,
  location: PropTypes.object.isRequired,
  organizations: PropTypes.array,
  handleOrgChange: PropTypes.func,
  selectedOrgId: PropTypes.string,
  t: PropTypes.func,
}

export default withTranslation()(withRouter(NewTicket))
