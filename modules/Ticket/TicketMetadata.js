import _ from 'lodash'
import React, {Component} from 'react'
import PropTypes from 'prop-types'
import {FormGroup, FormControl, Button} from 'react-bootstrap'
import LC from '../../lib/leancloud'

import {getCustomerServices, UserLabel, getCategoryPathName} from '../common'
import TagForm from '../TagForm'
import css from './index.css'
import csCss from '../CustomerServiceTickets.css'
import translate from '../i18n/translate'
import {depthFirstSearchFind} from '../../lib/common'
import CategoriesSelect from '../CategoriesSelect'

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
      .then(assignees => {
        this.setState({assignees})
        return
      })
      .catch(this.context.addNotification)
  }

  handleAssigneeChange(e) {
    const customerService = _.find(this.state.assignees, {id: e.target.value})
    this.props.updateTicketAssignee(customerService)
      .then(() => {
        this.setState({isUpdateAssignee: false})
        return
      })
      .then(this.context.addNotification)
      .catch(this.context.addNotification)
  }

  handleCategoryChange(e) {
    this.props.updateTicketCategory(depthFirstSearchFind(this.props.categoriesTree, c => c.id == e.target.value))
      .then(() => {
        this.setState({isUpdateCategory: false})
        return
      })
      .then(this.context.addNotification)
      .catch(this.context.addNotification)
  }

  handleTagChange(key, value, isPrivate) {
    return this.props.saveTag(key, value, isPrivate)
  }

  render() {
    const {t} = this.props
    const {ticket, isCustomerService} = this.props
    const assignee = ticket.data.assignee

    return (
      <div>
        <FormGroup>
          <label className="label-block">{t('assignee')}</label>
          {this.state.isUpdateAssignee ?
            <FormControl
              componentClass='select'
              value={assignee.id}
              onChange={this.handleAssigneeChange.bind(this)}
            >
              {this.state.assignees.map((cs) => <option key={cs.id} value={cs.id}>{cs.data.username}</option>)}
            </FormControl>
            :
            <span className={css.assignee}>
              <UserLabel user={assignee} />
              {isCustomerService &&
                <Button bsStyle='link' onClick={() => this.setState({isUpdateAssignee: true})}>
                  <span className='glyphicon glyphicon-pencil' aria-hidden="true"></span>
                </Button>
              }
            </span>
          }
        </FormGroup>
        <FormGroup>
          <label className="label-block">{t('category')}</label>
          {this.state.isUpdateCategory ?
            <CategoriesSelect categoriesTree={this.props.categoriesTree}
              selected={ticket.get('category')}
              onChange={this.handleCategoryChange.bind(this)} />
            :
            <div>
              <span className={csCss.category + ' ' + css.categoryBlock}>
                {getCategoryPathName(ticket.get('category'), this.props.categoriesTree, t)}
              </span>
              {isCustomerService &&
                <Button bsStyle='link' onClick={() => this.setState({isUpdateCategory: true})}>
                  <span className='glyphicon glyphicon-pencil' aria-hidden="true"></span>
                </Button>
              }
            </div>
          }
        </FormGroup>

        {isCustomerService && ticket.data.metaData && (
          <FormGroup>
            <label className="label-block">Metadata</label>
            {Object.entries(ticket.data.metaData).map(([key, value]) => (
              <div className={css.customMetadata} key={key}>
                <span className={css.key}>{key}: </span>{value}
              </div>
            ))}
          </FormGroup>
        )}

        {this.context.tagMetadatas.map(tagMetadata => {
          const tags = ticket.get(tagMetadata.get('isPrivate') ? 'privateTags' : 'tags')
          const tag = _.find(tags, t => t.key == tagMetadata.get('key'))
          return <TagForm key={tagMetadata.id}
                          tagMetadata={tagMetadata}
                          tag={tag}
                          changeTagValue={this.handleTagChange.bind(this)}
                          isCustomerService={isCustomerService} />
        })}
      </div>
    )
  }
}

TicketMetadata.propTypes = {
  isCustomerService: PropTypes.bool.isRequired,
  ticket: PropTypes.instanceOf(LC.LCObject),
  categoriesTree: PropTypes.array.isRequired,
  updateTicketAssignee: PropTypes.func.isRequired,
  updateTicketCategory: PropTypes.func.isRequired,
  saveTag: PropTypes.func.isRequired,
  t: PropTypes.func
}

TicketMetadata.contextTypes = {
  tagMetadatas: PropTypes.array,
}

export default translate(TicketMetadata)
