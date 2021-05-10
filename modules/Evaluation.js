import React, { Component } from 'react'
import { Alert, Button, Form } from 'react-bootstrap'
import { withTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import * as Icon from 'react-bootstrap-icons'

class Evaluation extends Component {
  constructor(props) {
    super(props)
    this.state = {
      isAlreadyEvaluation: false,
      star: 1,
      content: localStorage.getItem(`ticket:${this.props.ticket.id}:evaluation`) || '',
    }
  }

  handleStarChange(e) {
    this.setState({ star: parseInt(e.target.value) })
  }

  handleContentChange(e) {
    localStorage.setItem(`ticket:${this.props.ticket.id}:evaluation`, e.target.value)
    this.setState({ content: e.target.value })
  }

  handleSubmit(e) {
    e.preventDefault()
    this.props
      .saveEvaluation({
        star: this.state.star,
        content: this.state.content,
      })
      .then(() => {
        localStorage.removeItem(`ticket:${this.props.ticket.id}:evaluation`)
        return
      })
      .catch(this.context.addNotification)
  }

  render() {
    const {
      t,
      ticket: { evaluation },
    } = this.props
    if (evaluation) {
      return (
        <Alert variant="warning">
          {t('feedback')}
          <Form.Group>
            <Form.Check
              type="radio"
              inline
              disabled
              defaultChecked={evaluation.star === 1}
              label={<Icon.HandThumbsUp />}
            />
            <Form.Check
              type="radio"
              inline
              disabled
              defaultChecked={evaluation.star === 0}
              label={<Icon.HandThumbsDown />}
            />
          </Form.Group>
          <Form.Group>
            <Form.Control as="textarea" rows="8" value={evaluation.content} disabled />
          </Form.Group>
        </Alert>
      )
    }

    if (!this.props.isCustomerService) {
      return (
        <Alert variant="warning">
          {t('satisfiedOrNot')}
          <Form onSubmit={this.handleSubmit.bind(this)}>
            <Form.Group>
              <Form.Check
                type="radio"
                inline
                value="1"
                onClick={this.handleStarChange.bind(this)}
                label={<Icon.HandThumbsUp />}
              />
              <Form.Check
                type="radio"
                inline
                value="0"
                onClick={this.handleStarChange.bind(this)}
                label={<Icon.HandThumbsDown />}
              />
            </Form.Group>
            <Form.Group>
              <Form.Control
                as="textarea"
                placeholder={t('haveSomethingToSay')}
                rows="8"
                value={this.state.content}
                onChange={this.handleContentChange.bind(this)}
              />
            </Form.Group>
            <Button type="submit" variant="light">
              {t('submit')}
            </Button>
          </Form>
        </Alert>
      )
    }

    return null
  }
}

Evaluation.propTypes = {
  ticket: PropTypes.object.isRequired,
  isCustomerService: PropTypes.bool,
  saveEvaluation: PropTypes.func.isRequired,
  t: PropTypes.func,
}

Evaluation.contextTypes = {
  addNotification: PropTypes.func.isRequired,
}

export default withTranslation()(Evaluation)
