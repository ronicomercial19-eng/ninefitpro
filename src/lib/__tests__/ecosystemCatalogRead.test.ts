import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  cardStatusCopy,
  catalogAfterRead,
  configuredCountLabel,
  hologramStatusCopy,
  type ConfirmedCatalog,
} from "../../components/9fit/ecosystemCatalogRead";

const readyStatus = { smarttreino: "native" as const, store: "configured" as const };
const readyIframe = { store: "https://loja.example" };

describe("leitura do catálogo do ecossistema", () => {
  it("não trata a primeira falha como módulo desligado ou sem conteúdo", () => {
    const read = catalogAfterRead(
      null,
      "all",
      true,
      [{ key: "smarttreino" }, { key: "store" }],
      readyStatus,
      readyIframe,
    );
    assert.equal(read.unread, true);
    assert.equal(read.stale, false);
    assert.equal(read.confirmed, null);
    assert.deepEqual(read.items, [{ key: "smarttreino" }, { key: "store" }]);
    assert.deepEqual(read.statusByKey, {});
    assert.equal(hologramStatusCopy("smarttreino", undefined, true), "Leitura do módulo não confirmada");
    assert.equal(cardStatusCopy("store", undefined, true), "Leitura do módulo não confirmada");
    assert.equal(configuredCountLabel(0, 2, true), "CATÁLOGO AINDA NÃO CONFIRMADO");
  });

  it("confirma nativo, externo e ausência só depois da leitura", () => {
    const read = catalogAfterRead(null, "all", false, [{ key: "ron" }], { ron: "not_configured" }, {});
    assert.equal(read.unread, false);
    assert.equal(read.statusByKey.ron, "not_configured");
    assert.equal(hologramStatusCopy("ron", "not_configured", false), "Integração não confirmada");
    assert.equal(hologramStatusCopy("staff", "native", false), "Abre o serviço parceiro");
    assert.equal(cardStatusCopy("smarttreino", "native", false), "Tela no app");
    assert.equal(cardStatusCopy("foods", "native", false), "Serviço externo");
    assert.equal(configuredCountLabel(1, 3, false), "1 DE 3 DESTINOS CONFIGURADOS");
  });

  it("mantém o catálogo já confirmado quando o refresh falha", () => {
    const confirmed = catalogAfterRead(
      null,
      "all",
      false,
      [{ key: "smarttreino" }],
      readyStatus,
      readyIframe,
    ).confirmed as ConfirmedCatalog<{ key: string }>;
    const stale = catalogAfterRead(confirmed, "all", true, [], { smarttreino: "not_configured" }, {});
    assert.equal(stale.stale, true);
    assert.equal(stale.unread, false);
    assert.deepEqual(stale.items, [{ key: "smarttreino" }]);
    assert.equal(stale.statusByKey.smarttreino, "native");
    assert.equal(stale.iframeByKey.store, "https://loja.example");
    assert.equal(stale.confirmed, confirmed);
    assert.equal(hologramStatusCopy("smarttreino", stale.statusByKey.smarttreino, false), "Disponível no app");
  });

  it("não reaproveita o catálogo de outra categoria", () => {
    const confirmed = catalogAfterRead(
      null,
      "all",
      false,
      [{ key: "smarttreino" }],
      readyStatus,
      readyIframe,
    ).confirmed;
    const other = catalogAfterRead(confirmed, "NUTRIÇÃO", true, [{ key: "foods" }], {}, {});
    assert.equal(other.unread, true);
    assert.equal(other.stale, false);
    assert.equal(other.confirmed, null);
    assert.deepEqual(other.statusByKey, {});
  });
});
