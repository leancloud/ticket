import React from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router'

export default function Settings(props) {
  return (
    <div>
      <div className="row">
        <div className="col-md-2">
          <div className="panel panel-default">
            <div className="panel-heading">个人设置</div>
            <ul className="list-group">
            </ul>
          </div>
          <div className="panel panel-default">
            <div className="panel-heading">技术支持设置</div>
            <ul className="list-group">
              <li className="list-group-item"><Link to='/settings/customerServiceProfile'>个人设置</Link></li>
              <li className="list-group-item"><Link to='/settings/members'>成员</Link></li>
              <li className="list-group-item"><Link to='/settings/categories'>分类</Link></li>
            </ul>
          </div>
        </div> 
        <div className="col-md-10">
          {props.children}
        </div>
      </div>
    </div>
  )
}

Settings.propTypes = {
  children: PropTypes.object.isRequired,
}
