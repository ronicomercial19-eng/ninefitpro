import { test } from "node:test";
import assert from "node:assert/strict";
import { functionErrorMessage } from "../functionError.ts";
import { confirmedPostureResult } from "../../../supabase/functions/_shared/postureResult.ts";
import { connectorSecret } from "../../../supabase/functions/_shared/connectorSecret.ts";

test("access guard string errors and structured AI errors remain actionable", () => {
  assert.equal(functionErrorMessage({ error: "Entre na sua conta" }, "Fallback"), "Entre na sua conta");
  assert.equal(functionErrorMessage({ error: { message: "Aluno fora do vínculo" } }, "Fallback"), "Aluno fora do vínculo");
  assert.equal(functionErrorMessage({ error: {} }, "Fallback"), "Fallback");
});

test("posture scans cannot report completion for an HTTP 200 error or incomplete report", () => {
  for (const value of [{}, [], { ok: true }, { status: "success", error: "failed" }, { status: "error" }, { status: "success", macro_diagnosis: "Normal", segments: {}, recovery_protocol: {} }])
    assert.equal(confirmedPostureResult(value), false);
  assert.equal(confirmedPostureResult({ status: "success", macro_diagnosis: "Observações posturais", segments: { cervical: { finding: "Observação" }, shoulders: { finding: "Observação" }, pelvis: { finding: "Observação" } }, recovery_protocol: { phase_1_release: [], phase_2_activation: [], phase_3_integration: [] } }), true);
});

test("Vault configuration resolves through the privileged RPC and fails closed on lookup errors", async () => {
  const calls: unknown[] = [];
  const admin = { rpc: async (...args: unknown[]) => { calls.push(args); return { data: "test-only-credential", error: null }; } };
  assert.equal(await connectorSecret(admin, "smart_treino", "vault:test"), "test-only-credential");
  assert.deepEqual(calls, [["fn_connector_vault_secret", { p_key: "smart_treino" }]]);
  await assert.rejects(() => connectorSecret({ rpc: async () => ({ error: true }) }, "smart_treino", "vault:test"), /unavailable/);
  assert.equal(await connectorSecret(admin, "smart_treino", null), null);
});
