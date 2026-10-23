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
    const { data, error } = await db.rpc("fn_professor_adjustment_analytics", {
      p_athlete_id: new URL(req.url).searchParams.get("athlete_id"),
    });
    if (error) throw new Error(error.message);
    return json(data);
  } catch (error) {
    return fail(error);
  }
});
