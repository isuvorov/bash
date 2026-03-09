#!/usr/bin/env node

import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const HOME = homedir();
const LAUNCH_AGENTS_DIR = join(HOME, "Library", "LaunchAgents");
const CRONS_DIR = __dirname;
const LABEL_PREFIX = "com.user.crons";

// ======================== CONFIG ========================

const crons = [
  {
    name: "nightly",
    time: "02:00",
    script: "./nightly/nightly.sh",
  },
  {
    name: "daily",
    time: "10:30",
    script: "./daily/daily.sh",
  },
  {
    name: "hourly",
    time: "**:15",
    script: "./hourly/hourly.sh",
  },
  // {
  //   name: "hourly-check",
  //   time: "**:30",          // каждый час в :30
  //   command: "echo 'hourly check'",
  // },
  // {
  //   name: "weekly-cleanup",
  //   time: { Weekday: 0, Hour: 3, Minute: 0 },  // воскресенье 03:00
  //   script: "./scripts/weekly-cleanup.sh",
  // },
];

// ========================================================

/**
 * Парсит время в формат StartCalendarInterval
 *
 * Поддерживает:
 *   "HH:MM"   → каждый день в HH:MM
 *   "**:MM"    → каждый час в :MM
 *   { Hour, Minute, Weekday, Day, Month } → как есть
 */
function parseTime(time) {
  if (typeof time === "object") return time;

  const parts = time.split(":");
  const hourStr = parts[0];
  const minuteStr = parts[1];

  const interval = {};
  if (minuteStr != null && minuteStr !== "*" && minuteStr !== "**") {
    interval.Minute = Number(minuteStr);
  }
  if (hourStr != null && hourStr !== "*" && hourStr !== "**") {
    interval.Hour = Number(hourStr);
  }
  return interval;
}

/**
 * Генерирует содержимое plist файла
 */
function generatePlist({ name, time, script, command, runAtLoad = false }) {
  const label = `${LABEL_PREFIX}.${name}`;
  const logDir = join(CRONS_DIR, name);
  const interval = parseTime(time);

  // ProgramArguments
  let programArgs;
  if (script) {
    const scriptPath = resolve(CRONS_DIR, script);
    programArgs = ["/bin/bash", scriptPath, name];
  } else if (command) {
    programArgs = ["/bin/bash", "-c", command];
  } else {
    throw new Error(`Cron "${name}": нужен "script" или "command"`);
  }

  const argsXml = programArgs
    .map((arg) => `        <string>${escapeXml(arg)}</string>`)
    .join("\n");

  const intervalXml = Object.entries(interval)
    .map(
      ([key, val]) =>
        `        <key>${key}</key>\n        <integer>${val}</integer>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
 "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>

    <key>Label</key>
    <string>${label}</string>

    <key>ProgramArguments</key>
    <array>
${argsXml}
    </array>

    <key>StartCalendarInterval</key>
    <dict>
${intervalXml}
    </dict>

    <key>RunAtLoad</key>
    <${runAtLoad}/>

    <key>StandardOutPath</key>
    <string>${join(logDir, `${name}.out.log`)}</string>

    <key>StandardErrorPath</key>
    <string>${join(logDir, `${name}.err.log`)}</string>

</dict>
</plist>
`;
}

function escapeXml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function exec(cmd) {
  try {
    return execSync(cmd, { encoding: "utf-8", stdio: "pipe" }).trim();
  } catch {
    return null;
  }
}

function isLoaded(label) {
  const result = exec(`launchctl list 2>/dev/null | grep "${label}"`);
  return result != null && result.length > 0;
}

function loadPlist(plistPath) {
  console.log(`    launchctl load -w "${plistPath}"`);
  return exec(`launchctl load -w "${plistPath}"`);
}

function unloadPlist(plistPath) {
  console.log(`    launchctl unload "${plistPath}"`);
  return exec(`launchctl unload "${plistPath}"`);
}

function main() {
  console.log("🕐 Syncing cron jobs...\n");

  if (!existsSync(LAUNCH_AGENTS_DIR)) {
    mkdirSync(LAUNCH_AGENTS_DIR, { recursive: true });
  }

  const configLabels = new Set();

  // === Создание / обновление cron задач ===
  for (const cron of crons) {
    const label = `${LABEL_PREFIX}.${cron.name}`;
    configLabels.add(label);

    const cronDir = join(CRONS_DIR, cron.name);
    const localPlist = join(cronDir, `${cron.name}.plist`);
    const agentPlist = join(LAUNCH_AGENTS_DIR, `${label}.plist`);

    // Создаём директорию для логов
    if (!existsSync(cronDir)) {
      mkdirSync(cronDir, { recursive: true });
    }

    // Генерируем plist
    const plistContent = generatePlist(cron);

    // Проверяем изменился ли plist
    const existingContent = existsSync(agentPlist)
      ? readFileSync(agentPlist, "utf-8")
      : null;

    if (existingContent === plistContent) {
      const loaded = isLoaded(label);
      console.log(
        `  ✓ ${cron.name} — без изменений (${cron.time})${loaded ? "" : " [NOT LOADED]"}`,
      );
      // Если не загружен — загрузить
      if (!loaded) {
        loadPlist(agentPlist);
      }
      continue;
    }

    // Выгружаем старый, если был
    if (existsSync(agentPlist) && isLoaded(label)) {
      unloadPlist(agentPlist);
    }

    // Записываем plist
    writeFileSync(localPlist, plistContent);
    writeFileSync(agentPlist, plistContent);

    // Загружаем
    loadPlist(agentPlist);

    const action = existingContent ? "обновлён" : "создан";
    console.log(`  + ${cron.name} — ${action} (${cron.time})`);
  }

  // === Удаление cron задач, которых нет в конфиге ===
  const existingAgents = readdirSync(LAUNCH_AGENTS_DIR).filter(
    (f) => f.startsWith(`${LABEL_PREFIX}.`) && f.endsWith(".plist"),
  );

  for (const file of existingAgents) {
    const label = file.replace(".plist", "");
    if (configLabels.has(label)) continue;

    const name = label.replace(`${LABEL_PREFIX}.`, "");
    const agentPlist = join(LAUNCH_AGENTS_DIR, file);
    const cronDir = join(CRONS_DIR, name);
    const localPlist = join(cronDir, `${name}.plist`);

    // Выгружаем
    if (isLoaded(label)) {
      unloadPlist(agentPlist);
    }

    // Удаляем plist из LaunchAgents
    if (existsSync(agentPlist)) {
      unlinkSync(agentPlist);
    }

    // Удаляем локальный plist
    if (existsSync(localPlist)) {
      unlinkSync(localPlist);
    }

    console.log(`  - ${name} — удалён`);
  }

  console.log("\n✅ Готово");
}

main();
