import React, { memo } from 'react'
import PropTypes from 'prop-types'
import { useRouteMatch, Link } from 'react-router-dom'
import { useTranslation, Trans } from 'react-i18next'
import { useQuery, useMutation } from 'react-query'
import { Badge, Button, Table } from 'react-bootstrap'
import { DocumentTitle } from '../../utils/DocumentTitle'
import Pagination, { usePagination } from 'modules/components/Pagination'
import { NoDataRow } from 'modules/components/NoData'
import { useAppContext } from 'modules/context'
import Confirm from 'modules/components/Confirm'
import { http, httpWithLimitation } from 'lib/leancloud'
import styles from './index.module.scss'
import { systemFieldData } from './'

const FieldRow = memo(({ data, onDeleted }) => {
  const { t } = useTranslation()
  const match = useRouteMatch()
  const { addNotification } = useAppContext()
  const { title, type, required, id, system } = data
  const { mutateAsync, isLoading } = useMutation({
    mutationFn: () =>
      http.patch(`/api/2/ticket-fields/${id}`, {
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
      <td>
        {system && (
          <>
            {t(id)} <Badge variant="info">{t('ticketField.defaultField')}</Badge>
          </>
        )}
        {!system && title}
      </td>
      <td>{t(`ticketField.type.${type}`)}</td>
      <td>{t(`ticketField.required.${required ? 'yes' : 'no'}`)}</td>
      <td>
        {!system && (
          <>
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
          </>
        )}
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
  const { page, pageSize } = usePagination()
  const {
    data: [fields, count],
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['ticketFields', { page, pageSize }],
    queryFn: () =>
      httpWithLimitation.get(`/api/2/ticket-fields`, {
        params: {
          page,
          pageSize,
          count: 1,
          orderBy: 'updatedAt-desc',
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
          <DocumentTitle title={`${t('ticketField')}`} />
          <Link to={`${match.path}/new`}>
            <Button variant="light">{t('ticketField.add')}</Button>
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
            {page === 1 &&
              systemFieldData.map((fieldData) => (
                <FieldRow data={fieldData} key={fieldData.id} onDeleted={refetch} />
              ))}
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
