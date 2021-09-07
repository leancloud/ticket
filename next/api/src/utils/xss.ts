import * as xss from "xss"

// get a copy of default whiteList
const whiteList = xss.getDefaultWhiteList();

// allow class attribute for span and code tag
whiteList.span?.push('class');
whiteList.code?.push('class');

// specified you custom whiteList
const myxss = new xss.FilterXSS({
  whiteList,
  css: false,
});

export default myxss;
