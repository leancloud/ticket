import React, { Component } from 'react'
import { Button, Form } from 'react-bootstrap'
import { withTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import _ from 'lodash'
import * as Icon from 'react-bootstrap-icons'

import { getCustomerServices, getCategoryPathName } from '../common'
import { UserLabel } from '../UserLabel'
import TagForm from '../TagForm'
import css from './index.css'
import csCss from '../CustomerServiceTickets.css'
import { depthFirstSearchFind } from '../../lib/common'
import CategoriesSelect from '../CategoriesSelect'
import { getConfig } from '../config'
import { MountCustomElement } from '../custom/element'

class TicketMetadata extends Component {
  constructor(props) {
    super(props)
    this.state = {
      isUpdateAssignee: false,
      isUpdateCategory: false,
      assignees: [],
    }
  }

  componentDidMount() {
    this.fetchDatas()
  }

  fetchDatas() {
    getCustomerServices()
      .then((assignees) => {
        this.setState({ assignees })
        return
      })
      .catch(this.context.addNotification)
  }

  handleAssigneeChange(e) {
    const customerService = _.find(this.state.assignees, { id: e.target.value })
    this.props
      .updateTicketAssignee(customerService)
      .then(() => {
        this.setState({ isUpdateAssignee: false })
        return
      })
      .then(this.context.addNotification)
      .catch(this.context.addNotification)
  }

  handleCategoryChange(e) {
    this.props
      .updateTicketCategory(
        depthFirstSearchFind(this.props.categoriesTree, (c) => c.id == e.target.value)
      )
      .then(() => {
        this.setState({ isUpdateCategory: false })
        return
      })
      .then(this.context.addNotification)
      .catch(this.context.addNotification)
  }

  handleTagChange(key, value, isPrivate) {
    return this.props.saveTag(key, value, isPrivate)
  }

  render() {
    const { t, ticket, isCustomerService } = this.props

    return (
      <>
        <Form.Group>
          <Form.Label>{t('assignee')}</Form.Label>
          {this.state.isUpdateAssignee ? (
            <Form.Control
              as="select"
              value={ticket.assignee_id}
              onChange={this.handleAssigneeChange.bind(this)}
            >
              {this.state.assignees.map((cs) => (
                <option key={cs.id} value={cs.id}>
                  {cs.data.username}
                </option>
              ))}
            </Form.Control>
          ) : (
            <Form.Group>
              <UserLabel user={ticket.assignee} />
              {isCustomerService && (
                <Button variant="link" onClick={() => this.setState({ isUpdateAssignee: true })}>
                  <Icon.PencilFill />
                </Button>
              )}
            </Form.Group>
          )}
        </Form.Group>

        <Form.Group>
          <Form.Label>{t('category')}</Form.Label>
          {this.state.isUpdateCategory ? (
            <CategoriesSelect
              categoriesTree={this.props.categoriesTree}
              selected={{ id: ticket.category_id }}
              onChange={this.handleCategoryChange.bind(this)}
            />
          ) : (
            <div>
              <span className={csCss.category + ' ' + css.categoryBlock}>
                {getCategoryPathName({ id: ticket.category_id }, this.props.categoriesTree)}
              </span>
              {isCustomerService && (
                <Button variant="link" onClick={() => this.setState({ isUpdateCategory: true })}>
                  <Icon.PencilFill />
                </Button>
              )}
            </div>
          )}
        </Form.Group>

        {isCustomerService && ticket.metadata && (
          <Form.Group>
            <Form.Label>{t('details')}</Form.Label>
            {Object.entries(ticket.metadata)
              .filter(([, v]) => v && (typeof v === 'string' || typeof v === 'number'))
              .map(([key, value]) => {
                const comments = getConfig('ticket.metadata.customMetadata.comments', {})
                return (
                  <div className={css.customMetadata} key={key}>
                    <span className={css.key}>{comments[key] || key}: </span>
                    {value}
                  </div>
                )
              })}
          </Form.Group>
        )}

        <MountCustomElement point="ticket.metadata" props={{ isCustomerService, ticket }} />

        {this.context.tagMetadatas.map((tagMetadata) => {
          const tags = ticket[tagMetadata.get('isPrivate') ? 'private_tags' : 'tags']
          const tag = _.find(tags, (t) => t.key == tagMetadata.get('key'))
          return (
            <TagForm
              key={tagMetadata.id}
              tagMetadata={tagMetadata}
              tag={tag}
              changeTagValue={this.handleTagChange.bind(this)}
              isCustomerService={isCustomerService}
            />
          )
        })}
      </>
    )
  }
}

TicketMetadata.propTypes = {
  isCustomerService: PropTypes.bool.isRequired,
  ticket: PropTypes.object.isRequired,
  categoriesTree: PropTypes.array.isRequired,
  updateTicketAssignee: PropTypes.func.isRequired,
  updateTicketCategory: PropTypes.func.isRequired,
  saveTag: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
}

TicketMetadata.contextTypes = {
  tagMetadatas: PropTypes.array,
}

export default withTranslation()(TicketMetadata)
