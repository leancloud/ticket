import React, {Component} from 'react'
import PropTypes from 'prop-types'
import {FormControl} from 'react-bootstrap'
import Stackedit from 'stackedit-js'
import css from './index.css'

export default class TextareaWithPreview extends Component {
  constructor(props) {
    super(props)

    this.state = {
      value: props.value
    }

    this.inputRef = (ref, ...params) => {
      this.ref = ref
      if (this.props.inputRef) {
        this.props.inputRef(ref, ...params)
      }
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.value !== this.state.value) {
      this.setState({ value: nextProps.value })
    }
  }
  
  enterPreviewMode() {
    const editor = this._editor = this._editor || new Stackedit()
    editor.openFile({
      content: {
        text: this.state.value,
      }
    })
  
    // Listen to StackEdit events and apply the changes to the textarea.
    editor.off('fileChange')
    editor.on('fileChange', (file) => {
      this.setState({
        value: file.content.text,
      })
    })

      
    editor.off('close')
    editor.on('close', () => this.ref.focus())
  }

  render() {
    return (
      <div className={css.textareaWrapper}>
        <FormControl {...this.props} value={this.state.value} componentClass="textarea" inputRef={this.inputRef.bind(this)}/>
        <div onClick={this.enterPreviewMode.bind(this)} title="预览" className={css.preview}><span className="glyphicon glyphicon-fullscreen" aria-hidden="true"></span></div>
      </div>
    )
  }
}

TextareaWithPreview.propTypes = {
  value: PropTypes.any,
  inputRef: PropTypes.func
}

