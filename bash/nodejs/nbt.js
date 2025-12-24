#!/usr/bin/env node
const argv = process.argv.slice(2);
const args = argv.join(" ");

const cmd = [
	"pnpm run build --prod " + args,
	"pnpm run test --prod " + args,
].join(" && ");
console.log(">>> " + cmd);

// spawn with realtime output
const { spawn } = require("child_process");
const child = spawn(cmd, { shell: true, stdio: "inherit" });
child.on("exit", (code, signal) => {
	console.error(
		"child process exited with " + `code ${code} and signal ${signal}`,
	);
});
