import React, { memo } from 'react'
import PropTypes from 'prop-types'
import { useRouteMatch, Link } from 'react-router-dom'
import { useTranslation, Trans } from 'react-i18next'
import { useQuery, useMutation } from 'react-query'
import { Button, Table } from 'react-bootstrap'
import { DocumentTitle } from '../../utils/DocumentTitle'
import Pagination, { usePagination } from 'modules/components/Pagination'
import { NoDataRow } from 'modules/components/NoData'
import { useAppContext } from 'modules/context'
import Confirm from 'modules/components/Confirm'
import { http } from 'lib/leancloud'
import styles from './index.module.scss'

const FieldRow = memo(({ data, onDeleted }) => {
  const { t } = useTranslation()
  const match = useRouteMatch()
  const { addNotification } = useAppContext()
  const { title, type, required, id } = data
  const { mutateAsync, isLoading } = useMutation({
    mutationFn: () =>
      http.patch(`/api/1/ticket-fields/${id}`, {
        active: false,
      }),
    onSuccess: () => {
      addNotification({
        message: t('delete.successfully'),
      })
      onDeleted()
    },
    onError: (err) => addNotification(err),
  })
  const TitleConfirm = () => <code>{title}</code>
  return (
    <tr>
      <td>{title}</td>
      <td>{t(`ticketField.type.${type}`)}</td>
      <td>{t(`ticketField.required.${required ? 'yes' : 'no'}`)}</td>
      <td>
        <Button variant="link" size="sm" as={Link} to={`${match.path}/${id}`}>
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
          onConfirm={mutateAsync}
          confirmButtonText={t('delete')}
          content={t('ticketField.deleteHint')}
          trigger={
            <Button variant="link" size="sm" className="text-danger" disabled={isLoading}>
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
  const {
    data: [fields, count],
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['setting/fields', skip, pageSize],
    queryFn: () =>
      http.get(`/api/1/ticket-fields`, {
        params: {
          size: pageSize,
          skip,
        },
      }),
    keepPreviousData: true,
    initialData: [[], 0],
    onError: (err) => addNotification(err),
  })
  return (
    <div>
      <div>
        <div className="mb-3">
          <DocumentTitle title={`${t('ticketField')} - LeanTicket`} />
          <Link to={`${match.path}/new`}>
            <Button variant="primary">{t('ticketField.add')}</Button>
          </Link>
        </div>
        <Table size="sm" className={styles.table}>
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
              <FieldRow data={fieldData} key={fieldData.id} onDeleted={refetch} />
            ))}
            {!isFetching && fields.length === 0 && <NoDataRow />}
          </tbody>
        </Table>
        {count > 0 && <Pagination count={count} />}
      </div>
    </div>
  )
})

export default FieldList
