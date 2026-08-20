// Копирует манифест Tizen и иконку в dist/, делая папку готовой к `tizen package -t wgt`.
// Запускается автоматически после `vite build` (см. npm-скрипт "build").
import { copyFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, "..");
const dist = resolve(appRoot, "dist");

if (!existsSync(dist)) {
  console.error("dist/ не найден — сначала запусти vite build");
  process.exit(1);
}

for (const file of ["config.xml", "icon.png"]) {
  const src = resolve(appRoot, file);
  if (!existsSync(src)) {
    console.error(`Нет ${file} в ${appRoot}`);
    process.exit(1);
  }
  copyFileSync(src, resolve(dist, file));
  console.log(`✓ ${file} → dist/`);
}
console.log("dist/ готов к упаковке: cd dist && tizen package -t wgt -s <cert-profile>");
