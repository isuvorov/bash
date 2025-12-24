#!/usr/bin/env node
import { existsSync } from "node:fs";
import { lstat, readdir, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import Err from "@lsk4/err";
import { createLogger } from "@lsk4/log";
import { map } from "fishbird";
import { getPathInfo, projectDirs, projectJsonFile } from "./config.js";

// const projectDirs = [__dirname, __dirname + '/lskjs'];
const log = createLogger("[projects]");
log.info("[dirs]", projectDirs.join(", "));

async function isProject(file, projectDir) {
	if (file === "node_modules") return false;
	// if (file === 'lskjs') return false;
	if (file[0] === "_") return false;
	if (file[0] === ".") return false;
	const res = await lstat([projectDir, file].join("/"));
	return res.isDirectory();
}

async function main() {
	const dirs = [];

	await map(
		projectDirs,
		async (projectDir) => {
			try {
				const files = await readdir(projectDir);
				const has = existsSync(projectDir + "/.git");
				if (has) {
					dirs.push({ name: basename(projectDir), dir: projectDir });
					return;
				}

				await map(files, async (file) => {
					if (!(await isProject(file, projectDir))) return;
					dirs.push({
						name: file,
						dir: [projectDir, file].join("/"),
					});
				});
			} catch (err) {
				log.error(projectDir, Err.getMessage(err));
			}
		},
		[],
	);

	const projects = dirs.map(({ dir, name }) => ({
		name: name,
		rootPath: dir,
		paths: [],
		tags: getPathInfo(dir).tags,
		group: Math.random() > 0.5 ? "lskjs" : "other",
	}));
	const json = JSON.stringify(projects, null, 4);
	await writeFile(projectJsonFile, json);

	log.info(
		"[project.json] saved to",
		projectJsonFile,
		projects.length,
		"projects",
	);
}

main().catch((err) => {
	log.error("Fatal:", Err.getMessage(err));
	process.exit(1);
});
