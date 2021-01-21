import React from 'react'
import PropTypes from 'prop-types'
import {FormGroup, ControlLabel, FormControl, Button} from 'react-bootstrap'
import {db} from '../../lib/leancloud'

import {getCategoriesTree} from '../common'
import CategoriesSelect from '../CategoriesSelect'
import translate from '../i18n/translate'
import {depthFirstSearchFind} from '../../lib/common'

class Category extends React.Component {
  constructor() {
    super()
    this.state = {
      name: '',
      qTemplate: '',
      category: undefined,
      parentCategory: undefined,
      categoriesTree: undefined,
      isSubmitting: false,
      isLoading: true,
    }
  }

  componentDidMount() {
    return getCategoriesTree()
    .then(categoriesTree => {
      this.setState({categoriesTree, isLoading: false})

      const categoryId = this.props.params.id
      if (categoryId == '_new') {
        return
      }

      const category = depthFirstSearchFind(categoriesTree, c => c.id == categoryId)
      this.setState({
        category,
        name: category.get('name'),
        qTemplate: category.get('qTemplate'),
        parentCategory: category.get('parent'),
        FAQs: (category.get('FAQs') || []).map(FAQ => FAQ.id).join(','),
      })
      return
    })
  }

  handleNameChange(e) {
    this.setState({name: e.target.value})
  }
  handleFAQsChange(e) {
    this.setState({FAQs: e.target.value})
  }

  handleParentChange(t, e) {
    const parentCategory = depthFirstSearchFind(this.state.categoriesTree, c => c.id == e.target.value)
    let tmp = parentCategory
    while (tmp) {
      if (this.state.category && tmp.id == this.state.category.id) {
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
    const faqs = this.state.FAQs.split(',').filter(id=>id).map(id => db.class('FAQ').object(id))

    let promise

    if (!category) {
      promise = db.class('Category').add({
        name: this.state.name,
        parent: this.state.parentCategory,
        qTemplate: this.state.qTemplate,
        faqs,
      })
    } else {
      const data = {qTemplate: this.state.qTemplate, faqs}

      if (this.state.parentCategory != category.parent) {
        if (!this.state.parentCategory) {
          data.parent = db.op.unset()
        } else {
          data.parent = this.state.parentCategory
        }
      }

      if (this.state.name != category.get('name')) {
        data.name = this.state.name
      }

      promise = category.update(data)
    }

    promise
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
      this.state.category.update({
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
    if (this.state.isLoading) {
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
          <FormGroup controlId="FAQsText">
            <ControlLabel>{t('FAQs')}</ControlLabel>
            <FormControl type="text" value={this.state.FAQs} onChange={this.handleFAQsChange.bind(this)} placeholder="objectId1,objectId2"/>
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
          {this.state.category
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
