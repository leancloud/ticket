[设计稿](https://www.figma.com/file/NGvD8ipURqGG7mwJ7PYljQ/%E5%AE%A2%E6%9C%8D%E7%B3%BB%E7%BB%9F)

## 环境变量

| Name                                                 | Required | Description                                                                   |
| ---------------------------------------------------- | -------- | ----------------------------------------------------------------------------- |
| `VITE_LC_TICKET_HOST`                                | no       | 用于检查是否为外链，用于在浏览器中打开等场景，默认为 `window.location.origin` |
| `SENTRY_WEB_DSN`(for build) or `VITE_SENTRY_WEB_DSN` | no       | Sentry DSN                                                                    |
