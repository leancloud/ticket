/*global FAQ_VIEWS*/
import React from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'
import {
  FormGroup,
  ControlLabel,
  FormControl,
  Button,
  Tooltip,
  OverlayTrigger
} from 'react-bootstrap'
import { db } from '../../lib/leancloud'
import TextareaWithPreview from '../components/TextareaWithPreview'

import translate from '../i18n/translate'

const VIEWS = FAQ_VIEWS.split(',').filter((view) => view)
const DEFAULT_PRIORITY = 10

class FAQ extends React.Component {
  componentDidMount() {
    const id = this.props.params.id
    return Promise.resolve()
      .then(() => {
        if (id == '_new') {
          return {
            question: '',
            answer: ''
          }
        }

        return db
          .class('FAQ')
          .object(id)
          .get()
          .then((faq) => faq.data)
      })
      .then((faq) => {
        const viewStates = _.fromPairs(
          VIEWS.map((view) => {
            const value = faq[`priority_${view}`]
            return [view, value === undefined ? '' : value]
          })
        )
        this.setState(
          _.extend(
            {
              isSubmitting: false
            },
            { faq },
            viewStates
          )
        )
        return
      })
  }

  updateFAQState(values) {
    return this.setState((state) =>
      _.extend({}, state, { faq: _.extend({}, state.faq, values) })
    )
  }

  handleQuestionChange(e) {
    this.updateFAQState({ question: e.target.value })
  }
  handleAnswerChange(e) {
    this.updateFAQState({ answer: e.target.value })
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
        const id = this.props.params.id
        if (id === '_new') {
          return db.class('FAQ').add(faq)
        } else {
          return db.class('FAQ').object(faq.objectId).update(faq)
        }
      })
      .then(() => {
        this.setState({ isSubmitting: false })
        this.context.router.push('/settings/faqs')
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
      <div>
        <form onSubmit={this.handleSubmit.bind(this)}>
          <FormGroup controlId="questionText">
            <ControlLabel>Question</ControlLabel>
            <FormControl
              type="text"
              value={this.state.faq.question}
              onChange={this.handleQuestionChange.bind(this)}
            />
          </FormGroup>
          <FormGroup controlId="answerText">
            <ControlLabel>
              Answer{' '}
              <b className="has-required" title={t('supportMarkdown')}>
                M↓
              </b>
            </ControlLabel>
            <TextareaWithPreview
              componentClass="textarea"
              rows="8"
              value={this.state.faq.answer}
              onChange={this.handleAnswerChange.bind(this)}
              inputRef={(ref) => (this.contentTextarea = ref)}
            />
          </FormGroup>
          {VIEWS.map((view) => (
            <FormGroup key={view}>
              <ControlLabel>
                <OverlayTrigger
                  overlay={<Tooltip id="tooltip">{t('viewHint')}</Tooltip>}
                >
                  <span>{view}❓</span>
                </OverlayTrigger>
              </ControlLabel>
              <FormControl
                type="number"
                value={this.state[view]}
                onChange={(e) => this.setState({ [view]: e.target.value })}
                placeholder={DEFAULT_PRIORITY}
              />
            </FormGroup>
          ))}
          <Button
            type="submit"
            disabled={this.state.isSubmitting}
            bsStyle="success"
          >
            {t('save')}
          </Button>{' '}
          <Button
            type="button"
            onClick={() => this.context.router.push('/settings/faqs')}
          >
            {t('return')}
          </Button>
        </form>
      </div>
    )
  }
}

FAQ.propTypes = {
  params: PropTypes.object.isRequired,
  t: PropTypes.func
}

FAQ.contextTypes = {
  router: PropTypes.object.isRequired,
  addNotification: PropTypes.func.isRequired
}

export default translate(FAQ)
