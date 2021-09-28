/*global FAQ_VIEWS*/
import React from 'react'
import { Button, Form, OverlayTrigger, Tooltip } from 'react-bootstrap'
import { withTranslation } from 'react-i18next'
import { withRouter } from 'react-router-dom'
import PropTypes from 'prop-types'
import _ from 'lodash'
import * as Icon from 'react-bootstrap-icons'

import { db } from '../../lib/leancloud'
import TextareaWithPreview from '../components/TextareaWithPreview'

const VIEWS = FAQ_VIEWS.split(',').filter((view) => view)
const DEFAULT_PRIORITY = 10

class FAQ extends React.Component {
  componentDidMount() {
    const { id } = this.props.match.params
    return Promise.resolve()
      .then(() => {
        if (id == '_new') {
          return {
            question: '',
            answer: '',
          }
        }

        return db
          .class('FAQ')
          .object(id)
          .get()
          .then((faq) => faq.data)
      })
      .then((faq) => {
        const { question, answer } = faq
        const viewStates = _.fromPairs(
          VIEWS.map((view) => {
            const value = faq[`priority_${view}`]
            return [view, value === undefined ? '' : value]
          })
        )
        this.setState(
          _.extend(
            {
              isSubmitting: false,
            },
            {
              faq: {
                question,
                answer,
              },
            },
            viewStates
          )
        )
        return
      })
  }

  updateFAQState(values) {
    return this.setState((state) => _.extend({}, state, { faq: _.extend({}, state.faq, values) }))
  }

  handleQuestionChange(e) {
    this.updateFAQState({ question: e.target.value })
  }

  handleAnswerChange(value) {
    this.updateFAQState({ answer: value })
  }

  handleSubmit(e) {
    e.preventDefault()
    this.setState({ isSubmitting: true })
    const faq = _.clone(this.state.faq)

    VIEWS.forEach((view) => {
      const key = `priority_${view}`
      const value = this.state[view]
      faq[key] = value === '' ? DEFAULT_PRIORITY : Number(value)
    })

    return Promise.resolve()
      .then(() => {
        const { id } = this.props.match.params
        if (id === '_new') {
          return db.class('FAQ').add(faq)
        } else {
          return db.class('FAQ').object(id).update(faq)
        }
      })
      .then(() => {
        this.setState({ isSubmitting: false })
        this.props.history.push('/settings/articles')
        return
      })
      .then(this.context.addNotification)
      .catch(this.context.addNotification)
  }

  render() {
    const { t } = this.props
    if (!this.state) {
      return <div>{t('loading')}……</div>
    }

    return (
      <Form onSubmit={this.handleSubmit.bind(this)}>
        <Form.Group controlId="questionText">
          <Form.Label>Question</Form.Label>
          <Form.Control
            value={this.state.faq.question}
            onChange={this.handleQuestionChange.bind(this)}
          />
        </Form.Group>
        <Form.Group controlId="answerText">
          <Form.Label>
            Answer <Icon.Markdown title={t('supportMarkdown')} />
          </Form.Label>
          <TextareaWithPreview
            rows="8"
            value={this.state.faq.answer}
            onChange={this.handleAnswerChange.bind(this)}
          />
        </Form.Group>
        {VIEWS.map((view) => (
          <Form.Group key={view}>
            <Form.Label>
              <OverlayTrigger overlay={<Tooltip id="tooltip">{t('viewHint')}</Tooltip>}>
                <span>{view}❓</span>
              </OverlayTrigger>
            </Form.Label>
            <Form.Control
              type="number"
              value={this.state[view]}
              onChange={(e) => this.setState({ [view]: e.target.value })}
              placeholder={DEFAULT_PRIORITY}
            />
          </Form.Group>
        ))}
        <Button type="submit" disabled={this.state.isSubmitting} variant="success">
          {t('save')}
        </Button>{' '}
        <Button variant="light" onClick={() => this.props.history.push('/settings/articles')}>
          {t('return')}
        </Button>
      </Form>
    )
  }
}

FAQ.propTypes = {
  history: PropTypes.object.isRequired,
  match: PropTypes.object.isRequired,
  t: PropTypes.func,
}

FAQ.contextTypes = {
  addNotification: PropTypes.func.isRequired,
}

export default withTranslation()(withRouter(FAQ))
