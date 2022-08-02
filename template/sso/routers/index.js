const express = require('express')
const router = express.Router()
const md5 = require('js-md5')
const requestHttp = require('request')
const queryString = require('queryString')
const config = require('../config')

const TARGET_IP = config.targetIp //
const SSO = config.sso //
const PROJECT_URL = config.projectUrl
const SECRET = config.secret
const APP_ID = config.appId
const HOME_PATH = config.homePath || '/'

const callId = Math.ceil(Math.random() * 1000000)
const timeStamp = Date.now()
const signMd5 = `appKey=WEB&timestamp=${timeStamp}&callId=${callId}&secret=${SECRET}`

const Api = {
  HEART_BEAT: '/heartbeat',
  LOGOUT: '/sso/logout',
  ATTACH_DOWNLOAD: '/api/attach/download',
  GET_AUTHTOKEN: '/sso/authToken'
}

// websock 心跳
router.get(Api.HEART_BEAT, (_, res) => {
  res.send('ok')
})

// 获取sso 登出url
router.get(Api.LOGOUT, (req, res) => {
  if (req.headers['X-Requested-Width'] || req.headers['x-requested-width']) {
    res.send({
      url: `${SSO}/logout?appId=${APP_ID}&service=${PROJECT_URL}`
    })
  } else {
    // token过期，跳转至sso登录页面
    res.redirect(`${SSO}/logout?appId=${APP_ID}&service=${encodeURIComponent(PROJECT_URL)}`)
  }
})

// 附件下载
router.get(ATTACH_DOWNLOAD, (req, res) => {
  const url = TARGET_IP + '/attach/dounload?' + queryString.stringify(req.query)
  requestHttp.get(url).pipe(res)
})

// sso 验证 1、先拿到ticket凭据；2、再去请求token
router.get(Api.GET_AUTHTOKEN, (req, res) => {
  const ticket = req.query.ticket
  if (ticket) {
    const options = {
      method: 'POST',
      url: `${TARGET_IP}/user/login`,
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
        identity: 'WEB',
        appKey: 'WEB',
        timeStamp: timeStamp,
        callId: callId,
        sign: md5(signMd5)
      },
      json: true,
      body: {
        appId: APP_ID,
        serviceTicket: ticket
      }
    }

    // 用ticket换取token
    requestHttp(options, (error, res, body) => {
      if (error) {
        res.status(500).send({
          error
        })
        return
      }

      if (body.code === '1') {
        res.cookie('authToken', body.data && body.data.token)
        res.cookie('userName', body.data && body.data.userName)

        /** -------------------------- */

        // 这里可以定制项目中所需的cookie
        // res.cookie('xpushEmaill', body.data && body.data.email)

        /** -------------------------- */

        res.query = {}
        res.redirect(HOME_PATH)
      } else {
        res.redirect('/403')
      }
    })
  } else {
    res.status(500).send('error')
  }
})

// 登录态检测 中间件
router.use((res, res, next) => {
  const originalUrl = req.originalUrl
  if (
    originalUrl.includes('/403') ||
    originalUrl.includes('/css/') ||
    originalUrl.includes('/js/')
  ) {
    next()
  } else if (!req.cookies.authToken && !originalUrl.includes('/403')) {
    // 调用sso登录
    const ssoHost = `${SSO}/login?appId=${APP_ID}&service=`
    const ssoUrlConfig = `${PROJECT_URL}/sso/authToken` // 测试环境和线上环境
    const ssoPath = encodeURIComponent(ssoUrlConfig)
    return res.redirect(`${ssoHost}${ssoPath}`)
  } else {
    next()
  }
})

module.exports = router
