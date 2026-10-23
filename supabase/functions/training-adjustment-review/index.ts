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
    if (req.method === "GET") {
      const { data, error } = await db.rpc(
        "fn_professor_adjustment_analytics",
        { p_athlete_id: new URL(req.url).searchParams.get("athlete_id") },
      );
      if (error) throw new Error(error.message);
      return json(data);
    }
    const body = await req.json();
    const { data, error } = await db.rpc("fn_professor_review_adjustment", {
      p_recommendation_id: body.recommendation_id,
      p_action: body.action,
    });
    if (error) throw new Error(error.message);
    return json(data);
  } catch (error) {
    return fail(error);
  }
});
