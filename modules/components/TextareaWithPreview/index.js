import React, {Component} from 'react'
import PropTypes from 'prop-types'
import {FormControl} from 'react-bootstrap'
import Stackedit from 'stackedit-js'
import css from './index.css'
import translate from '../../i18n/translate'
import _ from 'lodash'
import {uploadFiles} from '../../common'

class TextareaWithPreview extends Component {
  constructor(props) {
    super(props)

    this.state = {
      value: props.value,
      disabled: props.disabled,
    }

    this.inputRef = (ref, ...params) => {
      this.ref = ref
      if (this.props.inputRef) {
        this.props.inputRef(ref, ...params)
      }
    }
    this.dispatchChangeEvent = () => {
      const evt = new Event('change', { bubbles: true })
      evt.simulated = true
      this.ref.dispatchEvent(evt)
    }
  }
  componentDidMount() {
    this.ref.addEventListener('paste', this.pasteEventListener.bind(this))
  }

  componentWillUnmount() {
    this.ref.removeEventListener('paste', this.pasteEventListener.bind(this))
  }

  pasteEventListener(e) {
    if (this.state.disabled) {
      return
    }
    if (e.clipboardData.types.indexOf('Files') != -1) {
      this.setState({disabled: true})
      return uploadFiles(e.clipboardData.files)
      .then((files) => {
        const newValue = `${this.props.value}\n<img src='${files[0].url}' />`
        this.setState({disabled: this.props.disabled, value: newValue}, () => {
          this.dispatchChangeEvent()
          this.ref.focus() 
        })
        return
      })
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
      }, this.dispatchChangeEvent)
    })

      
    editor.off('close')
    editor.on('close', () => this.ref.focus())
  }

  render() {
    const {t} = this.props
    return (
      <div className={css.textareaWrapper}>
        <FormControl {..._.omit(this.props, ['t', 'locale', 'disabled'])} value={this.state.value} disabled={this.state.disabled} componentClass="textarea" inputRef={this.inputRef.bind(this)}/>
        <div onClick={this.enterPreviewMode.bind(this)} title={t('preview')} className={css.preview}><span className="glyphicon glyphicon-fullscreen" aria-hidden="true"></span></div>
      </div>
    )
  }
}

TextareaWithPreview.propTypes = {
  value: PropTypes.any,
  inputRef: PropTypes.func,
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  t: PropTypes.func,
}

export default translate(TextareaWithPreview)