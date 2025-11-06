#!/usr/bin/env node
import { exec as execCallback } from "node:child_process";
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { basename } from "node:path";
import { createLogger } from "@lsk4/log";
import Err from "@lsk4/err";
import { promisify } from "node:util";
import { map } from "fishbird";
const exec = promisify(execCallback);

const projectsEnv = process.env.PROJECTS || process.env.HOME + "/projects";
const projectsDirs = projectsEnv.split(",").filter(Boolean);
if (!projectsDirs.length) throw "!projectsDirs";
const projectJsonDir = projectsDirs[0];
// const projectsDirs = [__dirname, __dirname + '/lskjs'];
// console.log({projectsDirs})
const log = createLogger("[git]");

function countBy(collection, func = (a) => a) {
	var object = Object.create({});

	collection.forEach((item) => {
		var key = func(item);
		if (key in object) {
			++object[key];
		} else {
			object[key] = 1;
		}
	});

	return object;
}
const space = "_";
const h = { A: "🍏", M: "💛", D: "🍎", "??": "🥕" };
function joins(statuses) {
	return Object.keys(h)
		.map((key) => {
			const count = statuses[h[key]] || 0;
      if (count === 0) return '';
			if (count === 0) return `${String(space).padStart(3)}${space}`;
			return `${String(count).padStart(3)}${h[key]}`;
		})
		.join(" ");
}

async function main() {
	const projectsArrayArray = await map(projectsDirs, async (projectsDir) => {
		const dirs = await readdir(projectsDir);
		return await map(dirs, async (dir) => {
			const cwd = projectsDir + "/" + dir;
			const has = existsSync(cwd + "/.git");
			const projectName = basename(cwd);
			if (!has) return;
			const { stdout, stderr } = await exec("git status -s", { cwd });
			if (stderr) throw { stderr };
			if (!stdout) return;

			const statuses = countBy(
				stdout
					.split("\n")
					.map((i) => h[i.substr(0, 2).trim()])
					.filter(Boolean),
			);
			return { cwd, projectName, statuses };
		});
	});
	const projects = projectsArrayArray.flat().filter(Boolean);
	const maxNameLength = Math.max(
		...projects.map(({ projectName }) => projectName.length),
	);
	
	// Сортируем по сумме всех статусов (по убыванию)
	projects.sort((a, b) => {
		const sumA = Object.values(a.statuses).reduce((acc, val) => acc + val, 0);
		const sumB = Object.values(b.statuses).reduce((acc, val) => acc + val, 0);
		return sumB - sumA;
	});
	
	await map(projects, async ({ cwd, projectName, statuses }) => {
		// console.log({statuses})
		log.warn(`[${projectName}]`.padEnd(maxNameLength + 2), joins(statuses));
	});
	log.info(`Legend ${h.A} - added, ${h.M} - modified, ${h.D} - deleted, ${h["??"]} - untracked`);
}

main().catch((err) => {
	log.error(Err.getCode(err));
	log.error(Err.getMessage(err));
	log.error(err);
	process.exit(1);
});

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
