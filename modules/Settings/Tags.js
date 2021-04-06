import React, { useContext } from 'react'
import { Table } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { AppContext } from '../context'

export default function Tags() {
  const { t } = useTranslation()
  const { tagMetadatas } = useContext(AppContext)
  return (
    <div>
      <Link to={'/settings/tags/new'}>{t('newTag')}</Link>
      <Table>
        <thead>
          <tr>
            <th>{t('tagName')}</th>
          </tr>
        </thead>
        <tbody>
          {tagMetadatas.map((m) => (
            <tr key={m.id}>
              <td>
                <Link to={`/settings/tags/${m.id}`}>{m.data.key}</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  )
}
