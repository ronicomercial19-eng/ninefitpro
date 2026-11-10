import test from "node:test";
import assert from "node:assert/strict";
import { moduleRoute } from "../moduleRoute";
import { safeExternalAppUrl } from "../externalApps";
import { EVENTS_URL, ACADEMY_URL, COMMUNITY_URL } from "../moduleUrls";

test("Eventos e Academy usam rotas do aluno", () => {
  assert.equal(moduleRoute({ key: "events" }), "/9fit/events");
  assert.equal(moduleRoute({ key: "eventos" }), "/9fit/events");
  for (const key of ["academy", "academia"]) assert.equal(moduleRoute({ key }), "/9fit/academy");
});
test("Destinos oficiais são aceitos sem credenciais", () => {
  for (const url of [EVENTS_URL, ACADEMY_URL, COMMUNITY_URL]) {
    assert.equal(safeExternalAppUrl(url), url + "/");
    assert.equal(safeExternalAppUrl(url + "/?access_token=x#secret"), url + "/");
  }
  assert.equal(safeExternalAppUrl("https://eventosnine.lovable.app.evil.com"), null);
});
