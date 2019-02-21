import React, {Component} from 'react'
import PropTypes from 'prop-types'
import {Link} from 'react-router'
import {Form, FormGroup, Table} from 'react-bootstrap'

export default class Tags extends Component {

  render() {
    return <div>
      <Form inline>
        <FormGroup>
          <Link to={'/settings/tags/new'}>新增标签</Link>
        </FormGroup>{' '}
      </Form>
      <Table>
        <thead>
          <tr>
            <th>标签名称</th>
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
  tagMetadatas: PropTypes.array,
}
