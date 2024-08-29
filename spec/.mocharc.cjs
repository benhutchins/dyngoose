module.exports = {
  require: ['ts-node/register'],
  reporter: 'dot',
  extensions: ['ts', 'js'],
  timeout: 20000,
  recursive: true,
  'enable-source-maps': true,
  'expose-gc': true,
  // Uncomment this to find all skipped tests.
  // forbidPending: true
}