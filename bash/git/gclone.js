#!/usr/bin/env node
const open = require("open");
const { exec } = require("child_process");
const getGitUrl = require("./getGitUrl");
let url = process.argv[2];
if (!url) throw "!url";

url = getGitUrl(url);
// console.log({url});
let { pathname } = new URL(url);
pathname = pathname.slice(1);

const slug = pathname.replace(/\//g, "-");

const cmd = "git clone " + slug + " " + process.argv.slice(3);
console.log("> " + cmd);
exec(cmd);
require("./projects");
