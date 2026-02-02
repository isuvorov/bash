#!/usr/bin/env node
import { existsSync } from "node:fs";

import { execa } from "execa";
import open from "open";

const log = createLogger("[gitlab]");

import { createLogger } from "@lsk4/log";
import { getGitUrl } from "./getGitUrl.js";

const zenPath = "/Applications/Zen.app/Contents/MacOS/zen";
const isZen = existsSync(zenPath);
const openInZen = !!+process.env.LSKJS_GITLAB_OPEN_IN_ZEN && isZen;

const openZen = (url) => {
  execa(zenPath, [url], {
    detached: true,
    stdio: "ignore",
  }).unref();
};

const main = async () => {
  const { stdout: hashStdout } = await execa("git", ["rev-parse", "HEAD"]);
  const hash = hashStdout.trim();

  const { stdout } = await execa("git", ["remote", "-v"]);

  const data = stdout
    .split("\n")
    .filter(Boolean)
    .map((row) => {
      const [name, git] = row.trim().split("\t").filter(Boolean);
      const [url, type] = git.split(" ");
      const originalUrl = getGitUrl(url);
      let hostname = "";
      let pathname = "";
      try {
        ({ hostname, pathname } = new URL(originalUrl));
      } catch {
        try {
          ({ hostname, pathname } = new URL(getGitUrl(url, 1)));
        } catch (err2) {
          log.error(err2);
          log.error({ originalUrl });
          return null;
        }
      }
      const gitUrl = `https://${hostname}${pathname}`;
      const url2 = `${gitUrl}/commit/${hash}`;
      return { name, url: url2, type: type.slice(1, -1) };
    });

  const onError = (err) => {
    if (err) {
      log.error("❌ Ошибка открытия через open -a:", err);
    } else {
      log.info("✅ Успешно открыто через open -a");
    }
  };

  data
    .filter(Boolean)
    .filter(({ type }) => type === "fetch")
    .forEach(({ url }) => {
      try {
        log.info(openInZen ? "zen" : "open", url);
        if (openInZen) {
          openZen(url);
        } else {
          open(url, onError);
        }
      } catch (err) {
        log.error("Error opening URL:", err);
      }
    });
};

main().catch((err) => {
  log.fatal(err?.shortMessage || err?.message || err);
  process.exit(1);
});
