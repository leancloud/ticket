import { Remarkable } from 'remarkable';
import { linkify } from 'remarkable/linkify';
import hljs from 'highlight.js';

const md = new Remarkable({
  html: true,
  breaks: true,
  typographer: false,
  highlight: (str, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(lang, str).value;
      } catch {} // ignore
    }
    try {
      return hljs.highlightAuto(str).value;
    } catch {} // ignore
    return ''; // use external default escaping
  },
}).use(linkify);

export default function htmlify(content: string): string {
  return md.render(content);
}
