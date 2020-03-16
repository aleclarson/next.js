// taskr babel plugin with Babel 7 support
// https://github.com/lukeed/taskr/pull/305

const path = require('path')
const transform = require('@babel/core').transform

const babelClientOpts = {
  presets: [
    '@babel/preset-typescript',
    [
      '@babel/preset-env',
      {
        modules: 'commonjs',
        targets: {
          esmodules: true,
        },
        loose: true,
        // This is handled by the Next.js webpack config that will run next/babel over the same code.
        exclude: [
          'transform-typeof-symbol',
          'transform-async-to-generator',
          'transform-spread',
        ],
      },
    ],
    ['@babel/preset-react', { useBuiltIns: true }],
  ],
  plugins: [
    // workaround for @taskr/esnext bug replacing `-import` with `-require(`
    // eslint-disable-next-line no-useless-concat
    '@babel/plugin-syntax-dynamic-impor' + 't',
    ['@babel/plugin-proposal-class-properties', { loose: true }],
  ],
}

const babelServerOpts = {
  presets: [
    '@babel/preset-typescript',
    ['@babel/preset-react', { useBuiltIns: true }],
    [
      '@babel/preset-env',
      {
        modules: 'commonjs',
        targets: {
          node: '8.3',
        },
        loose: true,
        exclude: ['transform-typeof-symbol'],
      },
    ],
  ],
  plugins: [
    '@babel/plugin-proposal-optional-chaining',
    '@babel/plugin-proposal-nullish-coalescing-operator',
    'babel-plugin-dynamic-import-node',
    ['@babel/plugin-proposal-class-properties', { loose: true }],
  ],
}

module.exports = function(task) {
  // eslint-disable-next-line require-yield
  task.plugin('babel', {}, function*(
    file,
    serverOrClient,
    { stripExtension } = {}
  ) {
    // Don't compile .d.ts
    if (file.base.endsWith('.d.ts')) return

    // Replace `.ts|.tsx` with `.js` in files with an extension
    const ext = path.extname(file.base)
    const dest = file.base.slice(0, -ext.length) + (stripExtension ? '' : '.js')

    const babelOpts =
      serverOrClient === 'client' ? babelClientOpts : babelServerOpts

    const options = {
      ...babelOpts,
      plugins: [
        ...babelOpts.plugins,
        // pages dir doesn't need core-js
        serverOrClient === 'client'
          ? [
              '@babel/plugin-transform-runtime',
              {
                corejs: false,
                helpers: true,
                regenerator: false,
                useESModules: false,
              },
            ]
          : false,
      ].filter(Boolean),
      compact: true,
      babelrc: false,
      configFile: false,
      filename: file.base,
      sourceMaps: true,
      sourceFileName: path.relative(
        path.join('dist', file.dir),
        path.join(file.dir, file.base)
      ),
    }
    const output = transform(file.data, options)
    file.base = dest

    // Workaround for noop.js loading
    if (file.base === 'next-dev.js') {
      output.code = output.code.replace(
        /__REPLACE_NOOP_IMPORT__/g,
        `import('./dev/noop');`
      )
    }

    if (output.map) {
      const map = `${file.base}.map`

      // append `sourceMappingURL` to original file
      if (options.sourceMaps !== 'both') {
        output.code += new Buffer(`\n//# sourceMappingURL=${map}`)
      }

      // add sourcemap to `files` array
      this._.files.push({
        base: map,
        dir: file.dir,
        data: new Buffer(JSON.stringify(output.map)),
      })
    }

    file.data = Buffer.from(setNextVersion(output.code))
  })
}

function setNextVersion(code) {
  return code.replace(
    /process\.env\.__NEXT_VERSION/g,
    `"${require('./package.json').version}"`
  )
}
