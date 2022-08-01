var environmentPath = process.env.CFG_PATH || './develop.js'

console.log('process.env.CFG_PATH', process.env.CFG_PATH)

var environmentConfig = require(environmentPath)

var config = {}

try {
  config = Object.assign(config, environmentConfig)
} catch (error) {
  console.log('启动配置错误： ', e)
}

// 导出配置
console.log('配置文件： ', JSON.stringify(config))

module.exports = config
