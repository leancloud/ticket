import React from 'react'
import PropTypes from 'prop-types'
import {Checkbox, OverlayTrigger, Tooltip} from 'react-bootstrap'
import {USER_TAG, USER_TAG_NAME} from '../../../lib/common'
import css from './index.css'

export function UserTag({tag}) {
  if (tag in USER_TAG) {
    const {name, tip} = USER_TAG[tag]
    const content = <span className={`${css.tag} ${css[tag]}`}>{name}</span>
    return tip
      ? (
        <OverlayTrigger placement="bottom" overlay={<Tooltip id={`${tag}-tip`}>{tip}</Tooltip>}>
          {content}
        </OverlayTrigger>
      )
      : content
  }
  return <span className={css.tag}>{tag}</span>
}
UserTag.propTypes = {
  tag: PropTypes.string
}

export function UserTagGroup({tags}) {
  if (!tags || tags.length === 0) {
    return null
  }
  return (
    <span>
      {tags.map(tag => <UserTag key={tag} tag={tag} />)}
    </span>
  )
}
UserTagGroup.propTypes = {
  tags: PropTypes.arrayOf(PropTypes.string)
}

export class UserTagManager extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      loading: false
    }
  }

  toggleTag(tag) {
    let ret
    if (this.props.tags.includes(tag)) {
      ret = this.props.onRemove(tag)
    } else {
      ret = this.props.onAdd(tag)
    }
    if (typeof ret.finally === 'function') {
      this.setState({loading: true})
      return ret.finally(() => this.setState({loading: false}))
    }
  }

  render() {
    return (
      <div className={css.manager}>
        <UserTagGroup tags={this.props.tags} />
        <div>
          <Checkbox
            checked={this.props.tags.includes(USER_TAG_NAME.MAJOR)}
            onChange={() => this.toggleTag(USER_TAG_NAME.MAJOR)}
            disabled={this.state.loading}
          >
            标记为{USER_TAG[USER_TAG_NAME.MAJOR].name}
          </Checkbox>
        </div>
      </div>
    )
  }
}
UserTagManager.propTypes = {
  tags: PropTypes.arrayOf(PropTypes.string),
  onAdd: PropTypes.func,
  onRemove: PropTypes.func
}
