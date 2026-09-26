// Syntax-check every source file without installing dependencies.
const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..')
const files = []

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const st = fs.statSync(full)
    if (st.isDirectory()) walk(full)
    else if (/\.(mjs|js|cjs)$/.test(name)) files.push(full)
  }
}

walk(path.join(root, 'tools'))
files.push(path.join(root, 'index.js'), path.join(root, 'client.js'))

let failed = 0
for (const f of files) {
  const r = spawnSync(process.execPath, ['--check', f], { stdio: 'inherit' })
  if (r.status !== 0) {
    failed += 1
    console.error('SYNTAX FAIL: ' + path.relative(root, f))
  }
}

console.log(`checked ${files.length} files`)
if (failed > 0) process.exit(1)
