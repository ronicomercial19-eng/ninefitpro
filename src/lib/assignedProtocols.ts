export interface AssignedTraining {
  id: string; student_id: string; training_name: string;
  training_description?: string | null; training_type?: string | null;
  content_type?: string | null; is_active: boolean; start_date?: string | null;
  end_date?: string | null; html_file_url?: string | null;
  periodization_file_url?: string | null; periodization_html?: string | null;
  training_data?: { [key: string]: any } | null;
}
export function localDate(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth()+1).padStart(2,'0'), String(date.getDate()).padStart(2,'0')].join('-');
}
export function isAvailableTraining(row: AssignedTraining, today = localDate()) {
  return row.is_active && (!row.start_date || row.start_date <= today) && (!row.end_date || row.end_date >= today);
}
export function safeContentUrl(value?: string | null) {
  if (!value) return null;
  try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : null; } catch { return null; }
}
export function trainingMedia(row: AssignedTraining) {
  const url = safeContentUrl(row.periodization_file_url || row.html_file_url);
  const html = row.periodization_html || null;
  const kind = html || row.content_type === 'html' || row.training_type === 'html' || (url && /\.html?(?:[?#]|$)/i.test(url)) ? 'html'
    : row.content_type === 'pdf' || (url && /\.pdf(?:[?#]|$)/i.test(url)) ? 'pdf'
    : url ? 'link' : 'model';
  return { url, html, kind };
}
