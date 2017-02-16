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

### 开发服务端 API

```
lean up
```
因为该项目有 React 服务端渲染，构建所有代码耗时较长，所以单独把服务端 API 部分的代码独立到 `./api` 目录下，使用 `./server-api.js` 来启动。

### 构建全部并以生产环境方式启动
```
npm run build && npm run start:prod
```
