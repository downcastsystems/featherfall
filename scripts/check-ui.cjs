const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
for (const file of fs.readdirSync(path.join(__dirname, "../ui"))) {
  if (file.endsWith(".js"))
    execFileSync(
      process.execPath,
      ["--check", path.join(__dirname, "../ui", file)],
      { stdio: "inherit" },
    );
}
