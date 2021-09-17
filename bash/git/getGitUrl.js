#!/usr/bin/env node
const getGitUrl = initUrl => {
  let originalUrl = initUrl;
  if (!originalUrl.startsWith('http') && !originalUrl.startsWith('ssh')) {
    originalUrl = 'ssh://' + originalUrl;
  }
  if (originalUrl.indexOf('git@github.com:') !== -1) {
    originalUrl = originalUrl.replace('git@github.com:', 'git@github.com/')
  }
  if (originalUrl.indexOf('.git') !== -1) {
    originalUrl = originalUrl.replace('.git', '')
  }
  return originalUrl
}

module.exports = getGitUrl
