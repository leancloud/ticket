import React from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router'

export default function Settings(props) {
  return (
    <div>
      <div className="row">
        <div className="col-md-3">
          <div className="panel panel-default">
            <div className="panel-heading">设置</div>
            <ul className="list-group">
              <li className="list-group-item"><Link to='/settings/profile'>个人设置</Link></li>
              <li className="list-group-item"><Link to='/settings/organizations'>组织设置</Link></li>
            </ul>
          </div>
          {props.isCustomerService &&
            <div className="panel panel-default">
              <div className="panel-heading">技术支持设置</div>
              <ul className="list-group">
                <li className="list-group-item"><Link to='/settings/customerServiceProfile'>个人设置</Link></li>
                <li className="list-group-item"><Link to='/settings/members'>成员</Link></li>
                <li className="list-group-item"><Link to='/settings/categories'>分类</Link></li>
                <li className="list-group-item"><Link to='/settings/tags'>标签</Link></li>
              </ul>
            </div>
          }
        </div> 
        <div className="col-md-9">
          {props.children && React.cloneElement(props.children, {
            currentUser: props.currentUser,
            updateCurrentUser: props.updateCurrentUser,
            organizations: props.organizations,
            joinOrganization: props.joinOrganization,
            leaveOrganization: props.leaveOrganization,
          })}
        </div>
      </div>
    </div>
  )
}

Settings.propTypes = {
  children: PropTypes.object,
  currentUser: PropTypes.object,
  updateCurrentUser: PropTypes.func,
  isCustomerService: PropTypes.bool,
  organizations: PropTypes.array,
  joinOrganization: PropTypes.func,
  leaveOrganization: PropTypes.func,
}
