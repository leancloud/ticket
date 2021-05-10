import React, { memo, useCallback, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { useRouteMatch, Link } from 'react-router-dom'
import { useTranslation, Trans } from 'react-i18next'
import { Button } from 'react-bootstrap'
import Table from 'modules/components/table'
import { DocumentTitle } from '../../utils/DocumentTitle'
import Pagination, { usePagination } from 'modules/components/Pagination'
import { NoDataRow } from 'modules/components/NoData'
import { useDefault, useSmoothReload, createResourceHook } from '@leancloud/use-resource'
import { useAppContext } from 'modules/context'
import Confirm from 'modules/components/Confirm'
import { fetch } from 'lib/leancloud'
import styles from './index.module.scss'


const useFieldList = createResourceHook((skip, size) => {
   const abortController = new AbortController()
   return {
     abort: () => abortController.abort(),
     promise: fetch(
       `/api/1/ticket-fields?${new URLSearchParams({
         size,
         skip,
       }).toString()}`,
       {
         signal: abortController.signal,
       }
     ),
   }
})

const FieldRow = memo(({ data, onDeleted }) => {
  const { t } = useTranslation()
  const match = useRouteMatch()
  const { addNotification } = useAppContext()
  const [deleting, setDeleting] = useState(false)
  const { title, type, required, id } = data
  const _delete = useCallback(async () => {
    try {
      await fetch(`/api/1/ticket-fields/${id}`, {
        method: 'PATCH',
        body: {
          active: false,
        },
      })
      setDeleting(false)
      onDeleted()
    } catch (error) {
      setDeleting(false)
      addNotification(error)
    }
  }, [id, addNotification, onDeleted])
  const TitleConfirm = () => <code>{title}</code>
  return (
    <tr>
      <td>{title}</td>
      <td>{t(`ticketField.type.${type}`)}</td>
      <td>{t(`ticketField.required.${required ? 'yes' : 'no'}`)}</td>
      <td>
        <Button variant="link" as={Link} to={`${match.path}/${id}`} >
          {t('edit')}
        </Button>
        <Confirm
          header={
            <Trans
              i18nKey="ticketField.delete"
              components={{
                Title: <TitleConfirm />,
              }}
            />
          }
          danger
          onConfirm={_delete}
          confirmButtonText={t('delete')}
          content={t('ticketField.deleteHint')}
          trigger={
            <Button variant="link"  className="text-danger" disabled={deleting}>
              {t('delete')}
            </Button>
          }
        />
      </td>
    </tr>
  )
})

FieldRow.propTypes = {
  data: PropTypes.object.isRequired,
  onDeleted: PropTypes.func.isRequired,
}



const FieldList = memo(() => {
  const { t } = useTranslation()
  const match = useRouteMatch()
  const { addNotification } = useAppContext()
  const { skip, pageSize } = usePagination()
  const [{ count, fields }, { loading, error, reload }] = useSmoothReload(
    useDefault(
      useFieldList([skip, pageSize], {
        deps: [skip, pageSize],
      }),
      {
        count: 0,
        fields: [],
      }
    )
  )
  useEffect(() => {
    if (error) {
      addNotification(error)
    }
  }, [error, addNotification])
  return (
    <div>
      <div>
        <div className="mb-3">
          <DocumentTitle title={`${t('ticketField')} - LeanTicket`} />
          <Link to={`${match.path}/new`}>
            <Button variant="primary">{t('ticketField.add')}</Button>
          </Link>
        </div>
        <Table loading={loading} className={styles.table}>
          <thead>
            <tr>
              <th>{t('name')}</th>
              <th>{t('type')}</th>
              <th>{t('required')}</th>
              <th>{t('operation')}</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((fieldData) => (
              <FieldRow data={fieldData} key={fieldData.id} onDeleted={reload} />
            ))}
            {!loading && fields.length === 0 && <NoDataRow />}
          </tbody>
        </Table>
        {count > 0 && <Pagination count={count} />}
      </div>
    </div>
  )
})

export default FieldList
