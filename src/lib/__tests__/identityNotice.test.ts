import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ATHLETE_MISSING, IDENTITY_COPY, identityNotice } from "../../components/9fit/identityNotice";

describe("aviso de ficha no Hub e no Perfil", () => {
  it("não afirma ausência enquanto a identidade ainda carrega", () => {
    assert.equal(identityNotice(true, null, null), "loading");
    assert.equal(identityNotice(true, null, "Não foi possível carregar seu perfil. Tente novamente."), "loading");
  });

  it("com atleta, não mostra aviso de ficha", () => {
    assert.equal(identityNotice(false, "athlete-1", null), "ready");
  });

  it("só diz que o professor ainda não vinculou quando a consulta confirma que não há ficha", () => {
    assert.equal(identityNotice(false, null, ATHLETE_MISSING), "unlinked");
    assert.equal(identityNotice(false, null, null), "unlinked");
    assert.match(IDENTITY_COPY.unlinked, /professor vincular/);
  });

  it("falha de leitura não vira 'sem ficha'", () => {
    assert.equal(identityNotice(false, null, "Não foi possível carregar seu perfil. Tente novamente."), "unread");
    assert.doesNotMatch(IDENTITY_COPY.unread, /professor/);
    assert.match(IDENTITY_COPY.unread, /não significa que ela não existe/);
  });
});
