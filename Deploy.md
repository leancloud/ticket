# 部署说明

自 `9e8207eae45f596bebb2e7fbc46055171010a5d8` 后提交的改动，若涉及到复杂的部署操作都会在这里进行记录。

## 2021-06-04

### `a20b1d2ed9815453bbd6262f86635210ac54fcc7`

需要为 Reply 添加列 `internal` ，类型为 `Boolean` 。

## 2021-06-17

### `ebc783f3456288fc74674138712fc65f8de352f3`

导入 Group、Ticket 与 OpsLog。

## 2021-06-22

### `bdb3cd1d9fa12b2195982a5d6524be1f901f6ddc`

导入 /resource/schema/QuickReply.json 。

## 2021-07-02

### `a6c9fe3182cd41dbcd26e796ec8d6ebecc3745bf`

1. 导出 `Config` 数据
2. 删除 `value` 列
3. 重新创建 `value` 列，类型为 `Any`
4. 手动恢复数据。如果原来启用了企业微信通知，直接删掉 `wechatToken`
5. 如果原来启用了百度翻译，新建一列 key = `translate.baidu`，value 为 `{ "appId", "appKey" }`，如果部署新版后没有问题，删除原来的 `translate.baidu.*` 行。
6. 部署新版本

## 2021-07-20

### `a86cd6d4231663d345a6f37d57d5fdacb0634562`

创建一个名为 `CACHE` 的 Redis 实例。

## 2021-08-12

### `f5b7f6423fff38acb72922317bc68f4fef9558b9`

重新导入 Group.json 。

## 2021-08-26

### `a07cb8bfe12e8dd8de7b71f522ee6226c6e1787a`

导入 notification.json 。

## 2021-08-31

### `c58be489dde13376c6000e87125d4a7ef0d62c0a`

重新导入 Reply.json 。

## 2021-09-02

### `8801cbbed85ae2a4fd15f22ff898af12a602d0fc`

导入 TicketFilter.json 。

### `facde73046f279297e511e12bc540d80b71d386f`

删除 Reply class 的 active 列，然后重新导入 Reply.json 。

## 2021-09-15

### `0a3eaddba44500c70bcc19afc655106a217c82ae`

修改了 Redis 中 Category 的格式，部署后需要清除 Category 的缓存：

```sh
> lean cache
> del categories
```

## 2021-10-12

### `60a95c84d057f2d68f1f437f0ca7020fe517eba9`

创建一个名为 `QUEUE` 的 Redis 实例，数据删除策略选择 `noeviction`。

## 2021-10-13

重新导入 OpsLog（增加 ticket 索引）~~OpsLog 没有索引，在自用的 LeanTicket 上 40000+ 的数据量已经出现查询超时了，慢查询条件为 `where('ticket', '==', ptr).orderBy('createdAt')`。给 ticket 列加个索引，避免扫全表即可。~~

## 2021-10-21

### `f400cdc73c0328bb74bf934a17c370c127b4000e`

重新导入 notification.json 。~~并确保 notification 表有这个索引：~~

- ~~user（正序）联合 latestActionAt（倒序）~~

## 2021-10-29

### `462d917537206595c0a4812a98f740738950b806`

由于重写了触发器的实现，原有触发器将无法使用。

部署后，请在预备环境配置与原有触发器逻辑相同的新触发器，然后删除原有触发器。

## 2021-11-03

### `e0170388f9ad807a790368ed4be13e9529b4f5cc`

导入 TimeTrigger.json，重新配置逻辑相同的定时触发器，删除 Automation class。

## 2021-11-09

### `95ed45e1a08976f8821f1a11fbffebb14d31a33e`

Jira 插件内置到主分支了，需要导入 JiraIssue.json，并将 HS_Config 里 Jira 相关的配置移到 Config class 里。新的配置格式是一个大的 Object（有别于 HS_Config 命名空间风格的配置），具体可参考开发环境。

## 2021-11-12

### `218eafd61c258e2f9f5fda1c698db2e4889a824e`

交互式的 Slack 通知现已内置，可按需开启。之前未使用的应用需要导入 SlackNotification.json。

已使用的应用需要将环境变量中的配置移到 Config class 中（格式可参考开发环境），并重新设置 Slack App 的 interactive endpint。

## 2021-11-22

### `41cae1d2154b21447787a76b3116f6f2e5e46d4a`

导入 TicketFieldVariant.json（添加 description 列）。

## 2021-11-29

### `bd02da4a2a7f9d9ccc83a1aaa351ca4602756cfc`

重写了关键词搜索功能。在「全文搜索」中为 Ticket class 的 content、author、category、title、status、group、assignee、evaluation、tags、nid 列添加索引。

## 2021-12-22

### `a862e9fb042178ba2e3304aecdb2ec647f913ac7`

重新导入 Ticket（为 Ticket 增加 latestCustomerServiceReplyAt 与 firstCustomerServiceReplyAt）。
~~为 Ticket 创建索引 latestCustomerServiceReplyAt （倒序）~~

## 2021-12-28

### `445d77981b1414926713a2d8ca5476c7731cfa64`

重新导入 TicketField.json，并将已有数据的 visible 设置为 true。

重新导入 TicketFieldVariant.json，并将已有数据的 titleForCustomerService 设置为和 title 相同。

## 2021-12-31

### `6c989e6a9038f6943126ab995379d66ddc257b31`

重新导入 Category.json（增加 notices 列）

## 2022-01-11

### `13e0d717eca091b4ca7b5088b1689138b4792ad5`

导入 View 表结构（resources/schema/View.json），导入内置视图的数据（resources/data/View.jsonl）。

## 2022-01-12

### `bc6fdb6d7f69e937425dd68c369e2690829e86b0`

已删除 ticket filter 功能，可以删除 TicketFilter class。

## 2022-01-19

### `950b952e5e8a2d310fa7419dfa9c8e936569c734`

已删除「动态内容」功能，可以删除 DynamicContent class。

## 2022-01-21

### `994965592e35bddb846b894876888aef9577a6f9`

导入 FAQ.json FAQRevision.jaon，~~确保 FAQRevision 有以下两个索引：~~

- ~~FAQ（倒序）createdAt（倒序）~~
- ~~FAQ（倒序）meta（倒序）createdAt（倒序）~~

## 2022-02-08

### `9a9ac112a9b17c957d4de4e5609d693f9be9132a`

临时支持通过自定义字段的值搜索工单，需要为 TicketFieldValue 的 values 字段创建全文搜索索引。
由于这是一个临时功能，未使用的应用可以不添加该索引。

## 2022-02-09

### `TBD`

重新导入 FAQ.json，FAQRevision.json。

导入 FAQFeedback.json~~，确保 FAQFeedback 有以下两个索引：~~

- ~~revision（倒序）author（倒序），唯一，不允许为空~~
- ~~revision（倒序）type（倒序）~~

## 2022-02-15

### `TBD`

创建定时任务 analyzeArticles `58 * * * *`

## 2022-03-16

### `6896eeaf74c767f4b9a629b1ef79a52099f04ea5`

导入 DynamicContent.json。
导入 DynamicContentVariant.json。

## 2022-04-14

### `4627080ad5a85f72bd4391bad27175fe54c3da89`

导入 TicketStats.json。
导入 TicketStatusStats.json。

创建定时任务 statsHour `0 * * * *`

## 2022-05-30

导入以下文件：

- schema
  - Category.json
  - FAQTopic.json
  - TicketField.json
  - notification.json
- data
  - TicketField.jsonl
  - TicketFieldVariant.jsonl
  - TicketForm.jsonl

部署后运行云函数 migrateNotifications

如果 TicketForm 中有 fieldIds 列包含 `description` 的数据，要把 `description` 改成 `details`。**此过程无法做到平滑**。

## 2022-06-22

导入 TicketField.json

## 2022-08-08

控制台创建 TicketLog 日志表。运行云函数 `syncTicketLog` 同步工单数据到 `TicketLog`

## 2022-09-21

数据仓库创建以下同步

- Category
  - form
  - name
- Ticket
  - status
  - category
- TicketField
  - type
- TicketFieldValue
  - ticket
  - values
- TicketFieldVariant
  - options
  - field
  - title
  - locale
- TicketForm
  - fieldIds

增加如下环境变量

- `TDS_TEXT_FILTER_HOST`: 文本过滤域名
- `TDS_TEXT_FILTER_SCENE`: 场景 ID
- `TDS_CLIENT_ID`: TDS 的 Client ID
- `TDS_SERVER_SECRET`: TDS 的 Server Secret
