#!/usr/bin/env node
const fs = require('fs');

const projectsEnv = process.env.PROJECTS || process.env.HOME + '/projects'
const projectDirs = (projectsEnv).split(',').filter(Boolean);
if (!projectDirs.length) throw '!projectDirs§'
const projectJsonDir = projectDirs[0]
// const projectDirs = [__dirname, __dirname + '/lskjs'];
console.log({projectDirs})

function isProject(file, projectDir) {
  if (file === 'node_modules') return false;
  // if (file === 'lskjs') return false;
  if (file[0] === '_') return false;
  if (file[0] === '.') return false;
  return fs.lstatSync([projectDir, file].join('/')).isDirectory();
}

const dirs = [];
projectDirs.forEach((projectDir) => {
  try {
    const files = fs.readdirSync(projectDir);

    files.forEach(file => {
      if (!isProject(file, projectDir)) return;
      dirs.push({
        name: file,
        dir: [projectDir, file].join('/'),
      });
    });
  } catch(err) {
    console.error({projectDir})
  }


}, []);

const projects = dirs.map(({dir, name}) => ({
  "name": name,
  "rootPath": dir,
  "paths": [],
  "group": ""
}));
projects.push({
  "name": "bash",
  "rootPath": "/Users/isuvorov/bash",
  "paths": [],
  "group": ""
});
const json = JSON.stringify(projects, null, 4)


fs.writeFileSync(projectJsonDir + '/projects.json', json);
