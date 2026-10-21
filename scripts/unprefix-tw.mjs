// Run once Bootstrap is gone: strips the tw: prefix from every class in src/.
// Then remove prefix(tw) from globals.css and "prefix": "tw" from components.json.
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(jsx?|tsx?|css)$/.test(p) ? [p] : [];
  });

let changed = 0;
for (const file of walk("src")) {
  const before = readFileSync(file, "utf8");
  const after = before
    .replace(/(^|[\s"'`{(])tw:/g, "$1") // class tokens: "tw:flex tw:hover:bg-accent"
    .replace(/var\(--tw-color-/g, "var(--color-"); // prefixed theme variables
  if (after !== before) {
    writeFileSync(file, after);
    changed++;
  }
}
console.log(`unprefixed ${changed} files`);
