<a name="1.4.0"></a>
# [1.4.0](https://github.com/leancloud/ticket/compare/v1.3.0...v1.4.0) (2018-08-03)


### Bug Fixes

* 修复当 Ticket 带附件时，新的回复或操作不会即时刷新的问题 ([16995a9](https://github.com/leancloud/ticket/commit/16995a9))
* 删除分类时增加更多限制 ([88747ad](https://github.com/leancloud/ticket/commit/88747ad))
* 工单列表样式微调 ([2216bdc](https://github.com/leancloud/ticket/commit/2216bdc))
* 暂时回退 node 版本至 6.x 绕过 npm list 失败的问题 ([954af74](https://github.com/leancloud/ticket/commit/954af74))
* 添加了收到 LiveQuery 通知后逻辑的异常通知 ([fad5db3](https://github.com/leancloud/ticket/commit/fad5db3))
* 错误上报增加上下文信息，方便确认问题 ([5a37ec0](https://github.com/leancloud/ticket/commit/5a37ec0))


### Features

* 分类标签显示层级关系 ([740b4ae](https://github.com/leancloud/ticket/commit/740b4ae))
* 增加分类停用功能 ([aa86664](https://github.com/leancloud/ticket/commit/aa86664))
* 增加批量变更工单分类的功能 ([fb07ca5](https://github.com/leancloud/ticket/commit/fb07ca5))
* 支持二级分类 ([f715c6e](https://github.com/leancloud/ticket/commit/f715c6e))
* 支持分类排序 ([0889b75](https://github.com/leancloud/ticket/commit/0889b75))
* 支持多级分类 ([4425f9e](https://github.com/leancloud/ticket/commit/4425f9e))



<a name="1.3.0"></a>
# [1.3.0](https://github.com/leancloud/ticket/compare/v1.2.2...v1.3.0) (2018-06-06)


### Features

* 工单输入框增加预览功能 ([92b793f](https://github.com/leancloud/ticket/commit/92b793f))
* 指定的 Node 版本升级到 10.x ([e7b1c9e](https://github.com/leancloud/ticket/commit/e7b1c9e))



<a name="1.2.2"></a>
## [1.2.2](https://github.com/leancloud/ticket/compare/v1.2.1...v1.2.2) (2018-04-18)


### Bug Fixes

* 在渲染前对 joinedCustomerServices 去重 ([69c29ba](https://github.com/leancloud/ticket/commit/69c29ba))
* 更新 leancloud-storage 修复 LiveQuery 链接异常断开的问题 ([5a81d13](https://github.com/leancloud/ticket/commit/5a81d13))


### Features

* 仅对「未完成」工单按照 status 排序 ([47c0c6e](https://github.com/leancloud/ticket/commit/47c0c6e))



<a name="1.2.1"></a>
## 1.2.1 (2018-03-20)


### Bug Fixes

* 修复「客服稍后回复」工单统计数据不准确的问题 ([807a05e](https://github.com/leancloud/ticket/commit/807a05e))
* 修复 IE 不支持 Object.assign 方法的问题 ([27e5773](https://github.com/leancloud/ticket/commit/27e5773))
* 修复判断新应用标识错误的问题 ([4ff8236](https://github.com/leancloud/ticket/commit/4ff8236))
* 修复 mailgun 邮件发送失败后保存记录失败的问题 ([b127760](https://github.com/leancloud/ticket/commit/b127760))
* 修复 moment 显示中文时间 lastWeek 的歧义 ([2db105a](https://github.com/leancloud/ticket/commit/2db105a))


### Features

* 支持客服自己提交工单，方便内部任务跟踪和流转 ([031b729](https://github.com/leancloud/ticket/commit/031b729))


## v1.2.0
* `master` 分支移除所有关于 LeanCloud 定制的元素，方便开发者 fork 后使用或进行二次开发。所有 LeanCloud 定制内容提交在 `leancloud` 分支，开发者可以作为二次开发的参考。

## v1.1.0

* 增加用户 Profile 页面，查看和修改个人信息。

**注意**：数据库格式有变化，请执行下面命令做数据订正：

```
$(lean up)
npm run migrate
```

