/*global $, ALGOLIA_API_KEY*/
import _ from 'lodash'
import React from 'react'
import PropTypes from 'prop-types'
import {FormGroup, ControlLabel, FormControl, Button, Tooltip, OverlayTrigger} from 'react-bootstrap'
import AV from 'leancloud-storage/live-query'
import docsearch from 'docsearch.js'

import TextareaWithPreview from './components/TextareaWithPreview'
import {
  defaultLeanCloudRegion,
  depthFirstSearchFind,
  getLeanCloudRegionText,
  getTicketAcl,
  getTinyCategoryInfo
} from '../lib/common'
import {uploadFiles, getCategoriesTree} from './common'
import OrganizationSelect from './OrganizationSelect'
import TagForm from './TagForm'
import translate from './i18n/translate'

class NewTicket extends React.Component {

  constructor(props) {
    super(props)
    let org = null
    if (this.props.selectedOrgId && this.props.selectedOrgId.length > 0) {
      org = _.find(this.props.organizations, {id: this.props.selectedOrgId})
    }
    this.state = {
      ticket: new AV.Object('Ticket', {
        organization: org || undefined,
        title: '',
        category: null,
        content: '',
        files: [],
        tags: [],
        ACL: getTicketAcl(AV.User.current(), org),
      }),
      categoriesTree: [],
      apps: [],
      isCommitting: false,
      appId: '',
      categoryPath: [],
    }
  }

  componentDidMount() {
    docsearch({
      apiKey: ALGOLIA_API_KEY,
      indexName: 'leancloud',
      inputSelector: '.docsearch-input',
      debug: false // Set debug to true if you want to inspect the dropdown
    })
    this.contentTextarea.addEventListener('paste', this.pasteEventListener.bind(this))
    AV.Cloud.run('checkPermission')
    .then(() => {
      return Promise.all([
        getCategoriesTree(),
        AV.Cloud.run('getLeanCloudApps')
        .catch((err) => {
          if (err.message.indexOf('Could not find LeanCloud authData:') === 0) {
            return []
          }
          throw err
        }),
      ])
    })
    .then(([categoriesTree, apps]) => {
      let {
        title=(localStorage.getItem('ticket:new:title') || ''),
        appId='',
        categoryIds=JSON.parse(localStorage.getItem('ticket:new:categoryIds') || '[]'),
        content=(localStorage.getItem('ticket:new:content') || '')
      } = this.props.location.query

      const categoryPath = _.compact(categoryIds.map(cid => depthFirstSearchFind(categoriesTree, c => c.id == cid)))
      const category = _.last(categoryPath)
      if (content === '' && category && category.get('qTemplate')) {
        content = category.get('qTemplate')
      }
      const ticket = this.state.ticket
      ticket.set('title', title)
      ticket.set('content', content)
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

  componentWillUnmount() {
    this.contentTextarea.removeEventListener('paste', this.pasteEventListener.bind(this))
  }

  pasteEventListener(e) {
    if (e.clipboardData.types.indexOf('Files') != -1) {
      this.setState({isCommitting: true})
      return uploadFiles(e.clipboardData.files)
      .then((files) => {
        const ticket = this.state.ticket
        const content = `${ticket.get('content')}\n<img src='${files[0].url()}' />`
        ticket.set('content', content)
        this.setState({isCommitting: false, ticket})
        return
      })
    }
  }

  handleTitleChange(e) {
    localStorage.setItem('ticket:new:title', e.target.value)
    const ticket = this.state.ticket
    ticket.set('title', e.target.value)
    this.setState({ticket})
  }

  handleCategoryChange(e, index, t) {
    const categoryPath = this.state.categoryPath.slice(0, index)

    const category = depthFirstSearchFind(this.state.categoriesTree, c => c.id === e.target.value)
    if (!category) {
      localStorage.setItem('ticket:new:categoryIds', JSON.stringify(categoryPath.map(c => c.id)))
      this.setState({categoryPath})
      return
    }

    categoryPath.push(category)
    const ticket = this.state.ticket
    if (ticket.get('content') && category.get('qTemplate')) {
      if (confirm(t('categoryChangeConfirm'))) {
        localStorage.setItem('ticket:new:categoryIds', JSON.stringify(categoryPath.map(c => c.id)))
        localStorage.setItem('ticket:new:content', category.get('qTemplate'))
        ticket.set('content', category.get('qTemplate'))
        this.setState({categoryPath, ticket})
        return
      } else {
        return false
      }
    }

    const content = category.get('qTemplate') || ticket.get('content') || ''
    localStorage.setItem('ticket:new:categoryIds', JSON.stringify(categoryPath.map(c => c.id)))
    localStorage.setItem('ticket:new:content', content)
    ticket.set('content', content)
    this.setState({categoryPath, ticket})
  }

  changeTagValue(key, value) {
    const ticket = this.state.ticket
    const tags = ticket.get('tags')
    let tag = _.find(tags, {key})
    if (!tag) {
      tags.push({key, value})
    } else {
      tag.value = value
    }
    this.setState({ticket})
  }

  handleAppChange(e) {
    this.setState({appId: e.target.value})
  }

  handleContentChange(e) {
    localStorage.setItem('ticket:new:content', e.target.value)
    const ticket = this.state.ticket
    ticket.set('content', e.target.value)
    this.setState({ticket})
  }

  handleSubmit(t, e) {
    e.preventDefault()

    const ticket = this.state.ticket
    if (!ticket.get('title') || ticket.get('title').trim().length === 0) {
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

    this.setState({isCommitting: true})
    return uploadFiles($('#ticketFile')[0].files)
    .then((files) => {
      ticket.set('category', getTinyCategoryInfo(_.last(this.state.categoryPath)))
      ticket.set('files', files)
      return ticket.save()
      .then((ticket) => {
        if (this.state.appId) {
          return new AV.Object('Tag').save({
            key: 'appId',
            value: this.state.appId,
            ticket,
            author: AV.User.current(),
            ACL: getTicketAcl(AV.User.current(), ticket.get('organization')),
          })
        }
        return
      })
    })
    .then(() => {
      this.setState({isCommitting: false})
      return
    })
    .then(() => {
      localStorage.removeItem('ticket:new:title')
      localStorage.removeItem('ticket:new:content')
      this.context.router.push('/tickets')
      return
    })
    .catch(this.context.addNotification)
  }

  render() {
    const {t} = this.props
    const getSelect = (categories, selectCategory, index) => {
      if (categories.length == 0) {
        return
      }

      const options = categories.map((category) => {
        return (
          <option key={category.id} value={category.id}>{category.get('name')}</option>
        )
      })
      return (
        <FormGroup key={'categorySelect' + index}>
          <ControlLabel>{index == 0 ? t('category') + ' ' : t('categoryLevel') + ' ' + index + 1 + ' ' + t('thCategory') + ' '}</ControlLabel>
          <FormControl componentClass="select" value={selectCategory && selectCategory.id || ''} onChange={(e) => this.handleCategoryChange(e, index, t)}>
            <option key='empty'></option>
            {options}
          </FormControl>
        </FormGroup>
      )
    }

    const appOptions = this.state.apps.map((app) => {
      if (defaultLeanCloudRegion === app.region) {
        return <option key={app.app_id} value={app.app_id}>{app.app_name}</option>
      }
      return <option key={app.app_id} value={app.app_id}>{app.app_name} ({getLeanCloudRegionText(app.region)})</option>
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

    const tooltip = (
      <Tooltip id="tooltip">{t('supportMarkdown')}</Tooltip>
    )
    const appTooltip = (
      <Tooltip id="appTooltip">如需显示北美和华东节点应用，请到帐号设置页面关联帐号</Tooltip>
    )

    const ticket = this.state.ticket
    return (
      <div>
        <form onSubmit={this.handleSubmit.bind(this, t)}>
          {this.props.organizations.length > 0 && <OrganizationSelect organizations={this.props.organizations}
            selectedOrgId={this.props.selectedOrgId}
            onOrgChange={this.props.handleOrgChange} />}
          <FormGroup>
            <ControlLabel>{t('title')}</ControlLabel>
            <input type="text" className="form-control docsearch-input" value={ticket.get('title')} 
               onChange={this.handleTitleChange.bind(this)} />
          </FormGroup>
          <FormGroup>
            <ControlLabel>
              相关应用 <OverlayTrigger placement="top" overlay={appTooltip}>
                <span className='icon-wrap'><span className='glyphicon glyphicon-question-sign'></span></span>
              </OverlayTrigger>
            </ControlLabel>
            <FormControl componentClass="select" value={this.state.appId} onChange={this.handleAppChange.bind(this)}>
              <option key='empty'></option>
              {appOptions}
            </FormControl>
          </FormGroup>

          {categorySelects}

          {this.context.tagMetadatas.map(tagMetadata => {
            const tags = ticket.get('tags')
            const tag = _.find(tags, t => t.key == tagMetadata.get('key'))
            return <TagForm key={tagMetadata.id}
                            tagMetadata={tagMetadata}
                            tag={tag}
                            changeTagValue={this.changeTagValue.bind(this)} />
          })}

          <FormGroup>
            <ControlLabel>
              {t('description')} <OverlayTrigger placement="top" overlay={tooltip}>
                <b className="has-required" title={t('supportMarkdown')}>M↓</b>
              </OverlayTrigger>
            </ControlLabel>
            <TextareaWithPreview componentClass="textarea" rows="8"
              value={ticket.get('content')}
              onChange={this.handleContentChange.bind(this)}
              inputRef={(ref) => this.contentTextarea = ref }
            />
          </FormGroup>
          <FormGroup>
            <input id="ticketFile" type="file" multiple />
          </FormGroup>
          <Button type='submit' disabled={this.state.isCommitting} bsStyle='success'>{t('submit')}</Button>
        </form>
      </div>
    )
  }

}

NewTicket.contextTypes = {
  router: PropTypes.object,
  addNotification: PropTypes.func.isRequired,
  tagMetadatas: PropTypes.array,
}

NewTicket.propTypes = {
  location: PropTypes.object,
  organizations: PropTypes.array,
  handleOrgChange: PropTypes.func,
  selectedOrgId: PropTypes.string,
  t: PropTypes.func,
}

export default translate(NewTicket)