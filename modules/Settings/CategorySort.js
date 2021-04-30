import React from 'react'
import { Button, Table } from 'react-bootstrap'
import { withRouter } from 'react-router-dom'
import { withTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import * as Icon from 'react-bootstrap-icons'

import { db } from '../../lib/leancloud'
import { depthFirstSearchMap } from '../../lib/common'
import { getCategoriesTree, getNodeIndentString } from '../common'

class CategorySort extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      categoriesTree: [],
    }
  }

  componentDidMount() {
    return getCategoriesTree().then((categoriesTree) => {
      this.setState({
        categoriesTree,
      })
      return
    })
  }

  handleSave() {
    const p = db.pipeline()
    depthFirstSearchMap(this.state.categoriesTree, (c, index) => {
      p.update(c, { order: index })
    })
    return p
      .commit()
      .then(() => {
        this.props.history.push('/settings/categories')
        return
      })
      .catch(this.context.addNotification)
  }

  handleSortUpdate(category, oriIndex, newIndex) {
    let cs
    if (category.parent) {
      cs = category.parent.children
    } else {
      cs = this.state.categoriesTree
    }
    cs.splice(oriIndex, 1)
    cs.splice(newIndex, 0, category)
    this.setState({ categoriesTree: this.state.categoriesTree })
  }

  render() {
    const { t } = this.props
    const tds = depthFirstSearchMap(this.state.categoriesTree, (c, index, array) => {
      return (
        <tr key={c.id}>
          <td>
            <span>{getNodeIndentString(c)}</span>
            {c.get('name')}
          </td>
          <td>
            <Button
              size="sm"
              variant="light"
              disabled={index == 0}
              onClick={() => this.handleSortUpdate(c, index, index - 1)}
            >
              <Icon.ChevronUp />
            </Button>{' '}
            <Button
              size="sm"
              variant="light"
              disabled={index == array.length - 1}
              onClick={() => this.handleSortUpdate(c, index, index + 1)}
            >
              <Icon.ChevronDown />
            </Button>
          </td>
        </tr>
      )
    })
    return (
      <div>
        <Button variant="light" onClick={this.handleSave.bind(this)}>
          {t('save')}
        </Button>
        <Table bordered hover className="mt-2">
          <thead>
            <tr>
              <th>{t('name')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>{tds}</tbody>
        </Table>
      </div>
    )
  }
}

CategorySort.contextTypes = {
  addNotification: PropTypes.func.isRequired,
}

CategorySort.propTypes = {
  history: PropTypes.object.isRequired,
  t: PropTypes.func.isRequired,
}

export default withTranslation()(withRouter(CategorySort))
