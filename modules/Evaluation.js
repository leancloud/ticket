import React, {Component} from 'react'
import PropTypes from 'prop-types'
import {FormGroup, FormControl, Alert, Button, Radio} from 'react-bootstrap'
import LC from '../lib/leancloud'

import translate from './i18n/translate'

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
    this.setState({star: parseInt(e.target.value)})
  }
  
  handleContentChange(e) {
    localStorage.setItem(`ticket:${this.props.ticket.id}:evaluation`, e.target.value)
    this.setState({content: e.target.value})
  }
  
  handleSubmit(e) {
    e.preventDefault()
    this.props.saveEvaluation({
      star: this.state.star,
      content: this.state.content
    })
      .then(() => {
        localStorage.removeItem(`ticket:${this.props.ticket.id}:evaluation`)
        return
      })
      .catch(this.context.addNotification)
  }
  
  render() {
    const {t} = this.props
    const evaluation = this.props.ticket.get('evaluation')
    if (evaluation) {
      return <Alert bsStyle="warning">
          <p>{t('feedback')}</p>
          <FormGroup>
            <Radio name="radioGroup" inline disabled defaultChecked={evaluation.star === 1}><span className="glyphicon glyphicon-thumbs-up" aria-hidden="true"></span></Radio>
            {' '}
            <Radio name="radioGroup" inline disabled defaultChecked={evaluation.star === 0}><span className="glyphicon glyphicon-thumbs-down" aria-hidden="true"></span></Radio>
          </FormGroup>
          <FormGroup>
            <FormControl componentClass="textarea" rows="8" value={evaluation.content} disabled />
          </FormGroup>
        </Alert>
    }
  
    if (!this.props.isCustomerService) {
      return <Alert bsStyle="warning">
          <p>{t('satisfiedOrNot')}</p>
          <form onSubmit={this.handleSubmit.bind(this)}>
            <FormGroup>
              <Radio name="radioGroup" inline value='1' onClick={this.handleStarChange.bind(this)}><span className="glyphicon glyphicon-thumbs-up" aria-hidden="true"></span></Radio>
              {' '}
              <Radio name="radioGroup" inline value='0' onClick={this.handleStarChange.bind(this)}><span className="glyphicon glyphicon-thumbs-down" aria-hidden="true"></span></Radio>
            </FormGroup>
            <FormGroup>
              <FormControl componentClass="textarea" placeholder={t('haveSomethingToSay')} rows="8" value={this.state.content} onChange={this.handleContentChange.bind(this)}/>
            </FormGroup>
            <Button type='submit'>{t('submit')}</Button>
          </form>
        </Alert>
    }
  
    return <div></div>
  }
  }
  
Evaluation.propTypes = {
  ticket: PropTypes.instanceOf(LC.LCObject),
  isCustomerService: PropTypes.bool,
  saveEvaluation: PropTypes.func.isRequired,
  t: PropTypes.func
}
  
Evaluation.contextTypes = {
  addNotification: PropTypes.func.isRequired,
}

export default translate(Evaluation)