import * as fs from 'node:fs'
import * as path from 'node:path'
import type { Linter } from 'eslint'
import { devDependencies as allEslintDeps } from '../template/eslint/package.json' assert { type: 'json' }
import { deepMerge, sortDependencies } from './index'

type ConfigProps = Partial<typeof allEslintDeps>

const dependencies: ConfigProps = {}
function addEslintDependency(name) {
  return Reflect.set(dependencies, name, allEslintDeps[name])
}

addEslintDependency('eslint')
addEslintDependency('eslint-plugin-vue')

interface ESLintConfig extends Linter.Config {
  extends: string[]
}

const config: ESLintConfig = {
  root: true,
  extends: ['plugin:vue/vue3-essential']
}

interface ConfigEslintProps {
  (params: {
    language: 'javascript' | 'typescript'
    styleGuide: string
    needsPrettier: boolean
    needsCypress: boolean
    needsCypressCT: boolean
  }): {
    dependencies: ConfigProps
    configuration: string
  }
}

/**
 * 根据配置项，补充package.json依赖，以及 eslintrc.js
 * @param param0
 * @returns 返回package.json新增dev依赖
 */
const configureEslint: ConfigEslintProps = ({
  language,
  styleGuide,
  needsCypress,
  needsCypressCT,
  needsPrettier
}) => {
  switch (`${styleGuide}-${language}`) {
    case 'default-javascript':
      config.extends.push('eslint:recommended')
      break
    case 'default-typescript':
      addEslintDependency('@vue/eslint-config-typescript')
      config.extends.push('eslint:recommended')
      config.extends.push('@vue/eslint-config-typescript/recommended')
      break
  }

  if (needsPrettier) {
    addEslintDependency('prettier')
    addEslintDependency('@vue/eslint-config-prettier')
    config.extends.push('@vue/eslint-config-prettier')
  }

  if (needsCypress) {
    const cypressOverrides = [
      {
        files: needsCypressCT
          ? ['**/__tests__/*.{cy,spec}.{js,ts,jsx,tsx}', 'cypress/e2e/**.{cy,spec}.{js,ts,jsx,tsx}']
          : ['cypress/e2e/**.{cy,spec}.{js,ts,jsx,tsx}'],
        extends: ['plugin:cypress/recommended']
      }
    ]

    addEslintDependency('eslint-plugin-cypress')
    config.overrides = cypressOverrides
  }

  let configuration = '/* eslint-env node */\n'
  if (styleGuide !== 'default' || language !== 'javascript' || needsPrettier) {
    addEslintDependency('@rushstack/eslint-patch')
    configuration += `require("@rushstack/eslint-patch/modern-module-resolution");\n\n`
  }
  configuration += `module.exports = ${JSON.stringify(config, undefined, 2)}\n`

  return {
    dependencies,
    configuration
  }
}

interface RenderEslintProps<T = void> {
  (
    root: string,
    params: {
      needsTypeScript: boolean
      needsCypress: boolean
      needsCypressCT: boolean
      needsPrettier: boolean
    }
  ): T
}

const renderEslint: RenderEslintProps = (
  rootDir,
  { needsTypeScript, needsCypress, needsCypressCT, needsPrettier }
) => {
  const { dependencies, configuration } = configureEslint({
    language: needsTypeScript ? 'typescript' : 'javascript',
    styleGuide: 'default',
    needsCypress,
    needsCypressCT,
    needsPrettier
  })

  const packageJsonPath = path.resolve(rootDir, 'package.json')
  // 读取已有pacakge.json
  const existingPkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
  // 合并package.json，并对package.json配置排序
  const pacakgeJson = sortDependencies(
    deepMerge(existingPkg, {
      scripts: {
        lint: needsTypeScript
          ? 'eslint . --ext .vue,.js,.jsx,.cjs,.mjs,.ts,.tsx,.cts,.mts --fix --ignore-path .gitignore'
          : 'eslint . --ext .vue,.js,.jsx,.cjs,.mjs --fix --ignore-path .gitignore'
      },
      devDependencies: dependencies
    })
  )

  fs.writeFileSync(packageJsonPath, JSON.stringify(pacakgeJson, null, 2) + '\n')

  // 写入.eslintrc.cjs
  const eslintPath = path.resolve(rootDir, '.eslintrc.cjs')
  fs.writeFileSync(eslintPath, configuration)
}

export default renderEslint
