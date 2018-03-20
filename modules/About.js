import React from 'react'
import DocumentTitle from 'react-document-title'

export default function About() {
  return <div>
    <DocumentTitle title='关于 - LeanTicket' />
    <h1 className='font-logo'>LeanCloud Ticket</h1>
    <hr />
    <p>该应用是 <a href='https://leancloud.cn/'>LeanCloud</a> 的工单系统，为更有效地解决 LeanCloud 开发者的问题而创建。</p>
    <p>该应用开放 <a href='https://github.com/leancloud/ticket'>源代码</a>，旨在帮助开发者了解 LeanCloud 各项服务的使用方法以及一些特定场景的解决方案。</p>
    <p>您可以查看该应用的 <a href='https://github.com/leancloud/ticket/blob/master/CHANGELOG.md'>更新记录</a> 来了解最新功能和问题修复。</p>
  </div>
}

About.displayName = 'About'
