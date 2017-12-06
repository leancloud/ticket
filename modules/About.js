import React from 'react'
import DocumentTitle from 'react-document-title'

export default function About() {
  return <div>
    <DocumentTitle title='关于 - LeanTicket' />
    <h1 className='font-logo'>LeanCloud Ticket</h1>
    <hr />
    <p>该应用是 <a href='https://leancloud.cn/'>LeanCloud</a> 的工单系统，为更有效地解决 LeanCloud 开发者的问题而创建。</p>
    <p>该应用开放 <a href='https://github.com/leancloud/ticket'>源代码</a>，旨在帮助开发者了解 LeanCloud 各项服务的使用方法以及一些特定场景的解决方案。</p>
    <h2>更新记录</h2>
    <h3>v1.2.0</h3>
    <ul>
      <li><code>master</code> 分支移除所有关于 LeanCloud 定制的元素，方便开发者 fork 后使用或进行二次开发。</li>
      <li><code>leancloud</code> 分支保留并继续开发 LeanCloud 定制内容，开发者可以作为二次开发的参考。</li>
    </ul>
    <h3>v1.1.0</h3>
    <ul>
      <li>特性：增加「个人设置」页面，可以修改昵称、邮箱等个人信息。</li>
    </ul>
    <h3>v1.0.0</h3>
    <ul>
      <li>基本功能完成。</li>
    </ul>
  </div>
}

About.displayName = 'About'
