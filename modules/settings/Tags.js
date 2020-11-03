import React, {Component} from 'react'
import PropTypes from 'prop-types'
import {Link} from 'react-router'
import {Form, FormGroup, Table} from 'react-bootstrap'
import translate from '../i18n/translate'
class Tags extends Component {

  render() {
    const {t} = this.props
    return <div>
      <Form inline>
        <FormGroup>
          <Link to={'/settings/tags/new'}>{t('newTag')}</Link>
        </FormGroup>{' '}
      </Form>
      <Table>
        <thead>
          <tr>
            <th>{t('tagName')}</th>
          </tr>
        </thead>
        <tbody>
          {this.context.tagMetadatas.map(m => {
            return <tr key={m.id}>
              <td><Link to={`/settings/tags/${m.id}`}>{m.get('key')}</Link></td>
            </tr>
          })}
        </tbody>
      </Table>
    </div>
  }
}

Tags.contextTypes = {
  tagMetadatas: PropTypes.array
}

Tags.propTypes = {
  t: PropTypes.func
}

export default translate(Tags)