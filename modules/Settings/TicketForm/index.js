import React, { memo } from 'react'
import { Route, Switch, useParams, useRouteMatch, Link } from 'react-router-dom'
import moment from 'moment'
import { DocumentTitle } from 'modules/utils/DocumentTitle'
import { Button, Table } from 'react-bootstrap'
import { useTranslation, Trans } from 'react-i18next'
import PropTypes from 'prop-types'
import { useQuery, useMutation } from 'react-query'
import { http, httpWithLimitation } from 'lib/leancloud'
import { useAppContext } from 'modules/context'
import { NoDataRow } from 'modules/components/NoData'
import Pagination, { usePagination } from 'modules/components/Pagination'
import Confirm from 'modules/components/Confirm'
import { AddForm, EditorForm } from './FormPage'
import styles from './index.module.scss'

export const useFormId = () => {
  return useParams().id
}

const FormRow = memo(({ data, onDeleted }) => {
  const { t } = useTranslation()
  const match = useRouteMatch()
  const { addNotification } = useAppContext()
  const { title, id, updatedAt } = data
  const { mutateAsync, isLoading } = useMutation({
    mutationFn: () => http.delete(`/api/1/ticket-forms/${id}`),
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
      <td>{moment(updatedAt).format('YYYY-MM-DD HH:MM')}</td>
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
          content={t('ticketTemplate.deleteHint')}
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

FormRow.propTypes = {
  data: PropTypes.object.isRequired,
  onDeleted: PropTypes.func.isRequired,
}

export const useTicketFormList = (skip, size, queryConfig) => {
  return useQuery({
    queryKey: ['setting/ticketTemplates', skip, size],
    queryFn: () =>
      httpWithLimitation.get('/api/1/ticket-forms', {
        params: {
          size,
          skip,
        },
      }),
    initialData: [[], 0],
    keepPreviousData: true,
    ...queryConfig,
  })
}

const FormList = memo(() => {
  const { t } = useTranslation()
  const match = useRouteMatch()
  const { addNotification } = useAppContext()
  const { skip, pageSize } = usePagination()
  const {
    data: [forms, count],
    isFetching,
    refetch,
  } = useTicketFormList(skip, pageSize, {
    onError: (error) => addNotification(error),
  })
  return (
    <div>
      <div>
        <div className="mb-3">
          <DocumentTitle title={`${t('ticketTemplate')}`} />
          <Link to={`${match.path}/new`}>
            <Button variant="light">{t('ticketTemplate.add')}</Button>
          </Link>
        </div>
        <Table size="sm" className={styles.table}>
          <thead>
            <tr>
              <th>{t('name')}</th>
              <th>{t('updated')}</th>
              <th>{t('operation')}</th>
            </tr>
          </thead>
          <tbody>
            {forms.map((fieldData) => (
              <FormRow data={fieldData} key={fieldData.id} onDeleted={refetch} />
            ))}
            {!isFetching && forms.length === 0 && <NoDataRow />}
          </tbody>
        </Table>
        {count > 0 && <Pagination count={count} />}
      </div>
    </div>
  )
})

export default function TicketForm() {
  const match = useRouteMatch()
  return (
    <Switch>
      <Route path={`${match.path}/new`} component={AddForm} />
      <Route path={`${match.path}/:id`} component={EditorForm} />
      <Route component={FormList} />
    </Switch>
  )
}
