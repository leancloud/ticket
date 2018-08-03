import React from 'react'
import PropTypes from 'prop-types'
import {Form, FormGroup, Button} from 'react-bootstrap'
import AV from 'leancloud-storage/live-query'

import {getCategoriesTree, depthFirstSearchMap, getNodeIndentString} from '../common'

export default class CategorySort extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      categoriesTree: [],
    }
  }

  componentDidMount() {
    return getCategoriesTree()
    .then(categoriesTree => {
      this.setState({
        categoriesTree,
      })
      return
    })
  }

  handleSave() {
    const categories = depthFirstSearchMap(this.state.categoriesTree, (c, index) => {
      c.set('order', index)
      return c
    })
    return AV.Object.saveAll(categories)
    .then(() => {
      this.context.router.push('/settings/categories')
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
    this.setState({categoriesTree: this.state.categoriesTree})
  }

  render() {
    const tds = depthFirstSearchMap(this.state.categoriesTree, (c, index, array) => {
      return (
        <tr key={c.id}>
          <td><span>{getNodeIndentString(c)}</span>{c.get('name')}</td>
          <td>
            <Button disabled={index == 0} onClick={() => this.handleSortUpdate(c, index, index - 1)} className='btn-xs'>
              <span className="glyphicon glyphicon glyphicon-chevron-up" aria-hidden="true"></span>
            </Button>{' '}
            <Button disabled={index == array.length - 1} onClick={() => this.handleSortUpdate(c, index, index + 1)} className='btn-xs'>
              <span className="glyphicon glyphicon glyphicon-chevron-down" aria-hidden="true"></span>
            </Button>
          </td>
        </tr>
      )
    })
    return (
      <div>
        <Form>
          <FormGroup>
            <Button onClick={this.handleSave.bind(this)}>保存</Button>
          </FormGroup>
        </Form>
        <table className='table table-bordered table-hover'>
          <thead>
            <tr>
              <th>名称</th>
            </tr>
          </thead>
          <tbody>
            {tds}
          </tbody>
        </table>
      </div>
    )
  }
}

CategorySort.contextTypes = {
  router: PropTypes.object.isRequired,
  addNotification: PropTypes.func.isRequired,
}
