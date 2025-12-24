#!/usr/bin/env node
import { exec as execCallback } from "node:child_process";
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { promisify } from "node:util";
import Err from "@lsk4/err";
import { createLogger } from "@lsk4/log";
import { map } from "fishbird";
import { sortBy } from "fishdash";
import { getPathInfo, projectDirs } from "../nodejs/config.js";

const exec = promisify(execCallback);

function sumBy(obj) {
	return Object.values(obj).reduce((acc, val) => acc + val, 0);
}
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
			if (count === 0) return "";
			if (count === 0) return `${String(space).padStart(3)}${space}`;
			return `${String(count).padStart(3)}${h[key]}`;
		})
		.join(" ");
}

async function getGitInfo(cwd) {
	try {
		const { stdout, stderr } = await exec("git status -s", { cwd });
		if (stderr) {
			log.warn(`err in ${cwd}: ${stderr}`);
			return;
		}
		if (!stdout) return;

		const statuses = countBy(
			stdout
				.split("\n")
				.map((i) => h[i.substr(0, 2).trim()])
				.filter(Boolean),
		);
		return { cwd, statuses };
	} catch (err) {
		log.warn(`Cannot get git info for ${cwd}: ${Err.getMessage(err)}`);
		return;
	}
}

async function main() {
	const projectsArrayArray = await map(projectDirs, async (projectsDir) => {
		try {
			const dirs = await readdir(projectsDir);
			const cwd = projectsDir;
			const has = existsSync(cwd + "/.git");
			if (has) return await getGitInfo(cwd);

			return await map(dirs, async (dir) => {
				const cwd = projectsDir + "/" + dir;
				const has = existsSync(cwd + "/.git");
				if (!has) return;
				return await getGitInfo(cwd);
			});
		} catch (err) {
			log.warn(`Cannot access directory ${projectsDir}: ${Err.getMessage(err)}`);
			return [];
		}
	});
	const projects = projectsArrayArray.flat().filter(Boolean);
	const maxNameLength = Math.max(
		...projects.map(({ cwd }) => getPathInfo(cwd).projectName.length),
	);
	const sortedProjects = sortBy(projects, (p) => sumBy(p.statuses));

	await map(sortedProjects, async ({ cwd, statuses }) => {
		const { projectName, parentQuickPath, tags } = getPathInfo(cwd);
		log.warn(
			`[${projectName}]`.padEnd(maxNameLength + 2),
			joins(statuses).padEnd(20),
			tags.map((tag) => "[" + tag + "]").join(", "),
			`${parentQuickPath}`,
		);
	});
	log.info(
		`Legend ${h.A} - added, ${h.M} - modified, ${h.D} - deleted, ${h["??"]} - untracked`,
	);
}

main().catch((err) => {
	log.err(Err.getCode(err));
	log.err(Err.getMessage(err));
	log.err(err);
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
