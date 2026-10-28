/** Keep active conversations responsive; idle inboxes do not poll every 4s. */
export function chatPollInterval(messages: {created_at:string}[] | undefined, now=Date.now()) {
 const newest = messages?.reduce((latest, message) => Math.max(latest, Date.parse(message.created_at)||0),0) || 0;
 const age = now-newest;
 if(newest && age>=0 && age<60_000) return 5_000;
 if(newest && age>=0 && age<300_000) return 15_000;
 return 60_000;
}
