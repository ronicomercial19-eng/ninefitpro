export interface CalendarEventInput {
  summary: string;
  description?: string;
  startDateTime: string; // ISO 8601
  endDateTime: string;   // ISO 8601
  location?: string;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink?: string;
  location?: string;
}

/** Stable event IDs make retries update the same confirmed commitment. */
export async function syncConfirmedCommitment(accessToken:string, id:string, event:CalendarEventInput):Promise<GoogleCalendarEvent>{
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))throw new Error('Compromisso inválido');
  const eventId=`9fit${id.replace(/-/g,'').toLowerCase()}`;
  const base='https://www.googleapis.com/calendar/v3/calendars/primary/events';
  const headers={Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json'};
  const body={summary:event.summary,description:event.description||'Compromisso confirmado no FitPro',start:{dateTime:event.startDateTime},end:{dateTime:event.endDateTime},...(event.location?{location:event.location}:{})};
  const existing=await fetch(`${base}/${eventId}`,{headers});
  if(existing.status!==404&&!existing.ok)throw new Error(existing.status===401?'Reconecte sua Google Agenda.':'Não foi possível consultar a Google Agenda.');
  let response=await fetch(existing.ok?`${base}/${eventId}`:base,{method:existing.ok?'PATCH':'POST',headers,body:JSON.stringify(existing.ok?body:{...body,id:eventId})});
  if(response.status===409)response=await fetch(`${base}/${eventId}`,{method:'PATCH',headers,body:JSON.stringify(body)});
  if(!response.ok)throw new Error(response.status===401?'Reconecte sua Google Agenda.':'Falha na sincronização. Sua reserva no FitPro continua válida.');
  return response.json();
}
export async function removeCalendarCommitment(accessToken:string,eventId:string):Promise<void>{
  if(!/^9fit[0-9a-f]{32}$/.test(eventId))throw new Error('Evento de calendário inválido');
  const response=await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,{method:'DELETE',headers:{Authorization:`Bearer ${accessToken}`}});
  if(!response.ok&&response.status!==404&&response.status!==410)throw new Error('Reserva cancelada no FitPro; atualize o cancelamento no Google Agenda.');
}

/**
 * Fetch upcoming events from Google Calendar
 */
export async function listUpcomingEvents(
  accessToken: string,
  maxResults = 8
): Promise<GoogleCalendarEvent[]> {
  const now = new Date().toISOString();
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
    now
  )}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Calendar API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return data.items || [];
}

/**
 * Creates a workout or training event in Google Calendar
 */
export async function createCalendarWorkoutEvent(
  accessToken: string,
  event: CalendarEventInput
): Promise<GoogleCalendarEvent> {
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events`;

  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';

  const body = {
    summary: event.summary,
    description:
      event.description ||
      'Sessão de treino sincronizada com o RON AI - 9FIT PRO.',
    start: {
      dateTime: event.startDateTime,
      timeZone: userTimeZone,
    },
    end: {
      dateTime: event.endDateTime,
      timeZone: userTimeZone,
    },
    location: event.location || 'Academia 9FIT PRO',
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 30 },
        { method: 'popup', minutes: 15 },
      ],
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Erro ao agendar no Google Calendar: ${errorText}`);
  }

  return await res.json();
}

/**
 * Batch schedules weekly workouts into Google Calendar
 */
export async function syncWeeklyWorkouts(
  accessToken: string,
  days: { title: string; dayOffset: number; hour: number; durationMinutes: number }[]
): Promise<GoogleCalendarEvent[]> {
  const created: GoogleCalendarEvent[] = [];

  for (const item of days) {
    const start = new Date();
    start.setDate(start.getDate() + item.dayOffset);
    start.setHours(item.hour, 0, 0, 0);

    const end = new Date(start.getTime() + item.durationMinutes * 60 * 1000);

    const event = await createCalendarWorkoutEvent(accessToken, {
      summary: `9FIT // ${item.title}`,
      description: `Treino da semana prescrito e otimizado pelo RON Neural Coach.\nDuração: ${item.durationMinutes}min.`,
      startDateTime: start.toISOString(),
      endDateTime: end.toISOString(),
    });

    created.push(event);
  }

  return created;
}
