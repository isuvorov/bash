const open = require('open');
const url = require('url');

const { exec } = require('child_process');
exec('git remote -v', (err, stdout) => {
  if (err) {
    console.error(err)
  } else {
    const data = stdout.split('\n').filter(Boolean).map(row => {
      const [name, git] = row.trim().split('\t').filter(Boolean);
      let [originalUrl, type] = git.split(' ');

      if (!originalUrl.startsWith('http') && !originalUrl.startsWith('ssh')) {
        originalUrl = 'ssh://' + originalUrl;
      }
      // console.log({originalUrl});
      
      const {hostname, pathname} = new URL(originalUrl);
      const gitUrl = 'https://' + hostname + pathname;
      return {name, url: gitUrl, type: type.substr(1, type.length - 2)}
    })
    // console.log('data', data);
    data.filter(({type}) => type === 'fetch').forEach(({url}) => {
      console.log('open: ' + url);
      open(url)
    })
  }
});

