import * as fs from 'node:fs'
import * as path from 'node:path'
import { deepMerge, sortDependencies } from './index'

/**
 * 递归 clone 默认的模版
 * @param src
 * @param dest
 * @returns
 */
export default function renderTemplate(src: string, dest: string) {
  const stats = fs.statSync(src)

  // 判断clone的目标是否是文件夹，如果是文件夹，则进度递归clone
  if (stats.isDirectory()) {
    // skip node_module
    if (path.basename(src) === 'node_modules') {
      return
    }

    fs.mkdirSync(dest, { recursive: true })
    for (const file of fs.readdirSync(src)) {
      renderTemplate(path.resolve(src, file), path.resolve(dest, file))
    }
    return
  }

  const filename = path.basename(src)

  //   对package.json的处理，合并 => 排序
  if (filename === 'package.json' && fs.existsSync(dest)) {
    // merge instead of overwriting
    const existing = JSON.parse(fs.readFileSync(dest, 'utf8'))
    const newPackage = JSON.parse(fs.readFileSync(src, 'utf8'))
    const pkg = sortDependencies(deepMerge(existing, newPackage))
    fs.writeFileSync(dest, JSON.stringify(pkg, null, 2) + '\n')
    return
  }

  // 对特殊的文件处理
  if (filename.startsWith('_')) {
    // rename `_file` to `.file`
    dest = path.resolve(path.dirname(dest), filename.replace(/^_/, '.'))
  }

  fs.copyFileSync(src, dest)
}
