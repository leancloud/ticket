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
