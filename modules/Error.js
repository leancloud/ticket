import React from 'react'
import PropTypes from 'prop-types'

export default function Error(props) {
  let message

  if (!props.location.state) {
    return (
      <div className="jumbotron">
        <h1>这里是错误页面</h1>
        <p>不过好像没有抓到什么错误信息</p>
        <p>如有疑问，可以通过 <a href="mailto:support@leancloud.cn">support@leancloud.cn</a> 联系我们</p>
      </div>
    )
  }

  switch (props.location.state.code) {
  case 'requireCustomerServiceAuth': 
    message = '您访问的页面需要技术支持人员权限。'
    break
  default:
    message = '未知信息: ' + this.props.location.state.code
  }
  return (
    <div className="jumbotron">
      <h1>很抱歉，看起来出了一些问题</h1>
      <p>{message}</p>
      <p>如有疑问，可以通过 <a href="mailto:support@leancloud.cn">support@leancloud.cn</a> 联系我们</p>
    </div>
  )
}

Error.propTypes = {
  location: PropTypes.object.isRequired
}
