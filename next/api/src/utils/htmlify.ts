import { Remarkable } from 'remarkable';
import hljs from 'highlight.js';

const md = new Remarkable({
  html: true,
  breaks: true,
  linkify: true,
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
});

export default function htmlify(content: string): string {
  return md.render(content);
}
