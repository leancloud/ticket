import React from 'react'
import PropTypes from 'prop-types'
import {FormGroup, ControlLabel, FormControl, Button} from 'react-bootstrap'
import AV from 'leancloud-storage/live-query'

import {getCategoriesTree, depthFirstSearchFind, CategoriesSelect, getTinyCategoryInfo} from './../common'
import translate from '../i18n/translate'

class Category extends React.Component {

  componentDidMount() {
    return getCategoriesTree()
    .then(categoriesTree => {
      const categoryId = this.props.params.id
      return Promise.resolve()
      .then(() => {
        if (categoryId == '_new') {
          return new AV.Object('Category', {
            name: '',
            qTemplate: '',
          })
        }

        return depthFirstSearchFind(categoriesTree, c => c.id == categoryId)
      })
      .then(category => {
        this.setState({
          name: category.get('name'),
          qTemplate: category.get('qTemplate'),
          category,
          parentCategory: category.get('parent'),
          categoriesTree,
          isSubmitting: false,
        })
        return
      })
    })
  }

  handleNameChange(e) {
    this.setState({name: e.target.value})
  }

  handleParentChange(t, e) {
    const parentCategory = depthFirstSearchFind(this.state.categoriesTree, c => c.id == e.target.value)
    let tmp = parentCategory
    while (tmp) {
      if (tmp.id == this.state.category.id) {
        alert(t('parentCategoryRequirements'))
        return false
      }
      tmp = tmp.parent
    }
    this.setState({parentCategory: depthFirstSearchFind(this.state.categoriesTree, c => c.id == e.target.value)})
  }

  handleQTemplateChange(e) {
    this.setState({qTemplate: e.target.value})
  }

  handleSubmit(e) {
    e.preventDefault()
    this.setState({isSubmitting: true})
    const category = this.state.category

    const getCategoryPath = (category) => {
      if (!category.parent) {
        return [getTinyCategoryInfo(category)]
      }
      const result = getCategoryPath(category.parent)
      result.push(getTinyCategoryInfo(category))
      return result
    }

    const updateCategoryPath = (category) => {
      category.set('path', getCategoryPath(category))
      if (category.children && category.children.length) {
        return [category].concat(category.children.map(c => updateCategoryPath(c)))
      } else {
        return category
      }
    }

    let updatePath = false

    if (this.state.parentCategory != category.parent) {
      updatePath = true
      if (!this.state.parentCategory) {
        category.unset('parent')
      } else {
        category.set('parent', this.state.parentCategory)
      }
    }

    if (this.state.name != category.get('name')) {
      updatePath = true
      category.set('name', this.state.name)
    }

    category.set('qTemplate', this.state.qTemplate)

    Promise.resolve().then(() => {
      if (updatePath) {
        const updated = updateCategoryPath(category)
        return AV.Object.saveAll(updated)
      }
      return category.save()
    })
    .then(() => {
      this.setState({isSubmitting: false})
      this.context.router.push('/settings/categories')
      return
    })
    .then(this.context.addNotification)
    .catch(this.context.addNotification)
  }

  handleDisable(t) {
    const result = confirm(t('confirmDisableCategory') + this.state.category.get('name'))
    if (result) {
      this.state.category.save({
        'deletedAt': new Date(),
        'order': new Date().getTime(), // 确保在排序的时候尽量靠后
      })
      .then(() => {
        this.context.router.push('/settings/categories')
        return
      })
      .catch(this.context.addNotification)
    }
  }

  render() {
    const {t} = this.props
    if (!this.state) {
      return <div>{t('loading')}……</div>
    }

    return (
      <div>
        <form onSubmit={this.handleSubmit.bind(this)}>
          <FormGroup controlId="nameText">
            <ControlLabel>{t('categoryName')}</ControlLabel>
            <FormControl type="text" value={this.state.name} onChange={this.handleNameChange.bind(this)} />
          </FormGroup>
          <FormGroup controlId="parentSelect">
            <ControlLabel>{t('parentCategory')}</ControlLabel>
            <CategoriesSelect categoriesTree={this.state.categoriesTree}
              selected={this.state.parentCategory}
              onChange={this.handleParentChange.bind(this, t)}/>
          </FormGroup>
          <FormGroup controlId="qTemplateTextarea">
            <ControlLabel>{t('ticketTemplate')}</ControlLabel>
            <FormControl
              componentClass="textarea"
              placeholder={t('ticketTemplateInfo')}
              rows='8'
              value={this.state.qTemplate}
              onChange={this.handleQTemplateChange.bind(this)}/>
          </FormGroup>
          <Button type='submit' disabled={this.state.isSubmitting} bsStyle='success'>{t('save')}</Button>
          {' '}
          {this.state.category.id
            && <Button type='button' bsStyle="danger" onClick={this.handleDisable.bind(this, t)}>{t('disable')}</Button>
            || <Button type='button' onClick={() => this.context.router.push('/settings/categories')}>{t('return')}</Button>
          }
        </form>
      </div>
    )
  }

}

Category.propTypes = {
  params: PropTypes.object.isRequired,
  t: PropTypes.func,
}

Category.contextTypes = {
  router: PropTypes.object.isRequired,
  addNotification: PropTypes.func.isRequired,
}

export default translate(Category)
