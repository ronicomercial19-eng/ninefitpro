import { describe, it, expect } from "vitest";
import { moduleRoute } from "../moduleRoute";
import { safeExternalAppUrl } from "../externalApps";
import { EVENTS_URL, ACADEMY_URL, COMMUNITY_URL } from "../moduleUrls";

describe("destinos de módulos", () => {
  it("events vai à página de saída de Eventos, não à Comunidade", () => expect(moduleRoute({ key: "events" })).toBe("/9fit/events"));
  it("academia/academy não levam aluno ao painel do professor", () => {
    expect(moduleRoute({ key: "academy" })).toBe("/9fit/academy");
    expect(moduleRoute({ key: "academia" })).toBe("/9fit/academy");
  });
  it("destinos oficiais são aceitos", () => {
    expect(safeExternalAppUrl(EVENTS_URL)).toBe("https://eventosnine.lovable.app/");
    expect(safeExternalAppUrl(ACADEMY_URL)).toBe("https://ninetyfit-academy-forge.lovable.app/");
    expect(safeExternalAppUrl(COMMUNITY_URL)).toBe("https://ninecomunidade.lovable.app/");
  });
  it("tokens são removidos e hosts parecidos recusados", () => {
    expect(safeExternalAppUrl(EVENTS_URL + "/?access_token=x")).toBe("https://eventosnine.lovable.app/");
    expect(safeExternalAppUrl("https://eventosnine.lovable.app.evil.com")).toBeNull();
  });
});
