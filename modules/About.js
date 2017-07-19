import React from 'react'

export default function About() {
  return <div>
    <h1 className='font-logo'>LeanCloud Ticket</h1>
    <hr />
    <p>该应用是 <a href='https://leancloud.cn/'>LeanCloud</a> 的工单系统，为更有效地解决 LeanCloud 开发者的问题而创建。</p>
    <p>该应用开放<a href='https://github.com/leancloud/ticket'>源代码</a>，旨在帮助开发者了解 LeanCloud 各项服务的使用方法以及一些特定场景的解决方案。</p>
  </div>
}

About.displayName = 'About'
