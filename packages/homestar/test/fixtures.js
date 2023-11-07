/* eslint-disable unicorn/no-null */
export const workflow1 = {
  tasks: [
    {
      cause: null,
      meta: {
        memory: 4_294_967_296,
        time: 100_000,
      },
      prf: [],
      run: {
        input: {
          args: [
            {
              '/': 'bafybeiejevluvtoevgk66plh5t6xiy3ikyuuxg3vgofuvpeckb6eadresm',
            },
            150,
            350,
            500,
            500,
          ],
          func: 'crop',
        },
        nnc: '',
        op: 'wasm/run',
        rsc: 'ipfs://bafybeichafzlolnoamugvfuyynjnj2gse7avstiqkeiuwuv2gyztap4qm4',
      },
    },
    {
      cause: null,
      meta: {
        memory: 4_294_967_296,
        time: 100_000,
      },
      prf: [],
      run: {
        input: {
          args: [
            {
              'await/ok': {
                '/': 'bafyrmigev36skyfjnslfswcez24rnrorzeaxkrpb3wci2arfkly5zcrepy',
              },
            },
          ],
          func: 'grayscale',
        },
        nnc: '',
        op: 'wasm/run',
        rsc: 'ipfs://bafybeichafzlolnoamugvfuyynjnj2gse7avstiqkeiuwuv2gyztap4qm4',
      },
    },
  ],
}
