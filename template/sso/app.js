const express = require('express')
const path = require('path')
const app = express()
const config = require('./config')
const proxy = require('http-proxy-middleware')
const cookieParser = require('cookie-parser')

require('pinpoint-node-agent')

// 注册cookie中间件
app.use(cookieParser())

app.use('/')
