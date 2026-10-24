import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CARE_MODULES, careModuleForPath } from "../../data/careModules";
const app = readFileSync("src/App.tsx", "utf8");
const routes = new Set([...app.matchAll(/path="([^"]+)"/g)].map((m) => m[1]));
test("care module destinations resolve to registered professor and student routes", () => {
  for (const m of CARE_MODULES) {
    assert.ok(routes.has(m.professionalPath), m.professionalPath);
    for (const p of m.studentPaths) assert.ok(routes.has(p), p);
  }
  assert.equal(
    new Set(CARE_MODULES.map((m) => m.key)).size,
    CARE_MODULES.length,
  );
});
test("nested assessment and protocol routes keep their operational context", () => {
  assert.equal(
    careModuleForPath("/9fit/avaliacao/123/cardio")?.key,
    "assessment",
  );
  assert.equal(careModuleForPath("/9fit/protocols/sono/123")?.key, "recovery");
  assert.equal(careModuleForPath("/9fit/habitflow")?.key, "habits");
});
test("commercial and technical routes never open automatic professional sharing", () => {
  for (const path of [
    "/9fit/checkout/success",
    "/9fit/oferta/123",
    "/9fit/native-system",
    "/9fit/settings",
    "/9fit/embed",
  ])
    assert.equal(careModuleForPath(path), undefined);
});
