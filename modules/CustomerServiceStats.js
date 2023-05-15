import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'

import { db } from '../lib/leancloud'
import StatsSummary from './StatsSummary'
import StatsChart from './StatsChart'
import { DocumentTitle } from './utils/DocumentTitle'

// TODO: 使用新的 Context 语法
export default function CustomerServiceStats(props, context) {
  const { t } = useTranslation()
  const [categories, setCategories] = useState([])
  useEffect(() => {
    db.class('Category').limit(1000).find().then(setCategories).catch(context.addNotification)
  }, [])

  return (
    <div>
      <DocumentTitle title={`${t('statistics')}`} />
      <StatsSummary categories={categories} />
      <StatsChart categories={categories} />
    </div>
  )
}

CustomerServiceStats.contextTypes = {
  addNotification: PropTypes.func.isRequired,
}
