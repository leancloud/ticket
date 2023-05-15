import React, { useMemo, useState } from 'react'
import { Button, ButtonGroup, Form, Table } from 'react-bootstrap'
import { Route, Switch, useHistory, useRouteMatch } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { Link } from 'react-router-dom'
import PropTypes from 'prop-types'

import { auth, http } from '../../../lib/leancloud'
import styles from './index.module.scss'
import { AddQuickReply } from './Add'
import { EditQuickReply } from './Edit'
import Divider from 'modules/components/Divider'
import { DocumentTitle } from '../../utils/DocumentTitle'

function Permission({ quickReply }) {
  const { t } = useTranslation()
  if (quickReply.owner_id) {
    if (quickReply.owner_id === auth.currentUser.id) {
      return t('quickReply.onlyMe')
    }
    return quickReply.owner_id
  }
  return t('quickReply.everyone')
}
Permission.propTypes = {
  quickReply: PropTypes.shape({
    owner_id: PropTypes.string,
  }),
}

function Actions({ onEdit, onDelete }) {
  const { t } = useTranslation()
  return (
    <ButtonGroup size="sm">
      <Button variant="link" onClick={onEdit}>
        {t('edit')}
      </Button>
      <Button className="text-danger" variant="link" onClick={onDelete}>
        {t('delete')}
      </Button>
    </ButtonGroup>
  )
}
Actions.propTypes = {
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
}

function QuickReplyList() {
  const { t } = useTranslation()
  const history = useHistory()
  const { path } = useRouteMatch()
  const queryClient = useQueryClient()
  const [permission, setPermission] = useState('ALL')
  const params = useMemo(() => {
    switch (permission) {
      case 'ALL':
        return {}
      case 'EVERYONE':
        return { owner_id: '' }
      case 'ONLY_ME':
        return { owner_id: auth.currentUser.id }
    }
  }, [permission])

  const { data: quickReplies, isLoading } = useQuery({
    queryKey: ['quickReplies', params],
    queryFn: () => http.get('/api/1/quick-replies', { params }),
  })

  const { mutate: deleteQuickReply } = useMutation({
    mutationFn: (id) => http.delete(`/api/1/quick-replies/${id}`),
    onSuccess: () => queryClient.invalidateQueries('quickReplies'),
  })

  const handleDelete = ({ id, name }) => {
    if (confirm(`Do you want to delete quick reply ${name} permanently?`)) {
      deleteQuickReply(id)
    }
  }

  return (
    <>
      <DocumentTitle title={`${t('quickReply')}`} />
      <div className="mt-3 d-flex align-items-center">
        <Button as={Link} to={`${path}/new`} variant="light">
          {t('newQuickReply')}
        </Button>
        <Divider inline />
        <Form.Group className="m-0">
          <Form.Control
            as="select"
            value={permission}
            onChange={(e) => setPermission(e.target.value)}
          >
            <option value="ALL">{t('all')}</option>
            <option value="EVERYONE">{t('quickReply.everyone')}</option>
            <option value="ONLY_ME">{t('quickReply.onlyMe')}</option>
          </Form.Control>
        </Form.Group>
      </div>

      {isLoading ? (
        <div className="mt-2">{t('loading')}</div>
      ) : (
        <Table className={`mt-2 ${styles.quickReplyList}`}>
          <thead>
            <tr>
              <th>{t('name')}</th>
              <th>{t('permission')}</th>
              <th>{t('operation')}</th>
            </tr>
          </thead>
          <tbody>
            {quickReplies?.map((quickReply) => (
              <tr key={quickReply.id}>
                <td>{quickReply.name}</td>
                <td>
                  <Permission quickReply={quickReply} />
                </td>
                <td className={styles.actions}>
                  <Actions
                    onEdit={() => history.push(path + '/' + quickReply.id)}
                    onDelete={() => handleDelete(quickReply)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  )
}

export default function QuickReplies() {
  const match = useRouteMatch()
  return (
    <Switch>
      <Route path={`${match.path}`} exact>
        <QuickReplyList />
      </Route>
      <Route path={`${match.path}/new`}>
        <AddQuickReply />
      </Route>
      <Route path={`${match.path}/:id`}>
        <EditQuickReply />
      </Route>
    </Switch>
  )
}
