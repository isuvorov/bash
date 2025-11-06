#!/usr/bin/env node
import { lstat, readdir, writeFile } from "node:fs/promises";
import { createLogger } from "@lsk4/log";
import Err from "@lsk4/err";
import { map } from "fishbird";

const projectsEnv = process.env.PROJECTS || process.env.HOME + "/projects";
const projectDirs = projectsEnv.split(",").filter(Boolean);
if (!projectDirs.length) throw "!projectDirs";
const projectJsonDir = projectDirs[0];
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

				await map(files, async (file) => {
					if (!isProject(file, projectDir)) return;
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
		group: "",
	}));
	projects.push({
		name: "bash",
		rootPath: process.env.HOME + "/bash",
		paths: [],
		group: "",
	});
	const json = JSON.stringify(projects, null, 4);
	await writeFile(projectJsonDir + "/projects.json", json);

	log.info(
		"[project.json] saved to",
		projectJsonDir + "/projects.json",
		projects.length,
		"projects",
	);
}

main().catch((err) => {
	log.error("Fatal:", Err.getMessage(err));
	process.exit(1);
});
