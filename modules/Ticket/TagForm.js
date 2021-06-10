import React, { useState } from 'react'
import { Button, Form, InputGroup } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import { isUri } from 'valid-url'
import * as Icon from 'react-bootstrap-icons'
import { InternalBadge } from '../components/InternalBadge'

export function TagForm({ tagMetadata, tag, isCustomerService, onChange, disabled }) {
  const { t } = useTranslation()
  const [value, setValue] = useState(tag?.value || '')
  const [editing, setEditing] = useState(false)
  const [committing, setCommitting] = useState(false)

  if (tagMetadata.isPrivate && !isCustomerService) {
    return null
  }

  // 如果标签不存在，说明标签还没设置过。对于非客服来说则什么都不显示
  if (!tag && !isCustomerService) {
    return null
  }

  const handleCommit = async (value) => {
    setCommitting(true)
    try {
      await onChange(tagMetadata.key, value, tagMetadata.isPrivate)
      setEditing(false)
    } finally {
      setCommitting(false)
    }
  }

  return (
    <Form.Group>
      <Form.Label>
        {tagMetadata.key} {tagMetadata.isPrivate && <InternalBadge/>}
      </Form.Label>
      {editing ? (
        tagMetadata.type == 'select' ? (
          <Form.Control
            as="select"
            value={tag?.value || ''}
            disabled={disabled || committing}
            onChange={(e) => handleCommit(e.target.value)}
            onBlur={() => setEditing(false)}
          >
            <option></option>
            {tagMetadata.values.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </Form.Control>
        ) : (
          <Form.Group>
            <InputGroup className="mb-3">
              <Form.Control
                value={value}
                disabled={disabled || committing}
                onChange={(e) => setValue(e.target.value)}
              />
              <InputGroup.Append>
                <Button disabled={disabled || committing} onClick={() => handleCommit(value)}>
                  {t('save')}
                </Button>
                <Button
                  variant="secondary"
                  disabled={disabled || committing}
                  onClick={() => setEditing(false)}
                >
                  {t('cancel')}
                </Button>
              </InputGroup.Append>
            </InputGroup>
          </Form.Group>
        )
      ) : (
        <div className="d-flex align-items-center">
          {tag ? (
            isUri(tag.value) ? (
              <a href={tag.value} target="_blank">
                {tag.value}
              </a>
            ) : (
              <span>{tag.value}</span>
            )
          ) : (
            `<${t('unset')}>`
          )}
          {isCustomerService && (
            <Button variant="link" disabled={disabled} onClick={() => setEditing(true)}>
              <Icon.PencilFill />
            </Button>
          )}
        </div>
      )}
    </Form.Group>
  )
}
TagForm.propTypes = {
  tagMetadata: PropTypes.object.isRequired,
  tag: PropTypes.object,
  onChange: PropTypes.func.isRequired,
  isCustomerService: PropTypes.bool,
  disabled: PropTypes.bool,
}
