import React from 'react'
import { Route, Switch, useParams, useRouteMatch } from 'react-router-dom'
import { AddField, EditorField } from './Field'
import FieldList from './FieldList'

export const useFieldId = () => {
  return useParams().id
}

export default function TicketFields() {
  const match = useRouteMatch()
  return (
    <Switch>
      <Route path={`${match.path}/new`} component={AddField} />
      <Route path={`${match.path}/:id`} component={EditorField} />
      <Route component={FieldList} />
    </Switch>
  )
}

export const systemFieldData = [
  {
    active: true,
    defaultLocale: 'en',
    id: 'title',
    required: true,
    title: 'Title',
    type: 'text',
    system: true,
  },
  {
    active: true,
    defaultLocale: 'en',
    id: 'description',
    required: true,
    title: 'Description',
    type: 'multi-line',
    system: true,
  },
]
