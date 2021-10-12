/* global FAQ_VIEWS */
import React, { Component } from 'react'
import { Button, Form, OverlayTrigger, Table, Tooltip } from 'react-bootstrap'
import { withTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import _ from 'lodash'

import { db } from '../../lib/leancloud'
import FAQ from '../components/FAQ'

const VIEWS = FAQ_VIEWS.split(',').filter((view) => view)

const toggleArchived = (faq) =>
  faq.update({
    archived: !faq.get('archived'),
  })

class Categories extends Component {
  constructor(props) {
    super(props)
    this.state = {
      FAQs: [],
      view: VIEWS[0],
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
          <th>Title (click to preview the content)</th>
          {VIEWS.map((view) => (
            <th key={view}>
              <OverlayTrigger overlay={<Tooltip id="tooltip">{t('viewHint')}</Tooltip>}>
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
              <Button as={Link} variant="light" size="sm" to={'/settings/articles/' + faq.id}>
                {t('edit')}
              </Button>{' '}
              <Button
                variant="light"
                size="sm"
                onClick={() =>
                  toggleArchived(faq)
                    .then(this.reload.bind(this))
                    .catch(this.context.addNotification)
                }
              >
                {t('archive')}
              </Button>
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
              <Button as={Link} variant="light" size="sm" to={'/settings/articles/' + faq.id}>
                {t('edit')}
              </Button>{' '}
              <Button
                variant="light"
                size="sm"
                onClick={() =>
                  toggleArchived(faq)
                    .then(this.reload.bind(this))
                    .catch(this.context.addNotification)
                }
              >
                {t('unarchive')}
              </Button>
            </td>
          </tr>
        )
      })

    return (
      <div>
        <p>
          <Button as={Link} variant="light" to="/settings/articles/_new">
            {t('newArticle')}
          </Button>
          {VIEWS.length > 0 && (
            <Form inline className="float-right">
              <Form.Label>Ordered by</Form.Label>
              <Form.Control
                className="ml-1"
                as="select"
                size="sm"
                value={this.state.view}
                onChange={(e) => this.setState({ view: e.target.value })}
              >
                {VIEWS.map((view) => (
                  <option key={view} value={view}>
                    {view}
                  </option>
                ))}
              </Form.Control>
            </Form>
          )}
        </p>
        <Table>
          {thead}
          <tbody>{activeFAQs}</tbody>
        </Table>
        <p>Archived FAQ:</p>
        <Table>
          {thead}
          <tbody>{archivedFAQs}</tbody>
        </Table>
      </div>
    )
  }
}

Categories.propTypes = {
  t: PropTypes.func.isRequired,
}

export default withTranslation()(Categories)
