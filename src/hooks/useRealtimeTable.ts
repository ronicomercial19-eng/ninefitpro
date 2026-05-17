import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type Event = "INSERT" | "UPDATE" | "DELETE" | "*";

interface Options {
  table: string;
  schema?: string;
  event?: Event;
  filter?: string; // e.g. "athlete_id=eq.<uuid>"
  enabled?: boolean;
}

/**
 * Universal Supabase realtime subscription hook.
 * Calls `onChange` for every postgres_changes event matching the filter.
 *
 * Usage:
 *   useRealtimeTable({ table: "student_training_assignments", filter: `athlete_id=eq.${id}` }, refetch);
 */
export function useRealtimeTable(
  { table, schema = "public", event = "*", filter, enabled = true }: Options,
  onChange: (payload: RealtimePostgresChangesPayload<any>) => void,
) {
  const cbRef = useRef(onChange);
  cbRef.current = onChange;

  useEffect(() => {
    if (!enabled) return;
    const channelName = `rt:${schema}:${table}:${filter ?? "all"}:${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes" as any,
        { event, schema, table, ...(filter ? { filter } : {}) },
        (payload) => cbRef.current(payload as any),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, schema, event, filter, enabled]);
}
