// Offline smoke test: proves the Host module loads and exposes the expected contract,
// without needing a running DSH or the `webServer` service.
import * as mod from '../index.js'

let failures = 0
function assert(cond, msg) {
  if (!cond) {
    failures += 1
    console.error('FAIL: ' + msg)
  } else {
    console.log('ok: ' + msg)
  }
}

assert(mod.name === 'lawagent-ui', 'name === lawagent-ui')
assert(Array.isArray(mod.inject) && mod.inject.includes('webServer'), 'inject includes webServer')
assert(typeof mod.apply === 'function', 'apply is a function')

if (failures > 0) {
  console.error(failures + ' assertion(s) failed')
  process.exit(1)
}
console.log('smoke ok')
