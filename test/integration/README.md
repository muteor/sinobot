# Integration Tests

These tests are intentionally exlcuded from build as they interact with third-party services
that require config.

You can run them like:

`node_modules/.bin/mocha --require babel-core/register test/integration/ssh.js`