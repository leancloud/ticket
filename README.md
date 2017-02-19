# LeanTicket

## 开发帮助

先使用 LeanCloud 命令行工具将本项目与 LeanCloud 应用关联：

```
lean checkout
```
该项目默认 appId `qJnLgVRA9mnzVSw4Ho3HtIaI-gzGzoHsz` 。

### 安装依赖

```
npm install
```

### 开发客户端

```
npm start
# 或
npm run start:client
```
该命令依赖 LeanCloud 命令行工具，因为需要 `lean env` 导出 appId 和 appKey。

### 开发服务端

```
lean up
# 或
eval $(lean env) && node server.js
```

### 以生产环境方式启动
```
npm run start:prod
```
