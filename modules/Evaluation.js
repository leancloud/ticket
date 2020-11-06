import React, {Component} from 'react'
import PropTypes from 'prop-types'
import {FormGroup, FormControl, Alert, Button, Radio} from 'react-bootstrap'
import AV from 'leancloud-storage/live-query'



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
    const evaluation = this.props.ticket.get('evaluation')
    if (evaluation) {
      return <Alert bsStyle="warning">
          <p>对工单处理结果的评价：</p>
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
          <p>对工单的处理结果，您是否满意？</p>
          <form onSubmit={this.handleSubmit.bind(this)}>
            <FormGroup>
              <Radio name="radioGroup" inline value='1' onClick={this.handleStarChange.bind(this)}><span className="glyphicon glyphicon-thumbs-up" aria-hidden="true"></span></Radio>
              {' '}
              <Radio name="radioGroup" inline value='0' onClick={this.handleStarChange.bind(this)}><span className="glyphicon glyphicon-thumbs-down" aria-hidden="true"></span></Radio>
            </FormGroup>
            <FormGroup>
              <FormControl componentClass="textarea" placeholder="您可能想说些什么" rows="8" value={this.state.content} onChange={this.handleContentChange.bind(this)}/>
            </FormGroup>
            <Button type='submit'>提交</Button>
          </form>
        </Alert>
    }
  
    return <div></div>
  }
  }
  
Evaluation.propTypes = {
  ticket: PropTypes.instanceOf(AV.Object),
  isCustomerService: PropTypes.bool,
  saveEvaluation: PropTypes.func.isRequired,
}
  
Evaluation.contextTypes = {
  addNotification: PropTypes.func.isRequired,
}

export default Evaluation