/*global FAQ_VIEWS*/
import React, { Component } from 'react'
import { withTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import { db } from '../../lib/leancloud'
import _ from 'lodash'
import { Tooltip, OverlayTrigger } from 'react-bootstrap'

import FAQ from '../components/FAQ'

const VIEWS = FAQ_VIEWS.split(',').filter((view) => view)

const toggleArchived = (faq) =>
  faq.update({
    archived: !faq.get('archived')
  })

class Categories extends Component {
  constructor(props) {
    super(props)
    this.state = {
      FAQs: [],
      view: VIEWS[0]
    }
  }

  componentDidMount() {
    this.reload()
  }

  reload() {
    return db
      .class('FAQ')
      .find()
      .then((FAQs) => {
        this.setState({ FAQs })
        return
      })
  }

  render() {
    const { t } = this.props

    const thead = (
      <thead>
        <tr>
          <th>objectId</th>
          <th>Question (and answer)</th>
          {VIEWS.map((view) => (
            <th key={view}>
              <OverlayTrigger
                overlay={<Tooltip id="tooltip">{t('viewHint')}</Tooltip>}
              >
                <span>{view}❓</span>
              </OverlayTrigger>
            </th>
          ))}
          <th>{t('operation')}</th>
        </tr>
      </thead>
    )

    const sortedFAQs = _.sortBy(this.state.FAQs, (faq) =>
      faq.get(`priority_${this.state.view}`)
    ).reverse()

    const activeFAQs = sortedFAQs
      .filter((faq) => !faq.get('archived'))
      .map((faq) => {
        return (
          <tr key={faq.id}>
            <td className="text-muted">
              <small>{faq.id}</small>
            </td>
            <td>
              <FAQ faq={faq} />
            </td>
            {VIEWS.map((view) => (
              <td key={view}>{faq.get(`priority_${view}`)}</td>
            ))}
            <td>
              <Link
                to={'/settings/faqs/' + faq.id}
                className="btn btn-default btn-sm"
              >
                {t('edit')}
              </Link>{' '}
              <button
                className="btn btn-default btn-sm"
                onClick={() =>
                  toggleArchived(faq)
                    .then(this.reload.bind(this))
                    .catch(this.context.addNotification)
                }
              >
                {t('archive')}
              </button>
            </td>
          </tr>
        )
      })

    const archivedFAQs = sortedFAQs
      .filter((faq) => faq.get('archived'))
      .map((faq) => {
        return (
          <tr key={faq.id}>
            <td className="text-muted">
              <small>{faq.id}</small>
            </td>
            <td>
              <FAQ faq={faq} />
            </td>
            <td>
              <Link
                to={'/settings/faqs/' + faq.id}
                className="btn btn-default btn-sm"
              >
                {t('edit')}
              </Link>{' '}
              <button
                className="btn btn-default btn-sm"
                onClick={() =>
                  toggleArchived(faq)
                    .then(this.reload.bind(this))
                    .catch(this.context.addNotification)
                }
              >
                {t('unarchive')}
              </button>
            </td>
          </tr>
        )
      })

    return (
      <div>
        <p>
          <Link to="/settings/faqs/_new" className="btn btn-default">
            {t('newFAQ')}
          </Link>
          {VIEWS.length > 0 && (
            <span style={{ float: 'right' }}>
              Ordered by{' '}
              <select
                value={this.state.view}
                onChange={(e) => this.setState({ view: e.target.value })}
              >
                {VIEWS.map((view) => (
                  <option key={view} value={view}>
                    {view}
                  </option>
                ))}
              </select>
            </span>
          )}
        </p>
        <table className="table">
          {thead}
          <tbody>{activeFAQs}</tbody>
        </table>
        <p>Archived FAQ:</p>
        <table className="table">
          {thead}
          <tbody>{archivedFAQs}</tbody>
        </table>
      </div>
    )
  }
}

Categories.propTypes = {
  t: PropTypes.func.isRequired,
}

export default withTranslation()(Categories)
