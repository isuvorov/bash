#!/usr/bin/env node
const open = require("open");
const { exec } = require("child_process");
const getGitUrl = require("./getGitUrl");
const { spawn } = require("child_process");
const fs = require("fs");
const zenPath = "/Applications/Zen.app/Contents/MacOS/zen";
const isZen = fs.existsSync(zenPath);

const open2 = (url, { app }, callback) => {
  const child = spawn(app?.name || "/Applications/Zen.app/Contents/MacOS/zen", [url], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
};

exec("git rev-parse HEAD", (err, hashStdout) => {
  const hash = hashStdout.trim();
  exec("git remote -v", (err, stdout) => {
    if (err) {
      console.error(err);
    } else {
      const data = stdout
        .split("\n")
        .filter(Boolean)
        .map((row) => {
          const [name, git] = row.trim().split("\t").filter(Boolean);
          let [url, type] = git.split(" ");
          originalUrl = getGitUrl(url);
          // console.log({url, originalUrl});
          let hostname = "";
          let pathname = "";
          try {
            ({ hostname, pathname } = new URL(originalUrl));
          } catch (err) {
            try {
              ({ hostname, pathname } = new URL(getGitUrl(url, 1)));
            } catch (err) {     
              console.error(err);
              console.error({ originalUrl });
              return null;
            }
          }
          let gitUrl = "https://" + hostname + pathname;
          const url2 = gitUrl + "/commit/" + hash;
          return { name, url: url2, type: type.substr(1, type.length - 2) };
        });
      // console.log('data', data);
      const onError = (err) => {
        if (err) {
          console.error("❌ Ошибка открытия через open -a:", err);
        } else {
          console.log("✅ Успешно открыто через open -a");
        }
      };
      data
        .filter(Boolean)
        .filter(({ type }) => type === "fetch")
        .forEach(({ url }) => {
          try {
            console.log(
              isZen ? "zen" : "open",
              url
            );
            if (isZen) {
              // open2(url);
              open2(
                url,
                {
                  app: { name: "/Applications/Zen.app/Contents/MacOS/zen" },
                },
                onError
              );
            } else {
              open(url, onError);
            }
          } catch (err) {
            console.error("Error opening URL:", err);
          }
        });
    }
  });
});
