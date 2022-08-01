import * as fs from 'node:fs'
import * as path from 'node:path'

const isObject = (val) => val && typeof val === 'object'
const mergeArrayWithDedupe = (a, b) => Array.from(new Set([...a, ...b]))

/**
 * 递归合并对象
 * @param target 要合并的对象
 * @param obj 新增的配置项
 * @returns
 */
export function deepMerge(target, obj) {
  for (const key of Object.keys(obj)) {
    const oldVal = target[key]
    const newVal = obj[key]

    if (Array.isArray(oldVal) && Array.isArray(newVal)) {
      target[key] = mergeArrayWithDedupe(oldVal, newVal)
    } else if (isObject(oldVal) && isObject(newVal)) {
      target[key] = deepMerge(oldVal, newVal)
    } else {
      target[key] = newVal
    }
  }

  return target
}

/**
 * 递归遍历文件路径，对文件夹、文件执行相应的callback
 * @param dir 目录路径
 * @param dirCallback 对文件夹的callback
 * @param fileCallback 对文件的callback
 */
export function postOrderDirectoryTraverse(dir: string, dirCallback, fileCallback) {
  for (const filename of fs.readdirSync(dir)) {
    const fullpath = path.resolve(dir, filename)
    if (fs.lstatSync(fullpath).isDirectory()) {
      postOrderDirectoryTraverse(fullpath, dirCallback, fileCallback)
      dirCallback && dirCallback(fullpath)
      continue
    }
    fileCallback && fileCallback(fullpath)
  }
}

export function preOrderDirectoryTraverse(dir, dirCallback, fileCallback) {
  for (const filename of fs.readdirSync(dir)) {
    const fullpath = path.resolve(dir, filename)
    if (fs.lstatSync(fullpath).isDirectory()) {
      dirCallback(fullpath) // 可能会删除
      // in case the dirCallback removes the directory entirely
      if (fs.existsSync(fullpath)) {
        preOrderDirectoryTraverse(fullpath, dirCallback, fileCallback)
      }
      continue
    }
    fileCallback(fullpath)
  }
}

/**
 * 对package.json进行排序
 * @param packageJson
 * @returns 合并后的package.json
 */
export function sortDependencies(packageJson) {
  const sorted = {}

  const depTypes = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']

  for (const depType of depTypes) {
    if (packageJson[depType]) {
      sorted[depType] = {}

      Object.keys(packageJson[depType])
        .sort()
        .forEach((name) => {
          sorted[depType][name] = packageJson[depType][name]
        })
    }
  }

  return {
    ...packageJson,
    ...sorted
  }
}

export function getCommand(packageManager, scriptName) {
  if (scriptName === 'install') {
    return packageManager === 'yarn' ? 'yarn' : `${packageManager} install`
  }

  return packageManager === 'npm' ? `npm run ${scriptName}` : `${packageManager} ${scriptName}`
}
