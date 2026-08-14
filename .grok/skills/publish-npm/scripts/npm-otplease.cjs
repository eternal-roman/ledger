#!/usr/bin/env node
'use strict'

/**
 * Run npm CLI from a non-TTY agent so web-OTP actually opens.
 *
 * npm otplease (lib/utils/auth.js) only opens the confirm page when
 * stdin+stdout are TTYs. Agent shells are not. This process:
 *   1. Pretends to be a TTY
 *   2. Intercepts npm's createOpener
 *   3. Opens the real https://www.npmjs.com/auth/cli/<id> URL
 *   4. Writes that URL to %TEMP%/npm-otplease-auth-url.txt for re-open
 *
 * Usage:
 *   node npm-otplease.cjs <pkg-dir> [npm args...]
 * Defaults: publish --access public --ignore-scripts
 */

const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')
const Module = require('module')

function findNpmCli() {
  const nextToNode = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'lib', 'cli.js')
  if (fs.existsSync(nextToNode)) return nextToNode
  const win = 'C:/Program Files/nodejs/node_modules/npm/lib/cli.js'
  if (fs.existsSync(win)) return win
  throw new Error('Cannot find npm lib/cli.js next to node. Install a full Node+npm distribution.')
}

function openBrowser(url) {
  const plat = process.platform
  if (plat === 'win32') {
    execFileSync('cmd.exe', ['/c', 'start', '', url], { windowsHide: false })
    return
  }
  if (plat === 'darwin') {
    execFileSync('open', [url])
    return
  }
  execFileSync('xdg-open', [url])
}

process.stdin.isTTY = true
process.stdout.isTTY = true
process.stderr.isTTY = true

const urlFile = path.join(os.tmpdir(), 'npm-otplease-auth-url.txt')

const origRequire = Module.prototype.require
Module.prototype.require = function patchedRequire(id) {
  const exp = origRequire.apply(this, arguments)
  const norm = String(id).replace(/\\/g, '/')
  if (norm.endsWith('utils/read-user-info.js') && exp && typeof exp.otp === 'function') {
    return {
      ...exp,
      otp: async () => {
        throw new Error(
          'npm-otplease: classic TOTP requested (no authUrl). Kill this process and retry with --otp=<6-digit>. Do not paste an npm_ token.'
        )
      },
    }
  }
  if (norm.endsWith('utils/open-url.js') && exp && typeof exp.createOpener === 'function') {
    return {
      openUrl: exp.openUrl,
      openUrlPrompt: exp.openUrlPrompt,
      createOpener: () => async (url) => {
        const u = String(url)
        fs.writeFileSync(urlFile, u)
        process.stderr.write('Opening npm confirm page in the default browser.\n')
        process.stderr.write('Approve it while signed in as the package owner, then wait.\n')
        process.stderr.write('If the tab is missing, open: ' + urlFile + '\n')
        try {
          openBrowser(u)
        } catch (e) {
          process.stderr.write('Could not auto-open browser. Open the URL file above.\n')
        }
      },
    }
  }
  return exp
}

const cwd = path.resolve(process.argv[2] || process.cwd())
const npmArgs = process.argv.slice(3)
if (npmArgs.length === 0) {
  npmArgs.push('publish', '--access', 'public')
}
if (!fs.existsSync(cwd) || !fs.statSync(cwd).isDirectory()) {
  throw new Error('Not a directory: ' + cwd)
}
process.chdir(cwd)
process.argv = ['node', 'npm-cli.js', ...npmArgs]
require(findNpmCli())(process)
