import { Children, Component } from 'react'
import PropTypes from 'prop-types'
import Polyglot from 'node-polyglot'
import locales from './locales'

const defaultLocale = window.navigator.language.slice(0, 2) === 'zh' ? 'zh' : 'en'
const userLocale = window.localStorage.getItem('locale')
export const locale = userLocale || defaultLocale

class I18nProvider extends Component {
  getChildContext() {
    // eslint-disable-next-line react/prop-types
    const { locale } = this.props
    const polyglot = new Polyglot({
      locale,
      phrases: locales[locale],
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