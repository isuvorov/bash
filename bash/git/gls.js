#!/usr/bin/env node
const fs = require('fs').promises;
const {promisify} = require('util');
const exec = promisify(require('child_process').exec);

const projectsEnv = process.env.PROJECTS || (process.env.HOME + '/projects')
const projectsDirs = (projectsEnv).split(',').filter(Boolean);
if (!projectsDirs.length) throw '!projectsDirs§'
const projectJsonDir = projectsDirs[0]
// const projectsDirs = [__dirname, __dirname + '/lskjs'];
// console.log({projectsDirs})

Promise.each = async function(arr, fn) { // take an array and a function
  for(const item of arr) await fn(item);
}

function countBy(collection, func = a => a) 
{
  var object = Object.create({});

  collection.forEach(function(item) {
    var key = func(item);
    if (key in object) {
      ++object[key];
    } else {
      object[key] = 1;
    }
  });

  return object;
}

function joins(kv) {
  return Object.keys(kv).map(k => `${kv[k]}${k}`).join(' ');
}

async function main() {
  await Promise.each(projectsDirs, async projectsDir => {
    const dirs = await fs.readdir(projectsDir);
    await Promise.each(dirs, async dir => {
      const cwd =  projectsDir + '/' + dir;
      // console.log({cwd})
      const has = await require('fs').existsSync(cwd + '/.git')
      // console.log({cwd, has})
      if (!has) return;
      const { stdout, stderr } = await exec('git status -s', {cwd});
      if (stderr) throw {stderr}
      if (!stdout) return;
      const h = {A: '➕', M: '✍️', D: '❌', '??': '❓'}
      const statuses = countBy(stdout.split('\n').map(i => h[i.substr(0, 2).trim()]).filter(Boolean));
      // console.log({statuses})
      console.log(`[uncommited files ${joins(statuses)}]`, cwd)
      // console.log({ cwd, stdout, stderr })
    })
  })
}

main();

// for D in *; do
//     if [ -d "${D}" ]; then
//       cd "${D}"
//       # echo "${D}";
//       if [ -d ".git" ]; then
//         VAR=$(git status -s | grep "" -c)
//         # echo "${D} - $VAR uncommited files";
//         if [ $VAR ]; then
//           echo "${D} - $VAR uncommited files";
//         fi
//       fi
//       cd ..
//     fi
// done