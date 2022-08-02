const express = require('express')
const path = require('path')
const app = express()
const config = require('./config')
const proxy = require('http-proxy-middleware')
const cookieParser = require('cookie-parser')

require('pinpoint-node-agent')

// 注册cookie中间件
app.use(cookieParser())

// SSO中间件 检测是否登录
app.use('/', require('./routers'))

// 后端代理
app.use(
  '/api',
  proxy({
    target: config.targetIp,
    pathRewrite: {
      '^/api/': '/'
    },
    changeOrigin: true
  })
)

// 设置静态目录
app.use(express.static(path.join(__dirname, 'dist')))

// 前端路由，处理history 模式
app.use('/*', express.static(path.join(__dirname, 'dist/index.html')))

module.exports = app
