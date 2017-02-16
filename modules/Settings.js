import React from 'react'
import { Link } from 'react-router'

export default React.createClass({
  render() {
    return (
      <div>
        <div className="row">
          <div className="col-md-2">
            <ul className="list-group">
              <li className="list-group-item"><Link to='/settings/profile'>个人信息</Link></li>
              <li className="list-group-item"><Link to='/settings/members'>成员</Link></li>
            </ul>
          </div> 
          <div className="col-md-10">
            {this.props.children && React.cloneElement(this.props.children,
              {})
            }
          </div>
        </div>
      </div>
    )
  }
})
