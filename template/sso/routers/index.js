const express = require('express')
const router = express.Router()
const md5 = require('js-md5')
const requestHttp = require('request')
const queryString = require('queryString')
const config = require('../config')

const TARGETIP = config.targetIp
const SSO = config.sso
const xpush = config.xpush
const SECRET = config.secret

const callId = Math.ceil(Math.random() * 1000000)
const timeStamp = Date.now()
