# UCAN

[![npm (scoped)](https://img.shields.io/npm/v/%40fission-codes/ucan)](https://www.npmjs.com/package/@fission-codes/ucan)
[![GitHub Workflow Status (with event)](https://img.shields.io/github/actions/workflow/status/fission-codes/stack/ucan.yml)](https://github.com/fission-codes/stack/actions/workflows/ucan.yml)
[![Built by FISSION](https://img.shields.io/badge/built_by-⌘_Fission-purple.svg)](https://fission.codes)
[![Discord](https://img.shields.io/discord/478735028319158273?&color=mediumslateblue)](https://discord.gg/zAQBDEq)
[![Discourse users](<https://img.shields.io/discourse/users?server=https%3A%2F%2Ftalk.fission.codes&label=talk&color=rgb(14%2C%20118%2C%20178)>)](https://talk.fission.codes)

## Installation

```bash
pnpm install @fission-codes/ucan
```

## Usage

```js
import { UCAN } from '@fission-codes/ucan'
import { EdDSASigner } from 'iso-signatures/signers/eddsa.js'

const ucan = await UCAN.create({
  issuer: signer,
  audience: audience.did,
  capabilities: { 'ucan:*': { '*': [{}] } },
})


```

## Docs

Check <https://fission-codes.github.io/stack>

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
