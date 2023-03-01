import React, { memo, useMemo } from 'react'
import { Button, Form, Breadcrumb } from 'react-bootstrap'
import { withTranslation } from 'react-i18next'
import { withRouter, Link } from 'react-router-dom'
import PropTypes from 'prop-types'

import { db } from '../../lib/leancloud'
import { depthFirstSearchFind } from '../../lib/common'
import { getCategoriesTree } from '../common'
import CategoriesSelect from '../CategoriesSelect'
import { GroupSelect } from '../components/Group'
import Select from 'modules/components/Select'
import { useTicketFormList } from './TicketForm'
import { useAppContext } from 'modules/context'

// 应该用 seaach select 这里不搞这个了
const FormSelect = memo(({ value, onChange }) => {
  const { addNotification } = useAppContext()
  const {
    data: [forms],
  } = useTicketFormList(0, 100, {
    onError: (error) => addNotification(error),
  })
  const options = useMemo(() => forms.map((form) => [form.id, form.title]), [forms])
  return <Select value={value} options={options} onChange={onChange} placeholder="" />
})

function renderArticle(props, option, snapshot, className) {
  return (
    <button {...props} className={className} type="button">
      <span>{option.fullName}</span>
    </button>
  )
}

class Category extends React.Component {
  constructor() {
    super()
    this.state = {
      name: '',
      description: '',
      qTemplate: '',
      FAQs: [],
      notices: [],
      assignedGroupId: '',
      category: undefined,
      parentCategory: undefined,
      categoriesTree: undefined,
      isSubmitting: false,
      isLoading: true,
      form: undefined,
      allAiticles: [],
    }
  }

  componentDidMount() {
    Promise.all([
      getCategoriesTree(),
      db.class('FAQ').where('deletedAt', 'not-exists').select(['question', 'archived']).find(),
    ])
      .then(([categoriesTree, articles]) => {
        this.setState({ categoriesTree, allAiticles: articles, isLoading: false })

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
          assignedGroupId: category.get('group')?.id,
          parentCategory: category.get('parent'),
          FAQs: (category.get('FAQs') || []).map((FAQ) => FAQ.id),
          notices: (category.get('notices') || []).map((notice) => notice.id),
          form: category.get('form') ? category.get('form').id : undefined,
        })
        return
      })
      .catch(this.context.addNotification)
  }

  handleNameChange(e) {
    this.setState({ name: e.target.value })
  }
  handleDescriptionChange(e) {
    this.setState({ description: e.target.value })
  }
  handleFAQsChange(selectedFAQIds) {
    this.setState({ FAQs: selectedFAQIds })
  }
  handleNoticesChange(selectedNoticeIds) {
    this.setState({ notices: selectedNoticeIds })
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
  handleAssignedGroupIdChange(e) {
    this.setState({ assignedGroupId: e.target.value })
  }

  handleFromIdChange(id) {
    this.setState({ form: id })
  }

  handleSubmit(e) {
    e.preventDefault()
    this.setState({ isSubmitting: true })
    const category = this.state.category
    const FAQs = this.state.FAQs.map((id) => db.class('FAQ').object(id))
    const notices = this.state.notices.map((id) => db.class('FAQ').object(id))

    let promise

    if (!category) {
      promise = db.class('Category').add({
        name: this.state.name,
        description: this.state.description,
        parent: this.state.parentCategory,
        qTemplate: this.state.qTemplate,
        FAQs,
        notices,
        form: this.state.form ? db.class('TicketForm').object(this.state.form) : undefined,
      })
    } else {
      const data = { qTemplate: this.state.qTemplate, FAQs, notices }

      if (this.state.parentCategory != category.parent) {
        if (!this.state.parentCategory) {
          data.parent = db.op.unset()
        } else {
          data.parent = this.state.parentCategory
        }
      }
      if (this.state.assignedGroupId != category.get('group')?.id) {
        if (!this.state.assignedGroupId) {
          data.group = db.op.unset()
        } else {
          data.group = db.class('Group').object(this.state.assignedGroupId)
        }
      }

      if (this.state.name != category.get('name')) {
        data.name = this.state.name
      }
      if (this.state.description != category.get('description')) {
        data.description = this.state.description
      }
      if (this.state.form != category.get('form')?.id) {
        if (!this.state.form) {
          data.form = db.op.unset()
        } else {
          data.form = db.class('TicketForm').object(this.state.form)
        }
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

    const articleOptions = this.state.allAiticles.map((article) => ({
      value: article.id,
      name: `${article.get('archived') ? '（未发布）' : ''}${article.get('question').slice(0, 12)}${
        article.get('question').length > 12 ? '...' : ''
      }`,
      fullName: `${article.get('archived') ? '（未发布）' : ''}${article.get('question')}`,
    }))
    const isLeafNode = !this.state.category?.children?.length

    return (
      <Form onSubmit={this.handleSubmit.bind(this)}>
        <Breadcrumb>
          <Breadcrumb.Item linkProps={{ to: '/settings/categories' }} linkAs={Link}>
            {t('category')}
          </Breadcrumb.Item>
          <Breadcrumb.Item active>
            {this.state.category?.id ? this.state.category.id : t('add')}
          </Breadcrumb.Item>
        </Breadcrumb>
        <Form.Group controlId="nameText">
          <Form.Label>{t('categoryName')}</Form.Label>
          <Form.Control value={this.state.name} onChange={this.handleNameChange.bind(this)} />
        </Form.Group>
        <Form.Group controlId="descriptionText">
          <Form.Label>
            {t('categoryDescription')}
            {t('optional')}
          </Form.Label>
          <Form.Control
            value={this.state.description}
            onChange={this.handleDescriptionChange.bind(this)}
          />
        </Form.Group>
        <Form.Group controlId="parentSelect">
          <Form.Label>
            {t('parentCategory')}
            {t('optional')}
          </Form.Label>
          <CategoriesSelect
            categoriesTree={this.state.categoriesTree}
            selected={this.state.parentCategory}
            onChange={this.handleParentChange.bind(this, t)}
          />
        </Form.Group>
        {process.env.ENABLE_FAQ && (
          <Form.Group controlId="FAQsText">
            <Form.Label>
              公告
              {t('optional')}
            </Form.Label>
            {/* <SelectSearch
              className={classnames('select-search', styles.formSelect)}
              closeOnSelect={false}
              printOptions="on-focus"
              multiple
              placeholder="Select articles"
              value={this.state.notices}
              onChange={this.handleNoticesChange.bind(this)}
              options={articleOptions}
              renderOption={renderArticle}
              filterOptions={fuzzySearch}
            /> */}
            {this.state.notices.length > 3 && (
              <Form.Text className="text-danger">超过最大数量限制</Form.Text>
            )}
            <Form.Text className="text-muted">
              公告会在用户落地到该分类时展示在页面顶部，数量最大为三条。
              <br />
              未发布的文章不会展示。
            </Form.Text>
          </Form.Group>
        )}
        {process.env.ENABLE_FAQ && (
          <Form.Group controlId="FAQsText">
            <Form.Label>
              {t('FAQ')}
              {t('optional')}
            </Form.Label>
            {/* <SelectSearch
              className={classnames('select-search', styles.formSelect)}
              closeOnSelect={false}
              printOptions="on-focus"
              multiple
              placeholder="Select articles"
              value={this.state.FAQs}
              onChange={this.handleFAQsChange.bind(this)}
              options={articleOptions}
              renderOption={renderArticle}
              filterOptions={fuzzySearch}
            /> */}

            {isLeafNode ? (
              <Form.Text className="text-muted">{t('FAQInfo')}</Form.Text>
            ) : (
              <Form.Text className="text-warning">
                当前工单存在子分类，此处配置的常见问题将不显示。
              </Form.Text>
            )}
          </Form.Group>
        )}
        {process.env.ENABLE_BUILTIN_DESCRIPTION_TEMPLATE && (
          <Form.Group controlId="qTemplateTextarea">
            <Form.Label>
              {t('ticket.template')}
              {t('optional')}
            </Form.Label>
            <Form.Control
              as="textarea"
              rows="8"
              value={this.state.qTemplate}
              onChange={this.handleQTemplateChange.bind(this)}
            />
            <Form.Text className="text-muted">{t('ticket.templateInfo')}</Form.Text>
          </Form.Group>
        )}
        <Form.Group controlId="groupSelect">
          <Form.Label>
            {t('assignToGroup')}
            {t('optional')}
          </Form.Label>
          <GroupSelect
            value={this.state.assignedGroupId}
            onChange={this.handleAssignedGroupIdChange.bind(this)}
          />
        </Form.Group>
        <Form.Group>
          <Form.Label>
            {t('assignToTicketTemplate')}
            {t('optional')}
          </Form.Label>
          <FormSelect value={this.state.form} onChange={this.handleFromIdChange.bind(this)} />
        </Form.Group>
        <Button
          type="submit"
          disabled={this.state.isSubmitting || this.state.notices.length > 3}
          variant="success"
        >
          {t('save')}
        </Button>{' '}
        {this.state.category && (
          <Button variant="danger" onClick={this.handleDisable.bind(this, t)}>
            {t('disable')}
          </Button>
        )}{' '}
        <Button variant="light" onClick={() => this.props.history.push('/settings/categories')}>
          {t('return')}
        </Button>
      </Form>
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
