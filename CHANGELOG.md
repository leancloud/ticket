<a name="1.2.1-leancloud"></a>
## 1.2.1-leancloud (2018-03-20)


### Bug Fixes

* 修复「客服稍后回复」工单统计数据不准确的问题 ([807a05e](https://github.com/leancloud/ticket/commit/807a05e))
* 修复 IE 不支持 Object.assign 方法的问题 ([27e5773](https://github.com/leancloud/ticket/commit/27e5773))
* 修复判断新应用标识错误的问题 ([4ff8236](https://github.com/leancloud/ticket/commit/4ff8236))
* 修复 mailgun 邮件发送失败后保存记录失败的问题 ([b127760](https://github.com/leancloud/ticket/commit/b127760))
* 修复 moment 显示中文时间 lastWeek 的歧义 ([2db105a](https://github.com/leancloud/ticket/commit/2db105a))


### Features

* 支持客服自己提交工单，方便内部任务跟踪和流转 ([031b729](https://github.com/leancloud/ticket/commit/031b729))
* 支持北美和华东节点应用 ([5b9e6ea](https://github.com/leancloud/ticket/commit/5b9e6ea))


## v1.2.0
* `master` 分支移除所有关于 LeanCloud 定制的元素，方便开发者 fork 后使用或进行二次开发。所有 LeanCloud 定制内容提交在 `leancloud` 分支，开发者可以作为二次开发的参考。

## v1.1.0

* 增加用户 Profile 页面，查看和修改个人信息。

**注意**：数据库格式有变化，请执行下面命令做数据订正：

```
$(lean up)
npm run migrate
```

