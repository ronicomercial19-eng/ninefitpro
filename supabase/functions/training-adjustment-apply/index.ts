import {
  cors,
  json,
  professionalClient,
  fail,
} from "../_shared/professorRequest.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const db = await professionalClient(req);
    if (req.method !== "POST")
      return json({ error: "method_not_allowed" }, 405);
    const body = await req.json();
    if (!body.expected_revision)
      return json({ success: false, error: "review_preview_required" }, 409);
    const { data, error } = await db.rpc("fn_professor_apply_adjustment", {
      p_recommendation_id: body.recommendation_id,
      p_expected_revision: body.expected_revision,
    });
    if (error) throw new Error(error.message);
    return json(data);
  } catch (error) {
    return fail(error);
  }
});
