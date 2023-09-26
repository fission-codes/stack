# eslint-config

[![npm (scoped)](https://img.shields.io/npm/v/%40fission-codes/eslint-config)](https://www.npmjs.com/package/@fission-codes/eslint-config)
[![GitHub Workflow Status (with event)](https://img.shields.io/github/actions/workflow/status/fission-codes/stack/eslint-config.yml)](https://github.com/fission-codes/stack/actions/workflows/eslint-config.yml)
[![Built by FISSION](https://img.shields.io/badge/built_by-⌘_Fission-purple.svg)](https://fission.codes)
[![Discord](https://img.shields.io/discord/478735028319158273?&color=mediumslateblue)](https://discord.gg/zAQBDEq)
[![Discourse users](<https://img.shields.io/discourse/users?server=https%3A%2F%2Ftalk.fission.codes&label=talk&color=rgb(14%2C%20118%2C%20178)>)](https://talk.fission.codes)

Fission eslint, ts and prettier config.

## Installation

```bash
pnpm install @fission-codes/eslint-config
```

## Usage

`package.json`

```json
{
  "main": "src/index.js",
  "types": "dist/src/index.d.ts",
  "files": ["dist/src", "src", "index.js", "cli.js"],
  "scripts": {
    "lint": "eslint . && prettier --check **/*.{js,ts,yml,json} --ignore-path .gitignore && tsc"
  },
  "simple-git-hooks": {
    "pre-commit": "npx lint-staged"
  },
  "lint-staged": {
    "*.{js,ts,md,yml,json}": "prettier --write",
    "*": "eslint --fix"
  },
  "eslintConfig": {
    "extends": "@fission-codes",
    "ignorePatterns": ["coverage", "dist", "docs"],
    // for preact
    "settings": {
      "react": {
        "pragma": "h",
        "version": "18.0"
      }
    }
  },
  "prettier": "@fission-codes/eslint-config/prettier.config.js"
}
```

`tsconfig.json`

```json
{
  "extends": "@fission-codes/eslint-config/tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "emitDeclarationOnly": true
  },
  "include": ["src", "test.js", "cli.js", "package.json"]
}
```

For typescript code bases:

```json
{
  "extends": "@fission-codes/eslint-config/tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  },
  "include": ["src", "test.js", "cli.js", "package.json"]
}
```

In monorepos you can install `@fission-codes/eslint-config` only in the root and extends the root `tsconfig.json` in the packages.

## Contributing

Read contributing guidelines [here](.github/CONTRIBUTING.md).

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/fission-codes/stack)

## License

This project is licensed under either of

- Apache License, Version 2.0, ([LICENSE-APACHE](./LICENSE-APACHE) or
  [http://www.apache.org/licenses/LICENSE-2.0][apache])
- MIT license ([LICENSE-MIT](./LICENSE-MIT) or
  [http://opensource.org/licenses/MIT][mit])

at your option.

### Contribution

Unless you explicitly state otherwise, any contribution intentionally
submitted for inclusion in the work by you, as defined in the Apache-2.0
license, shall be dual licensed as above, without any additional terms or
conditions.

[apache]: https://www.apache.org/licenses/LICENSE-2.0
[mit]: http://opensource.org/licenses/MIT
