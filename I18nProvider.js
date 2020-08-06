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
        const { locale } = this.props;
        const polyglot = new Polyglot({
            locale,
            phrases: messages[locale],
        });

        const translate = polyglot.t.bind(polyglot);

        return { locale, translate };
    };

    render() {
        return Children.only(this.props.children);
    }
};

I18nProvider.childContextTypes = {
    locale: PropTypes.string.isRequired,
    translate: PropTypes.func.isRequired,
};

export default I18nProvider;