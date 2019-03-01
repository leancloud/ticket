import React from 'react'
import PropTypes from 'prop-types'

export default function Error(props) {
  if (!props.location.state) {
    return (
      <div>
        <h1 className='font-logo'>这里是错误页面</h1>
        <hr />
        <p>不过好像没有抓到什么错误信息</p>
        <p>如有疑问，可以通过 <a href="mailto:support@leancloud.cn">support@leancloud.cn</a> 联系我们</p>
      </div>
    )
  }

  let message
  switch (props.location.state.code) {
  case 'requireCustomerServiceAuth':
    message = '您访问的页面需要技术支持人员权限。'
    break
  case 'Unauthorized':
    message = '您没有权限访问该页面。'
    break
  default:
    message = props.location.state.err.message
  }
  console.log(props.location.state.err)
  return (
    <div>
      <h1 className='font-logo'>很抱歉，看起来出了一些问题</h1>
      <hr />
      <p>{message}</p>
      <p>如有疑问，可以通过 <a href="mailto:support@leancloud.cn">support@leancloud.cn</a> 联系我们</p>
    </div>
  )
}

Error.propTypes = {
  location: PropTypes.object.isRequired
}
