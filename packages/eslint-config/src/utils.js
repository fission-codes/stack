'use strict'

const ignorePatterns = [
  '*.min.*',
  'CHANGELOG.md',
  'dist',
  'LICENSE*',
  'output',
  'out',
  'coverage',
  'public',
  'temp',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  '__snapshots__',
  // ignore for in lint-staged
  '*.css',
  '*.png',
  '*.ico',
  '*.toml',
  '*.patch',
  '*.txt',
  '*.crt',
  '*.key',
  'Dockerfile',
  // force include
  '!.github',
  '!.vitepress',
  '!.vscode',
  // force exclude
  '**/.vitepress/cache',
]

exports.ignorePatterns = ignorePatterns
