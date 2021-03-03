import React from 'react'
import { withTranslation } from 'react-i18next'
import { withRouter } from 'react-router-dom'
import PropTypes from 'prop-types'
import { FormGroup, ControlLabel, FormControl, Button } from 'react-bootstrap'
import { db } from '../../lib/leancloud'

import { getCategoriesTree } from '../common'
import CategoriesSelect from '../CategoriesSelect'
import { depthFirstSearchFind } from '../../lib/common'

class Category extends React.Component {
  constructor() {
    super()
    this.state = {
      name: '',
      description: '',
      qTemplate: '',
      FAQs: '',
      category: undefined,
      parentCategory: undefined,
      categoriesTree: undefined,
      isSubmitting: false,
      isLoading: true,
    }
  }

  componentDidMount() {
    return getCategoriesTree().then((categoriesTree) => {
      this.setState({ categoriesTree, isLoading: false })

      const categoryId = this.props.match.params.id
      if (categoryId == '_new') {
        return
      }

      const category = depthFirstSearchFind(categoriesTree, (c) => c.id == categoryId)
      this.setState({
        category,
        name: category.get('name'),
        description: category.get('description'),
        qTemplate: category.get('qTemplate'),
        parentCategory: category.get('parent'),
        FAQs: (category.get('FAQs') || []).map((FAQ) => FAQ.id).join(','),
      })
      return
    })
  }

  handleNameChange(e) {
    this.setState({ name: e.target.value })
  }
  handleDescriptionChange(e) {
    this.setState({ description: e.target.value })
  }
  handleFAQsChange(e) {
    this.setState({ FAQs: e.target.value })
  }

  handleParentChange(t, e) {
    const parentCategory = depthFirstSearchFind(
      this.state.categoriesTree,
      (c) => c.id == e.target.value
    )
    let tmp = parentCategory
    while (tmp) {
      if (this.state.category && tmp.id == this.state.category.id) {
        alert(t('parentCategoryRequirements'))
        return false
      }
      tmp = tmp.parent
    }
    this.setState({
      parentCategory: depthFirstSearchFind(
        this.state.categoriesTree,
        (c) => c.id == e.target.value
      ),
    })
  }

  handleQTemplateChange(e) {
    this.setState({ qTemplate: e.target.value })
  }

  handleSubmit(e) {
    e.preventDefault()
    this.setState({ isSubmitting: true })
    const category = this.state.category
    const faqs = this.state.FAQs.split(',')
      .filter((id) => id)
      .map((id) => db.class('FAQ').object(id))

    let promise

    if (!category) {
      promise = db.class('Category').add({
        name: this.state.name,
        description: this.state.description,
        parent: this.state.parentCategory,
        qTemplate: this.state.qTemplate,
        faqs,
      })
    } else {
      const data = { qTemplate: this.state.qTemplate, faqs }

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
      if (this.state.description != category.get('description')) {
        data.description = this.state.description
      }

      promise = category.update(data)
    }

    promise
      .then(() => {
        this.setState({ isSubmitting: false })
        this.props.history.push('/settings/categories')
        return
      })
      .then(this.context.addNotification)
      .catch(this.context.addNotification)
  }

  handleDisable(t) {
    const result = confirm(t('confirmDisableCategory') + this.state.category.get('name'))
    if (result) {
      this.state.category
        .update({
          deletedAt: new Date(),
          order: new Date().getTime(), // 确保在排序的时候尽量靠后
        })
        .then(() => {
          this.props.history.push('/settings/categories')
          return
        })
        .catch(this.context.addNotification)
    }
  }

  render() {
    const { t } = this.props
    if (this.state.isLoading) {
      return <div>{t('loading')}……</div>
    }

    return (
      <div>
        <form onSubmit={this.handleSubmit.bind(this)}>
          <FormGroup controlId="nameText">
            <ControlLabel>{t('categoryName')}</ControlLabel>
            <FormControl
              type="text"
              value={this.state.name}
              onChange={this.handleNameChange.bind(this)}
            />
          </FormGroup>
          <FormGroup controlId="descriptionText">
            <ControlLabel>
              {t('categoryDescription')}
              {t('optional')}
            </ControlLabel>
            <FormControl
              type="text"
              value={this.state.description}
              onChange={this.handleDescriptionChange.bind(this)}
            />
          </FormGroup>
          <FormGroup controlId="parentSelect">
            <ControlLabel>
              {t('parentCategory')}
              {t('optional')}
            </ControlLabel>
            <CategoriesSelect
              categoriesTree={this.state.categoriesTree}
              selected={this.state.parentCategory}
              onChange={this.handleParentChange.bind(this, t)}
            />
          </FormGroup>
          <FormGroup controlId="FAQsText">
            <ControlLabel>
              {t('FAQ')}
              {t('optional')}
            </ControlLabel>
            <FormControl
              type="text"
              value={this.state.FAQs}
              onChange={this.handleFAQsChange.bind(this)}
              placeholder="objectId1,objectId2"
            />
            <p className="help-block">{t('FAQInfo')}</p>
          </FormGroup>
          <FormGroup controlId="qTemplateTextarea">
            <ControlLabel>
              {t('ticketTemplate')}
              {t('optional')}
            </ControlLabel>
            <FormControl
              componentClass="textarea"
              rows="8"
              value={this.state.qTemplate}
              onChange={this.handleQTemplateChange.bind(this)}
            />
            <p className="help-block">{t('ticketTemplateInfo')}</p>
          </FormGroup>
          <Button type="submit" disabled={this.state.isSubmitting} bsStyle="success">
            {t('save')}
          </Button>{' '}
          {(this.state.category && (
            <Button type="button" bsStyle="danger" onClick={this.handleDisable.bind(this, t)}>
              {t('disable')}
            </Button>
          )) || (
            <Button type="button" onClick={() => this.props.history.push('/settings/categories')}>
              {t('return')}
            </Button>
          )}
        </form>
      </div>
    )
  }
}

Category.propTypes = {
  history: PropTypes.object.isRequired,
  match: PropTypes.object.isRequired,
  t: PropTypes.func,
}

Category.contextTypes = {
  addNotification: PropTypes.func.isRequired,
}

export default withTranslation()(withRouter(Category))
