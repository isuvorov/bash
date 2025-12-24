import { basename, resolve } from "node:path";

export const projectsEnv =
	process.env.LSKJS_PROJECTS || process.env.HOME + "/projects";
export const projectDirs = projectsEnv
	.split(",")
	.filter(Boolean)
	.map((r) => r.trim().replace(/^~\//, process.env.HOME + "/"));
if (!projectDirs.length) throw "!projectDirs";
export const projectJsonDir = projectDirs[0];
export const projectJsonFile = projectJsonDir + "/projects.json";

export function getQuickPath(cwd) {
	return cwd.startsWith(process.env.HOME)
		? cwd.replace(process.env.HOME, "~")
		: cwd;
}

export function getPathInfo(projectsDir) {
	const quickPath = getQuickPath(projectsDir);
	const dirs = projectsDir.split("/");

	const volumeName = projectsDir.startsWith("/Volumes")
		? "/V/" + dirs[2]
		: getQuickPath(resolve(projectsDir + "/.."));

	const tags = [volumeName];

	const projectName = basename(projectsDir);
	return {
		dirs,
		volumeName,
		projectName,
		quickPath,
		parentQuickPath: getQuickPath(resolve(projectsDir + "/..")),
		tags,
	};
}
