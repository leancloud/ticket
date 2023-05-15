import React, { useCallback } from 'react'
import { Breadcrumb } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Link, useHistory, useRouteMatch } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from 'react-query'

import { http } from '../../../lib/leancloud'
import { QuickReplyForm } from './Add'
import { DocumentTitle } from '../../utils/DocumentTitle'

export function EditQuickReply() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const history = useHistory()
  const {
    params: { id },
  } = useRouteMatch()
  const backToList = useCallback(() => history.push('/settings/quick-replies'), [history])

  const { data: initValue, isLoading } = useQuery({
    queryKey: ['quickReply', id],
    queryFn: () => http.get(`/api/1/quick-replies/${id}`),
  })

  const { mutateAsync: update } = useMutation({
    mutationFn: (data) => http.patch(`/api/1/quick-replies/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries('quickReplies')
      queryClient.invalidateQueries(['quickReply', id])
      backToList()
    },
  })

  return (
    <>
      <DocumentTitle title={`${t('quickReply.edit')}`} />
      <Breadcrumb>
        <Breadcrumb.Item linkProps={{ to: '/settings/quick-replies' }} linkAs={Link}>
          {t('quickReply.list')}
        </Breadcrumb.Item>
        <Breadcrumb.Item active>{t('quickReply.edit')}</Breadcrumb.Item>
      </Breadcrumb>
      {isLoading ? (
        <div>{t('loading')}</div>
      ) : (
        <QuickReplyForm
          className="mt-2"
          initValue={initValue}
          onSubmit={update}
          onCancel={backToList}
        />
      )}
    </>
  )
}
