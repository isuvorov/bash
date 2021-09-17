#!/usr/bin/env node
const open = require('open');
const { exec } = require('child_process');
const getGitUrl = require('./getGitUrl');

exec('git rev-parse HEAD', (err, hashStdout) => {
  const hash = hashStdout.trim();
  exec('git remote -v', (err, stdout) => {
    if (err) {
      console.error(err)
    } else {
      const data = stdout.split('\n').filter(Boolean).map(row => {
        const [name, git] = row.trim().split('\t').filter(Boolean);
        let [url, type] = git.split(' ');
        originalUrl = getGitUrl(url)
        // console.log({url, originalUrl});
        try {
          const {hostname, pathname} = new URL(originalUrl);
          let gitUrl = 'https://' + hostname + pathname
          const url = gitUrl + '/commit/' + hash
          return {name, url, type: type.substr(1, type.length - 2)}
        } catch(err) {
          console.error(err)
          return null;
        }

      })
      // console.log('data', data);
      data.filter(Boolean).filter(({type}) => type === 'fetch').forEach(({url}) => {
        console.log('open: ' + url);
        open(url)
      })
    }
  });
})