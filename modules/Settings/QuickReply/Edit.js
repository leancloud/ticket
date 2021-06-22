import React, { useCallback } from 'react'
import * as Icon from 'react-bootstrap-icons'
import { useTranslation } from 'react-i18next'
import { Link, useHistory, useRouteMatch } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from 'react-query'

import styles from './index.module.scss'
import { http } from '../../../lib/leancloud'
import { QuickReplyForm } from './Add'

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
    queryFn: () => http.get(`/api/1/quick-replies/${id}`).then((res) => res.data),
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
      <h1 className={styles.title}>
        <Link className="mr-2" to="/settings/quick-replies">
          <Icon.ChevronLeft />
        </Link>
        Edit quick reply
      </h1>
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
