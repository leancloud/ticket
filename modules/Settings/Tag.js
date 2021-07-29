import React, { Component } from 'react'
import { Button, Form, InputGroup, OverlayTrigger, Tooltip } from 'react-bootstrap'
import { withRouter } from 'react-router-dom'
import { withTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import * as Icon from 'react-bootstrap-icons'
import { db } from '../../lib/leancloud'

class Tag extends Component {
  constructor(props) {
    super(props)
    this.state = {
      tagMetadata: null,
      isSubmitting: false,
    }
  }

  componentDidMount() {
    const { id } = this.props.match.params
    return Promise.resolve()
      .then(() => {
        if (id == 'new') {
          return {
            key: '',
            type: 'select',
            values: [],
            isPrivate: false,
            ACL: {
              'role:customerService': { write: true, read: true },
              'role:staff': { read: true },
            },
          }
        } else {
          const tagMetadata = db.class('TagMetadata').object(id)
          return tagMetadata.get().then((t) => t.data)
        }
      })
      .then((tagMetadata) => {
        this.setState({
          tagMetadata,
        })
        return
      })
  }

  handleChangePrivate(isPrivate) {
    const tagMetadata = this.state.tagMetadata
    if (isPrivate) {
      tagMetadata.isPrivate = true
    } else {
      tagMetadata.isPrivate = false
    }
    this.setState({ tagMetadata })
  }

  handleKeyChange(e) {
    const tagMetadata = this.state.tagMetadata
    tagMetadata.key = e.target.value
    this.setState({ tagMetadata })
  }

  handleTypeChange(e) {
    const tagMetadata = this.state.tagMetadata
    tagMetadata.type = e.target.value
    this.setState({ tagMetadata })
  }

  addValueItem() {
    const tagMetadata = this.state.tagMetadata
    tagMetadata.values.push('')
    this.setState({ tagMetadata })
  }

  changeValue(index, value) {
    const tagMetadata = this.state.tagMetadata
    tagMetadata.values[index] = value
    this.setState({ tagMetadata })
  }

  handleSortUpdate(value, oriIndex, newIndex) {
    const tagMetadata = this.state.tagMetadata
    const values = tagMetadata.values
    values.splice(oriIndex, 1)
    values.splice(newIndex, 0, value)
    this.setState({ tagMetadata })
  }

  handleRemoveItem(index) {
    const tagMetadata = this.state.tagMetadata
    tagMetadata.values.splice(index, 1)
    this.setState({ tagMetadata })
  }

  handleRemove(t) {
    const result = confirm(t('confirmDeleteTag') + this.state.tagMetadata.key)
    if (result) {
      return (
        db
          .class('TagMetadata')
          .object(this.state.tagMetadata.objectId)
          .delete()
          // TODO 移除相关 ticket 的标签
          .then(() => {
            this.context.refreshTagMetadatas()
            this.props.history.push('/settings/tags')
            return
          })
          .catch(this.context.addNotification)
      )
    }
  }

  handleSubmit(e) {
    e.preventDefault()
    this.setState({ isSubmitting: true })

    const tagMetadata = this.state.tagMetadata
    const ACL = db.ACL().allow('role:customerService', 'read', 'write').allow('role:staff', 'read')
    if (!tagMetadata.isPrivate) {
      ACL.allow('*', 'read')
    }
    const data = Object.assign({}, tagMetadata, { ACL })
    return Promise.resolve()
      .then(() => {
        const { id } = this.props.match.params
        if (id === 'new') {
          return db.class('TagMetadata').add(data)
        } else {
          return db.class('TagMetadata').object(tagMetadata.objectId).update(data)
        }
      })
      .then(() => {
        this.setState({ isSubmitting: false })
        this.context.refreshTagMetadatas()
        this.props.history.push(`/settings/tags/${tagMetadata.id}`)
        return
      })
      .then(this.context.addNotification)
      .catch(this.context.addNotification)
  }

  render() {
    const { t } = this.props
    const { id } = this.props.match.params
    const tagMetadata = this.state.tagMetadata
    if (!tagMetadata) {
      return <div>{t('loading')}……</div>
    }

    return (
      <Form onSubmit={this.handleSubmit.bind(this)}>
        <Form.Group controlId="tagNameText">
          <Form.Label>{t('tagName')}</Form.Label>
          <Form.Control value={tagMetadata.key} onChange={this.handleKeyChange.bind(this)} />
        </Form.Group>
        <Form.Group>
          <Form.Label>{t('permission')}</Form.Label>
          <div>
            <Form.Check
              inline
              id="tagIsPrivate"
              checked={tagMetadata.isPrivate}
              onChange={(e) => this.handleChangePrivate(e.target.checked)}
              label={t('private')}
            />
            <OverlayTrigger
              placement="right"
              overlay={<Tooltip id="tooltip">{t('privateInfo')}</Tooltip>}
            >
              <Icon.QuestionCircleFill />
            </OverlayTrigger>
          </div>
        </Form.Group>
        <Form.Group>
          <Form.Label>{t('type')}</Form.Label>
          <div>
            <Form.Check
              inline
              id="selectTag"
              type="radio"
              name="tagTypeGroup"
              value="select"
              checked={tagMetadata.type == 'select'}
              onChange={this.handleTypeChange.bind(this)}
              label={t('tagTypeSelect')}
            />
            <OverlayTrigger
              placement="right"
              overlay={<Tooltip id="tooltip">{t('tagTypeSelectInfo')}</Tooltip>}
            >
              <Icon.QuestionCircleFill />
            </OverlayTrigger>
          </div>
          <div>
            <Form.Check
              inline
              id="textTag"
              type="radio"
              name="tagTypeGroup"
              value="text"
              checked={tagMetadata.type == 'text'}
              onChange={this.handleTypeChange.bind(this)}
              label={t('tagTypeAnyText')}
            />
            <OverlayTrigger
              placement="right"
              overlay={<Tooltip id="tooltip">{t('tagTypeAnyTextInfo')}</Tooltip>}
            >
              <Icon.QuestionCircleFill />
            </OverlayTrigger>
          </div>
        </Form.Group>
        {tagMetadata.type == 'select' && (
          <Form.Group>
            <Form.Label>{t('predefinedTags')}</Form.Label>
            {tagMetadata.values.map((value, index, array) => {
              return (
                <InputGroup key={index}>
                  <Form.Control
                    value={value}
                    onChange={(e) => this.changeValue(index, e.target.value)}
                  />
                  <InputGroup.Append>
                    <Button
                      variant="light"
                      disabled={index == 0}
                      onClick={() => this.handleSortUpdate(value, index, index - 1)}
                    >
                      <Icon.ChevronUp />
                    </Button>
                    <Button
                      variant="light"
                      disabled={index == array.length - 1}
                      onClick={() => this.handleSortUpdate(value, index, index + 1)}
                    >
                      <Icon.ChevronDown />
                    </Button>
                    <Button variant="light" onClick={() => this.handleRemoveItem(index)}>
                      <Icon.X />
                    </Button>
                  </InputGroup.Append>
                </InputGroup>
              )
            })}
            <Button variant="light" onClick={this.addValueItem.bind(this)}>
              <Icon.Plus />
            </Button>
          </Form.Group>
        )}
        <Button type="submit" variant="success">
          {t('save')}
        </Button>{' '}
        {id !== 'new' && (
          <Button onClick={this.handleRemove.bind(this, t)} variant="danger">
            {t('delete')}
          </Button>
        )}{' '}
        <Button variant="light" onClick={() => this.props.history.push('/settings/tags')}>
          {t('return')}
        </Button>
      </Form>
    )
  }
}

Tag.propTypes = {
  history: PropTypes.object.isRequired,
  match: PropTypes.object.isRequired,
  t: PropTypes.func.isRequired,
}

Tag.contextTypes = {
  addNotification: PropTypes.func.isRequired,
  refreshTagMetadatas: PropTypes.func.isRequired,
}

export default withTranslation()(withRouter(Tag))
