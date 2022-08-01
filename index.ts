#!/usr/bin/env node

import * as fs from 'node:fs'
import * as path from 'node:path'

import minimist from 'minimist'
import prompts from 'prompts'

import { red, green, bold, yellow, blue } from 'kolorist'

import banner from './utils/banner'
import renderTemplate from './utils/renderTemplate'
import renderEslint from './utils/renderEslint'
import renderSSO from './utils/renderSSO'
import generateReadme from './utils/generateReadme'
import { postOrderDirectoryTraverse, preOrderDirectoryTraverse, getCommand } from './utils'

/** 校验package name是否有效 */
function isValidPackageName(projectName) {
  return /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(projectName)
}

/** 转换package name */
function toValidPackageName(projectName) {
  return projectName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^[._]/, '')
    .replace(/[^a-z0-9-~]+/g, '-')
}

/**
 * 判断当前新建项目文件路径是否存在
 * @param dir
 * @returns
 */
function canSkipEmptying(dir: string) {
  // 检测路径是否存在
  if (!fs.existsSync(dir)) {
    console.log(11)
    return true
  }

  // 同步读取目录内容
  const files = fs.readdirSync(dir)
  console.log('files ==> ', files)
  if (files.length === 0) {
    console.log('22 ==> ', dir, process.cwd())

    return true
  }
  if (files.length === 1 && files[0] === '.git') {
    console.log(33)

    return true
  }

  // 都没满足，则返回false
  return false
}

/** 清空文件夹 */
function emptyDir(dir) {
  if (!fs.existsSync(dir)) {
    return
  }

  postOrderDirectoryTraverse(
    dir,
    (dir) => fs.rmdirSync(dir), // 删除文件夹
    (file) => fs.unlinkSync(file) // 删除文件
  )
}

async function init() {
  console.log(`\n${banner}\n`)
  const cwd = process.cwd()

  const argv = minimist(process.argv.slice(2), {
    // an object mapping string names to strings
    alias: {
      typescript: ['ts'],
      'with-tests': ['tests'],
      router: ['vue-router']
    },
    // all arguments are treated as booleans
    boolean: true
  })

  console.log('argv ===>', argv)

  // if any of the feature flags is set, we would skip the feature prompts
  // 下面任意功能被选择，将直接跳过功能提示
  const isFeatureFlagsUsed =
    typeof (
      argv.default ??
      argv.ts ??
      argv.jsx ??
      argv.router ??
      argv.pinia ??
      argv.tests ??
      argv.vitest ??
      argv.cypress ??
      argv.eslint
    ) === 'boolean'

  // 创建项目目标文件夹
  let targetDir = argv._[0] || ''
  const defaultProjectName = !targetDir ? 'vue-project' : targetDir

  const forceOverwrite = argv.force

  let result: {
    projectName?: string
    shouldOverwrite?: boolean
    packageName?: string
    needsTypeScript?: boolean
    needsJsx?: boolean
    needsRouter?: boolean
    needsPinia?: boolean
    /** 是否需要单点登录 */
    needsSSO?: boolean
    needsVitest?: boolean // Vite 提供支持的极速单元测试框架
    needsCypress?: boolean
    needsEslint?: boolean
    needsPrettier?: boolean
  } = {}

  // 开始Prompts交互
  try {
    result = await prompts(
      [
        // 1、询问项目名称
        {
          name: 'projectName',
          type: targetDir ? null : 'text', // 如果cls命令行后面添加了项目名称，这里就不用再询问了
          message: yellow('Project name:'),
          initial: defaultProjectName,
          onState: (state) => (targetDir = String(state.value).trim() || defaultProjectName)
        },
        // 2、如果存在项目的文件路径，则提示是否要覆盖
        {
          name: 'shouldOverwrite',
          type: () =>
            canSkipEmptying(path.join(cwd, targetDir)) || forceOverwrite ? null : 'confirm',
          message: () => {
            const dirForPrompt =
              targetDir === '.'
                ? yellow('Current directory')
                : yellow(`Target directory "${targetDir}"`)
            return yellow(`${dirForPrompt} is not empty. Remove existing files and continue`)
          }
        },
        // 3、用户取消晴空已有目录操作，予以提示～！
        {
          name: 'overwriteChecker',
          type: (prev, values) => {
            if (values.shouldOverwrite === false) {
              throw new Error(red('✖' + ' Operation cancelled'))
            }
            return null
          }
        },
        // 4、当目录名称不能作为package name时，提示
        {
          name: 'packageName',
          type: () => (isValidPackageName(targetDir) ? null : 'text'),
          message: yellow('Package name:'),
          initial: () => toValidPackageName(targetDir),
          validate: (dir) => isValidPackageName(dir) || 'Invalid package.json name'
        },
        // 5、是否需要支持Typescript
        {
          name: 'needsTypeScript',
          type: () => (isFeatureFlagsUsed ? null : 'toggle'),
          message: yellow('Add TypeScript?'),
          initial: false,
          active: 'Yes',
          inactive: 'No'
        },
        // 6、是否支持Jsx
        {
          name: 'needsJsx',
          type: () => (isFeatureFlagsUsed ? null : 'toggle'),
          message: yellow('Add JSX Support?'),
          initial: false,
          active: 'Yes',
          inactive: 'No'
        },
        // 7、是否需要支持router
        {
          name: 'needsRouter',
          type: () => (isFeatureFlagsUsed ? null : 'toggle'),
          message: yellow('Add Vue Router for Single Page Application development?'),
          initial: false,
          active: 'Yes',
          inactive: 'No'
        },
        // 8、是否需要安装Pinnia
        {
          name: 'needsPinia',
          type: () => (isFeatureFlagsUsed ? null : 'toggle'),
          message: yellow('Add Pinia for state management?'),
          initial: false,
          active: 'Yes',
          inactive: 'No'
        },
        {
          name: 'needsSSO',
          type: () => (isFeatureFlagsUsed ? null : 'toggle'),
          message: yellow(`Add SSO for this project?`),
          initial: false,
          active: 'Yes',
          inactive: 'No'
        },
        // 是否需要安装单元测试Vitest
        {
          name: 'needsVitest',
          type: () => (isFeatureFlagsUsed ? null : 'toggle'),
          message: yellow('Add Vitest for Unit Testing?'),
          initial: false,
          active: 'Yes',
          inactive: 'No'
        },

        {
          name: 'needsCypress',
          type: () => (isFeatureFlagsUsed ? null : 'toggle'),
          message: (prev, answers) =>
            answers.needsVitest
              ? 'Add Cypress for End-to-End testing?'
              : 'Add Cypress for both Unit and End-to-End testing?',
          initial: false,
          active: 'Yes',
          inactive: 'No'
        },
        // eslint
        {
          name: 'needsEslint',
          type: () => (isFeatureFlagsUsed ? null : 'toggle'),
          message: yellow('Add ESLint for code quality?'),
          initial: false,
          active: 'Yes',
          inactive: 'No'
        },
        // Prettier
        {
          name: 'needsPrettier',
          type: (prev, values) => {
            if (isFeatureFlagsUsed || !values.needsEslint) {
              return null
            }
            return 'toggle'
          },
          message: yellow('Add Prettier for code formatting?'),
          initial: false,
          active: 'Yes',
          inactive: 'No'
        }
      ],
      {
        onCancel: () => {
          throw new Error(red('✖') + ' 操作已取消')
        }
      }
    )
  } catch (error) {
    console.log(error)
  }

  console.log('result 22==> ', result)

  // 给定默认值， 有些事从命令设置的
  const {
    projectName,
    packageName = projectName ?? defaultProjectName,
    shouldOverwrite = argv.force,
    needsJsx = argv.jsx,
    needsTypeScript = argv.typescript,
    needsRouter = argv.router,
    needsPinia = argv.pinia,
    needsSSO = argv.sso,
    needsVitest = argv.vitest || argv.tests,
    needsCypress = argv.cypress || argv.tests,
    needsEslint = argv.eslint || argv['eslint-with-prettier'],
    needsPrettier = argv['eslint-with-prettier']
  } = result

  const needsCypressCT = needsCypress && !needsVitest
  const root = path.join(cwd, targetDir)
  console.log('result ==> 111 ', root)

  // 检测路径是否存在
  if (fs.existsSync(root) && shouldOverwrite) {
    emptyDir(root)
  } else if (fs.existsSync(root) && !shouldOverwrite) {
    console.log(red(`\n Project creation was canceled... \n`))
    return
  } else if (!fs.existsSync(root)) {
    fs.mkdirSync(root)
  }

  console.log(green(`\nScaffolding project in ${root}...\n`))

  // 初始化package.json
  const pkg = { name: packageName, version: '0.0.0' }
  fs.writeFileSync(path.resolve(root, 'package.json'), JSON.stringify(pkg, null, 2))

  const templateRoot = path.resolve(__dirname, 'template')
  const render = function (templateName: string): void {
    const templateDir = path.resolve(templateRoot, templateName)
    renderTemplate(templateDir, root)
  }

  render('base')

  if (needsJsx) {
    render('config/jsx') // 修改点：1、vite.config.js 2、package.json增加plugin-vue-jsx依赖
  }

  if (needsRouter) {
    render('config/router') // 修改点：1、package.json增加vue-router@4.1.2overwriteChecker
  }

  if (needsPinia) {
    render('config/pinia') // 修改点：1、package.json增加pinia依赖；2、在src下创建store的默认值。
  }

  if (needsVitest) {
    render('config/vitest') // 修改点： 1、package.json增加相关依赖；2、package.json增加script命令；3、复制一个测试用例；
  }

  if (needsCypress) {
    render('config/cypress')
  }

  if (needsCypressCT) {
    render('config/cypress-ct')
  }
  if (needsSSO) {
    renderSSO(root)
  }

  if (needsTypeScript) {
    render('config/typescript') // 修改点： 1、pacakge.json增加依赖；2、复制env.d.ts生命文件。

    render('tsconfig/base') // 修改点：1、package.json增加@vue/tsconfig; 2、增添tsconfig.json默认配置文件；

    if (needsCypress) {
      render('tsconfig/cypress')
    }
    if (needsCypressCT) {
      render('tsconfig/cypress-ct')
    }
    if (needsVitest) {
      render('tsconfig/vitest')
    }
  }

  // 渲染 eslint 配置
  // 渲染 prettier 配置
  if (needsEslint) {
    renderEslint(root, { needsTypeScript, needsCypress, needsCypressCT, needsPrettier })
  }

  // 渲染 示例code
  const templateType = (needsTypeScript ? 'typescript-' : '') + (needsRouter ? 'router' : 'default')
  render(`code/${templateType}`)

  // 渲染入口文件(main.js/ts)
  if (needsPinia && needsRouter) {
    render('entry/router-and-pinia')
  } else if (needsPinia) {
    render('entry/pinia')
  } else if (needsRouter) {
    render('entry/router')
  } else {
    render('entry/default')
  }

  // 将 javascript 文件转换成 typescript
  if (needsTypeScript) {
    postOrderDirectoryTraverse(root, null, (filepath: string) => {
      if (filepath.endsWith('.js')) {
        const tsFilePath = filepath.replace(/\.js$/, '.ts')
        if (fs.existsSync(tsFilePath)) {
          fs.unlinkSync(filepath)
        } else {
          fs.renameSync(filepath, tsFilePath)
        }
      } else if (path.basename(filepath) === 'jsconfig.json') {
        fs.unlinkSync(filepath)
      }
    })

    // 修改html 入口
    const indexHtmlPath = path.resolve(root, 'index.html')
    const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8')
    fs.writeFileSync(indexHtmlPath, indexHtmlContent.replace('src/main.js', 'src/main.ts'))
  } else {
    // Remove all the remaining `.ts` files
    preOrderDirectoryTraverse(root, null, (filepath) => {
      if (filepath.endsWith('.ts')) {
        fs.unlinkSync(filepath)
      }
    })
  }

  // npm包管理器支持: pnpm > yarn > npm
  const userAgent = process.env.npm_config_user_agent ?? ''
  const packageManager = /pnpm/.test(userAgent) ? 'pnpm' : /yarn/.test(userAgent) ? 'yarn' : 'npm'

  // 创建 Readme
  fs.writeFileSync(
    path.resolve(root, 'README.md'),
    generateReadme({
      projectName: result.projectName ?? defaultProjectName,
      packageManager,
      needsTypeScript,
      needsVitest,
      needsCypress,
      needsCypressCT,
      needsEslint
    })
  )

  console.log(`\nDone. Now run:\n`)
  if (root !== cwd) {
    console.log(`  ${bold(blue(`cd ${path.relative(cwd, root)}`))}`)
  }
  console.log(`  ${bold(blue(getCommand(packageManager, 'install')))}`)
  if (needsPrettier) {
    console.log(`  ${bold(blue(getCommand(packageManager, 'lint')))}`)
  }
  console.log(`  ${bold(blue(getCommand(packageManager, 'dev')))}`)
  console.log()
}

init().catch((e) => {
  console.log(e)
})
