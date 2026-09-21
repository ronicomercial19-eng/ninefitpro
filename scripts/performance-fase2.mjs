import { existsSync, readdirSync, statSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { gzipSync } from "node:zlib";

const dist = resolve(process.cwd(), "dist");
if (!existsSync(dist)) {
  console.error("FAIL Performance: dist ausente; execute o build primeiro.");
  process.exit(1);
}

const assets = resolve(dist, "assets");
const jsFiles = existsSync(assets)
  ? readdirSync(assets).filter((file) => file.endsWith(".js"))
  : [];
if (jsFiles.length === 0) {
  console.error("FAIL Performance: nenhum bundle JavaScript encontrado.");
  process.exit(1);
}

const measurements = jsFiles.map((file) => {
  const path = join(assets, file);
  const content = readFileSync(path);
  return {
    file,
    rawBytes: statSync(path).size,
    gzipBytes: gzipSync(content).length,
  };
});
const largest = measurements.sort((a, b) => b.rawBytes - a.rawBytes)[0];
const hasPwa = existsSync(resolve(dist, "sw.js")) && existsSync(resolve(dist, "manifest.webmanifest"));
const rawLimit = 4_000_000;
const gzipLimit = 1_200_000;
const checks = [
  ["PWA gerada", hasPwa],
  ["Maior JS bruto abaixo de 4 MB", largest.rawBytes < rawLimit],
  ["Maior JS gzip abaixo de 1,2 MB", largest.gzipBytes < gzipLimit],
];

for (const [label, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
console.log(`INFO Maior bundle: ${largest.file}; bruto=${largest.rawBytes} bytes; gzip=${largest.gzipBytes} bytes`);
if (checks.some(([, ok]) => !ok)) process.exit(1);
