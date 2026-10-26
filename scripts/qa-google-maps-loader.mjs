import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';

const source = readFileSync(new URL('../src/services/googleMapsLoader.ts', import.meta.url), 'utf8')
  .replaceAll('import.meta.env', 'globalThis.mapsEnv');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function setup({ failOnce = false, partial = false } = {}) {
  const calls = [];
  let failed = false;
  const maps = partial ? { importLibrary() {} } : {};
  const context = {
    exports: {}, window: { google: { maps } }, mapsEnv: { VITE_GOOGLE_MAPS_API_KEY: 'test-browser-key' }, console,
    require: () => ({
      setOptions: options => calls.push(['options', options]),
      importLibrary: async name => {
        calls.push(['library', name]);
        if (failOnce && !failed) { failed = true; throw new Error('offline'); }
        if (name === 'maps') { maps.Map = class {}; maps.Polyline = class {}; }
        if (name === 'marker') maps.Marker = class {};
        if (name === 'geometry') maps.geometry = { spherical: {} };
        if (name === 'geocoding') maps.Geocoder = class {};
      },
    }),
  };
  runInNewContext(compiled, context);
  return { load: context.exports.loadGoogleMaps, calls, context };
}
test('concurrent requests share one load and wait for all required libraries', async () => {
  const { load, calls } = setup();
  const [a, b] = await Promise.all([load(), load()]);
  assert.equal(a, b);
  assert.equal(calls.filter(([type]) => type === 'options').length, 1);
  assert.deepEqual(calls.filter(([type]) => type === 'library').map(([, name]) => name).sort(), ['geocoding', 'geometry', 'maps', 'marker']);
  assert.ok(a.maps.Map && a.maps.geometry.spherical && a.maps.Marker && a.maps.Geocoder);
  await load();
  assert.equal(calls.length, 5);
});
test('bootstrap namespace does not skip library loading', async () => {
  const { load, calls } = setup({ partial: true });
  await load();
  assert.equal(calls.filter(([type]) => type === 'library').length, 4);
});
test('failed request can retry without configuring the loader twice', async () => {
  const { load, calls } = setup({ failOnce: true });
  await assert.rejects(load(), /offline/);
  const result = await load();
  assert.ok(result.maps.Map);
  assert.equal(calls.filter(([type]) => type === 'options').length, 1);
  assert.equal(calls.filter(([type]) => type === 'library').length, 8);
});
