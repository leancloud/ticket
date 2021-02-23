import React from 'react'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import { Form, FormGroup, Table } from 'react-bootstrap'

// TODO: 使用新的 Context 语法
export default function Tags(props, context) {
  const { t } = useTranslation()
  return (
    <div>
      <Form inline>
        <FormGroup>
          <Link to={'/settings/tags/new'}>{t('newTag')}</Link>
        </FormGroup>
      </Form>
      <Table>
        <thead>
          <tr>
            <th>{t('tagName')}</th>
          </tr>
        </thead>
        <tbody>
          {context.tagMetadatas.map(m => (
            <tr key={m.id}>
              <td><Link to={`/settings/tags/${m.id}`}>{m.data.key}</Link></td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  )
}

Tags.contextTypes = {
  tagMetadatas: PropTypes.array,
}
