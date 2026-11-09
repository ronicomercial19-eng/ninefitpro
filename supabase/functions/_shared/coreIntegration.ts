import { coreConfig, makeCoreClient, CoreError, phoneBR, uuid } from "./coreClient.ts";
type Deps = { db: any; env: (key: string) => string | undefined; fetcher?: typeof fetch; currentUser: (authorization: string) => Promise<string | null> };
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization,content-type,apikey,x-client-info,x-core-worker-token", "access-control-allow-methods": "GET,POST,OPTIONS" };
const reply = (status: number, value: unknown) => new Response(JSON.stringify(value), { status, headers: { ...cors, "content-type": "application/json" } });
const equal = (a: string, b: string) => { if (a.length !== b.length) return false; let v = 0; for (let i = 0; i < a.length; i++) v |= a.charCodeAt(i) ^ b.charCodeAt(i); return v === 0; };
export function createCoreIntegration({ db, env, fetcher = fetch, currentUser }: Deps) {
  const rpc = async (name: string, args: unknown = {}) => { const r = await db.rpc(name, args); if (r.error) throw new CoreError(503, "storage_unavailable"); return r.data; };
  async function athlete(id: string) {
    const r = await db.from("athletes").select("id,user_id,name,phone,coach_id").eq("id", id).single();
    if (r.error || !r.data) throw new CoreError(422, "athlete_missing");
    if (!r.data.user_id || !phoneBR(r.data.phone)) throw new CoreError(422, "student_identity_or_phone_required");
    return { ...r.data, phone: phoneBR(r.data.phone) };
  }
  async function ensureThread(core: ReturnType<typeof makeCoreClient>, a: any) {
    // Keep the existing key if present. Do not fork historical conversations.
    const saved = await db.from("core_chat_threads").select("thread_id").eq("user_id", a.user_id).maybeSingle();
    if (saved.error) throw new CoreError(503, "storage_unavailable");
    let externalKey = "fitpro:user:" + a.user_id;
    const legacy = await core("zap-api", "/api/public/zap/threads?external_key=" + encodeURIComponent("fitpro:" + a.user_id));
    if (legacy.threads?.length) externalKey = "fitpro:" + a.user_id;
    const r = await core("zap-api", "/api/public/zap/threads", "POST", {
      external_key: externalKey, subject: "Atendimento FitPro",
      context: { user_id: a.user_id, athlete_id: a.id, name: a.name || "Aluno", phone: a.phone },
    });
    if (!uuid(r.thread?.id)) throw new CoreError(502, "invalid_core_thread");
    const write = await db.from("core_chat_threads").upsert({ user_id: a.user_id, athlete_id: a.id,
      thread_id: r.thread.id, phone: a.phone, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (write.error) throw new CoreError(503, "storage_unavailable");
    return { id: r.thread.id, reused: r.reused === true };
  }
  async function ingest(core: ReturnType<typeof makeCoreClient>) {
    const saved = await db.from("core_integration_state").select("after_at,after_id").eq("id", true).single();
    if (saved.error) throw new CoreError(503, "storage_unavailable");
    const query = "?after=" + encodeURIComponent(saved.data.after_at) + "&limit=100" + (saved.data.after_id ? "&after_id=" + encodeURIComponent(saved.data.after_id) : "");
    const page = await core("core-events", "/api/public/events/outbox" + query);
    if (!Array.isArray(page.events) || page.events.length > 200 || !Number.isFinite(Date.parse(page.next_after))) throw new CoreError(502, "invalid_outbox_page");
    // The cursor and all inbox rows are committed in one database transaction.
    return await rpc("fn_core_ingest_page", { p_events: page.events, p_after: page.next_after, p_after_id: page.next_after_id || null });
  }
  async function drain(core: ReturnType<typeof makeCoreClient>, supported: Set<string>, pilotJob?: any) {
    const jobs = pilotJob ? [pilotJob] : await rpc("fn_core_claim_events", { p_limit: 10 });
    const stats = { delivered: 0, retry: 0, blocked: 0 };
    for (const job of jobs ?? []) {
      try {
        if (!supported.has(job.event_type)) throw new CoreError(422, "event_without_consumer");
        const a = await athlete(job.athlete_id);
        await ensureThread(core, a);
        await core("core-events", "/api/public/events", "POST", { type: job.event_type,
          payload: { ...job.payload, phone: a.phone, name: a.name, user_id: a.user_id, fitpro_user_id: a.user_id,
            athlete_id: a.id, audience: "fitpro_student" }, idempotency_key: job.idempotency_key });
        const done = await db.from("core_event_queue").update({ state: "delivered", locked_until: null, http_status: 200, error_code: null }).eq("id", job.id);
        if (done.error) throw new CoreError(503, "storage_unavailable");
        stats.delivered++;
      } catch (error) {
        const status = error instanceof CoreError ? error.status : 502;
        const code = error instanceof CoreError ? error.code : "core_unavailable";
        const blocked = status === 422 || job.attempts >= 12;
        const updated = await db.from("core_event_queue").update({ state: blocked ? "blocked" : "retry", locked_until: null,
          available_at: new Date(Date.now() + Math.min(3600, 30 * 2 ** Math.min(job.attempts, 7)) * 1000).toISOString(),
          http_status: status, error_code: code }).eq("id", job.id);
        if (updated.error) throw new CoreError(503, "storage_unavailable");
        stats[blocked ? "blocked" : "retry"]++;
      }
    }
    return stats;
  }
  async function apply() {
    const query = await db.from("core_action_inbox").select("event_id").in("state", ["pending", "needs_input", "unmatched"])
      .lte("next_attempt_at", new Date().toISOString()).order("created_at").limit(20);
    if (query.error) throw new CoreError(503, "storage_unavailable");
    let applied = 0, pending = 0;
    for (const e of query.data ?? []) {
      const result = await rpc("fn_core_apply_action", { p_event: e.event_id });
      if (result.state === "applied") applied++; else pending++;
    }
    return { applied, pending };
  }
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (!["GET", "POST"].includes(req.method)) return reply(405, { error: "method_not_allowed" });
    let owner: string | null = null;
    try {
      let internal = false;
      const supplied = req.headers.get("x-core-worker-token") || "";
      if (supplied.length === 64) { const expected = await rpc("fn_core_worker_key"); internal = typeof expected === "string" && equal(expected, supplied); }
      let admin = false;
      if (!internal) {
        const user = await currentUser(req.headers.get("authorization") || "");
        if (!user) return reply(401, { error: "unauthorized" });
        const role = await db.rpc("has_role", { _user_id: user, _role: "admin" });
        if (role.error) throw new CoreError(503, "authorization_unavailable");
        admin = role.data === true;
        if (!admin) return reply(403, { error: "admin_required" });
      }
      const action = new URL(req.url).searchParams.get("action") || "run";
      if (!["health", "run", "backfill", "pilot"].includes(action)) return reply(400, { error: "unknown_action" });
      if (action !== "health" && req.method !== "POST") return reply(405, { error: "method_not_allowed" });
      const core = makeCoreClient(coreConfig(env), fetcher);
      // Every operation first proves the shared secret against a read-only signed call.
      const types = await core("core-events", "/api/public/events/types");
      if (!Array.isArray(types.types)) throw new CoreError(502, "invalid_core_response");
      if (action === "health") return reply(200, { status: 200, event_count: types.types.length });
      const text = await req.text();
      if (new TextEncoder().encode(text).length > 8192) return reply(413, { error: "body_too_large" });
      let body: any; try { body = text ? JSON.parse(text) : {}; } catch { return reply(400, { error: "invalid_json" }); }
      if (action === "pilot") {
        if (!uuid(body.athlete_id) || !uuid(body.run_id)) return reply(422, { error: "pilot_identity_required" });
        const a = await athlete(body.athlete_id);
        const thread = await ensureThread(core, a);
        if (body.step === "thread") return reply(200, { ok: true, thread_id: thread.id, reused: thread.reused });
        if (body.step === "read") {
          const r = await core("zap-api", "/api/public/zap/threads/" + thread.id + "/messages?limit=100");
          const messages = Array.isArray(r.messages) ? r.messages : [];
          return reply(200, { ok: true, thread_id: thread.id, message_count: messages.length,
            has_menu: messages.some((m: any) => m.sender_type === "agent" && /Agendar aula/.test(m.body)),
            has_goal_prompt: messages.some((m: any) => m.sender_type === "agent" && /objetivo principal/.test(m.body)) });
        }
        if (body.step === "menu" || body.step === "reply") {
          const message = body.step === "menu" ? "menu" : String(body.reply ?? "");
          if (body.step === "reply" && !/^(1|2|3|voltar)$/.test(message)) return reply(422, { error: "invalid_pilot_reply" });
          const result = await core("zap-api", "/api/public/zap/threads/" + thread.id + "/messages", "POST",
            { sender_type: "user", body: message, external_id: "pilot:" + body.run_id + ":" + body.step });
          return reply(200, { ok: true, thread_id: thread.id, message_id: result.message?.id ?? null });
        }
        if (body.step === "signup") {
          const id = await rpc("fn_core_enqueue", { p_type: "fitpro.signup", p_athlete: a.id, p_payload: {},
            p_key: "pilot-signup:" + body.run_id });
          const queued = await db.from("core_event_queue").select("*").eq("id", id).single();
          if (queued.error) throw new CoreError(503, "storage_unavailable");
          const outgoing = queued.data.state === "delivered" ? { delivered: 1, retry: 0, blocked: 0 } :
            await drain(core, new Set(types.types.map((t: any) => t.type)), { ...queued.data, attempts: queued.data.attempts + 1 });
          return reply(200, { ok: outgoing.delivered === 1, outgoing, thread_id: thread.id });
        } else return reply(400, { error: "unknown_pilot_step" });
      }
      if (action === "backfill") {
        if (body.after && !uuid(body.after)) return reply(422, { error: "invalid_cursor" });
        let query = db.from("athletes").select("id,user_id,name,phone").not("user_id", "is", null).not("phone", "is", null).order("id").limit(25);
        if (body.after) query = query.gt("id", body.after);
        const rows = await query;
        if (rows.error) throw new CoreError(503, "storage_unavailable");
        let created = 0, skipped = 0;
        for (const a of rows.data ?? []) {
          const phone = phoneBR(a.phone); if (!phone) { skipped++; continue; }
          await ensureThread(core, { ...a, phone }); created++;
        }
        return reply(200, { ok: true, processed: created, skipped, next_cursor: rows.data?.length === 25 ? rows.data[24].id : null });
      }
      owner = crypto.randomUUID();
      if (!await rpc("fn_core_worker_lock", { p_owner: owner })) { owner = null; return reply(200, { ok: true, busy: true }); }
      const outgoing = await drain(core, new Set(types.types.map((t: any) => t.type)));
      const received = await ingest(core);
      const actions = await apply();
      await db.from("core_integration_state").update({ last_status: 200, last_error: null }).eq("id", true);
      return reply(200, { ok: true, outgoing, received, actions });
    } catch (error) {
      const status = error instanceof CoreError ? error.status : 502;
      const code = error instanceof CoreError ? error.code : "integration_unavailable";
      // Operational metadata only: never log secret, phone, payload or signed material.
      await db.from("core_integration_state").update({ last_status: status, last_error: code }).eq("id", true);
      return reply(status === 401 || status === 403 ? 503 : status, { status, error: code });
    } finally {
      if (owner) await rpc("fn_core_worker_unlock", { p_owner: owner }).catch(() => {});
    }
  };
}

