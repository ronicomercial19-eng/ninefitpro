import test from "node:test";
import assert from "node:assert/strict";
import { mergeHealthCatalog } from "../healthFlixCatalog";
test("teacher publication remains visible when external catalog is online", () => {
  const result = mergeHealthCatalog(
    [{ id: "remote", title: "Externo" }],
    [
      {
        id: "local",
        external_id: "manual",
        name: "Professor",
        player_url: "https://example.com/a",
        payload: { fitpro_override: true },
      },
    ],
  );
  assert.deepEqual(
    result.map((v) => v.title),
    ["Externo", "Professor"],
  );
});
test("hiding an external item removes it even when legacy rows use another video type", () => {
  const result = mergeHealthCatalog(
    [{ id: "a", title: "Externo" }],
    [
      {
        id: "hidden",
        external_id: "a",
        name: "Oculto",
        payload: { fitpro_override: true, fitpro_hidden: true },
      },
      { id: "legacy", external_id: "a", name: "Antigo", payload: {} },
    ],
  );
  assert.equal(result.length, 0);
});
test("local correction replaces the external version without duplicating content", () => {
  const result = mergeHealthCatalog(
    [{ id: "a", title: "Antigo" }],
    [
      {
        id: "local",
        external_id: "a",
        name: "Revisado",
        payload: { fitpro_override: true },
      },
    ],
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].title, "Revisado");
  assert.equal(result[0].external_id, "a");
});
test("catalog reconciliation preserves the original input records", () => {
  const remote = [{ id: "a", title: "Externo" }],
    local = [{ id: "local", external_id: "b", name: "Local", payload: {} }];
  mergeHealthCatalog(remote, local);
  assert.deepEqual(remote, [{ id: "a", title: "Externo" }]);
  assert.equal(local[0].name, "Local");
});

test("partial local publication preserves remote playback and independent local rows", () => {
  const result = mergeHealthCatalog(
    [{ id: "remote", title: "Aula", video_url: "https://example.com/video", thumbnail: "https://example.com/cover" }],
    [
      { id: "local", external_id: "remote", name: "Aula editada", player_url: null, thumbnail_url: null },
      { id: "legacy-a", name: "Primeira publicação" },
      { id: "legacy-b", name: "Segunda publicação" },
    ],
  );
  assert.equal(result.length, 3);
  assert.equal(result[0].video_url, "https://example.com/video");
  assert.equal(result[0].thumbnail, "https://example.com/cover");
});
