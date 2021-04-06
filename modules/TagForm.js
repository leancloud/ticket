import React from 'react'
import { Badge, Button, Form } from 'react-bootstrap'
import { withTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import validUrl from 'valid-url'

class TagForm extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      isUpdate: false,
      value: props.tag ? props.tag.value : '',
    }
  }

  handleChange(e) {
    const tagMetadata = this.props.tagMetadata
    if (tagMetadata.get('type') == 'select') {
      return this.props
        .changeTagValue(tagMetadata.get('key'), e.target.value, tagMetadata.get('isPrivate'))
        .then(() => {
          this.setState({ isUpdate: false })
          return
        })
    }

    this.setState({ value: e.target.value })
  }

  handleCommit() {
    const tagMetadata = this.props.tagMetadata
    return this.props
      .changeTagValue(tagMetadata.get('key'), this.state.value, tagMetadata.get('isPrivate'))
      .then(() => {
        this.setState({ isUpdate: false })
        return
      })
  }

  render() {
    const { t, tagMetadata, tag, isCustomerService } = this.props
    const isPrivate = tagMetadata.get('isPrivate')
    if (isPrivate && !isCustomerService) {
      return <div></div>
    }

    // 如果标签不存在，说明标签还没设置过。对于非客服来说则什么都不显示
    if (!tag && !isCustomerService) {
      return <div></div>
    }

    return (
      <Form.Group key={tagMetadata.get('key')}>
        <Form.Label>
          {tagMetadata.get('key')} {isPrivate && <Badge variant="secondary">Private</Badge>}
        </Form.Label>
        {this.state.isUpdate ? (
          tagMetadata.get('type') == 'select' ? (
            <Form.Control
              as="select"
              value={tag ? tag.value : ''}
              onChange={this.handleChange.bind(this)}
            >
              <option></option>
              {tagMetadata.get('values').map((v) => {
                return <option key={v}>{v}</option>
              })}
            </Form.Control>
          ) : (
            <Form.Group>
              <Form.Control value={this.state.value} onChange={this.handleChange.bind(this)} />
              <Button variant="success" onClick={this.handleCommit.bind(this)}>
                {t('save')}
              </Button>
              <Button onClick={() => this.setState({ isUpdate: false })}>{t('cancel')}</Button>
            </Form.Group>
          )
        ) : (
          <Form.Group>
            {tag ? (
              validUrl.isUri(tag.value) ? (
                <a href={tag.value} target="_blank">
                  {tag.value}
                </a>
              ) : (
                <span>{tag.value}</span>
              )
            ) : (
              `<${t('unconfigured')}>`
            )}
            {isCustomerService && (
              <Button variant="link" onClick={() => this.setState({ isUpdate: true })}>
                <i className="bi bi-pencil-fill"></i>
              </Button>
            )}
          </Form.Group>
        )}
      </Form.Group>
    )
  }
}

TagForm.propTypes = {
  tagMetadata: PropTypes.object.isRequired,
  tag: PropTypes.object,
  changeTagValue: PropTypes.func,
  isCustomerService: PropTypes.bool,
  t: PropTypes.func,
}

export default withTranslation()(TagForm)
