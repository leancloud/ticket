import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from 'react-bootstrap'
import * as Icon from 'react-bootstrap-icons'
import PropTypes from 'prop-types'
import classNames from 'classnames'
import xss from 'xss'
import _ from 'lodash'

import css from './index.css'
import { UserLabel } from '../UserLabel'
import { Time } from './Time'

// get a copy of default whiteList
const whiteList = xss.getDefaultWhiteList()

// allow class attribute for span and code tag
whiteList.span.push('class')
whiteList.code.push('class')

// specified you custom whiteList
const myxss = new xss.FilterXSS({
  whiteList,
  css: false,
})

const IMAGE_FILE_MIMES = ['image/png', 'image/jpeg', 'image/gif']

export function ReplyCard({ data }) {
  const { t } = useTranslation()
  const [imageFiles, otherFiles] = useMemo(() => {
    return _.partition(data.files, (file) => IMAGE_FILE_MIMES.includes(file.mime))
  }, [data.files])

  return (
    <Card id={data.id} className={classNames({ [css.panelModerator]: data.is_customer_service })}>
      <Card.Header className={css.heading}>
        <UserLabel user={data.author} /> {t('submittedAt')}{' '}
        <Time value={data.created_at} href={'#' + data.id} />
        {data.is_customer_service && <i className={css.badge}>{t('staff')}</i>}
      </Card.Header>
      <Card.Body className={css.content}>
        <div
          className="markdown-body"
          dangerouslySetInnerHTML={{ __html: myxss.process(data.content_HTML) }}
        />
        {imageFiles.map(({ id, name, url }) => (
          <a key={id} href={url} target="_blank">
            <img src={url} alt={name} />
          </a>
        ))}
      </Card.Body>
      {otherFiles.length > 0 && (
        <Card.Footer>
          {otherFiles.map(({ id, name, url }) => (
            <div key={id}>
              <a href={url + '?attname=' + encodeURIComponent(name)} target="_blank">
                <Icon.Paperclip /> {name}
              </a>
            </div>
          ))}
        </Card.Footer>
      )}
    </Card>
  )
}
ReplyCard.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string.isRequired,
    author: PropTypes.object.isRequired,
    is_customer_service: PropTypes.bool,
    content_HTML: PropTypes.string.isRequired,
    files: PropTypes.array.isRequired,
  }),
}
