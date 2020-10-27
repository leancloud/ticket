import { Children, Component, PropTypes } from 'react'
import Polyglot from 'node-polyglot'

const zhPhrases = {
  world: '你好，世界'
}
  
const enPhrases = {
  world: 'Hello, World'
}

const messages = {
  en: enPhrases,
  zh: zhPhrases
}

class I18nProvider extends Component {
  getChildContext() {
    // eslint-disable-next-line react/prop-types
    const { locale } = this.props
    const polyglot = new Polyglot({
      locale,
      phrases: messages[locale],
    })
    const t = polyglot.t.bind(polyglot)
    return { locale, t }
  }

  render() {
    // eslint-disable-next-line react/prop-types
    return Children.only(this.props.children)
  }
}

I18nProvider.childContextTypes = {
  locale: PropTypes.string.isRequired,
  t: PropTypes.func.isRequired,
}

export default I18nProvider