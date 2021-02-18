import React from 'react'
import PropTypes from 'prop-types'
import css from './index.css'

class FAQ extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      collapsed: true
    }
  }

  toggleCollaped() {
    this.setState(({ collapsed }) => ({ collapsed: !collapsed }))
  }

  render() {
    const { faq } = this.props
    if (!faq) return null
    return (
      <div>
        <p onClick={this.toggleCollaped.bind(this)}>
          <a href="#">{faq.get('question')}</a>
        </p>
        {!this.state.collapsed && (
          <p
            className={css.faq_answer}
            dangerouslySetInnerHTML={{ __html: faq.get('answer_HTML') }}
          />
        )}
      </div>
    )
  }
}

FAQ.propTypes = {
  faq: PropTypes.shape({
    question: PropTypes.string,
    answer_HTML: PropTypes.string
  })
}

export default FAQ
