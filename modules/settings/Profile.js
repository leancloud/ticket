import React from 'react'
import AV from 'leancloud-storage'
import _ from 'lodash'

export default React.createClass({
  getInitialState() {
    return {
      categories: [],
      checkedCategories: AV.User.current().get('categories'),
    }
  },
  componentDidMount() {
    new AV.Query('Category')
    .find()
    .then((categories) => {
      this.setState({categories})
    })
  },
  handleCategoriesChange(e) {
    const checkedCategories = this.state.checkedCategories
    if (e.target.checked && checkedCategories.indexOf(e.target.value) === -1) {
      checkedCategories.push(e.target.value)
    } else if (!e.target.checked && checkedCategories.indexOf(e.target.value) !== -1) {
      _.pull(checkedCategories, e.target.value)
    }
    AV.User.current().set('categories', checkedCategories)
    .save()
    .then(() => {
      this.setState({checkedCategories})
    })
  },
  render() {
    const categories = this.state.categories.map((category) => {
      return (
        <label className="checkbox-inline">
          <input type="checkbox"
            value={category.get('name')}
            checked={this.state.checkedCategories.indexOf(category.get('name')) != -1}
            onChange={this.handleCategoriesChange}
          /> {category.get('name')}
        </label>
      )
    })
    return <div>
      <div class="form-group">
        <label>负责分类</label>
        <div>
          {categories}
        </div>
      </div>
    </div>
  }
})
