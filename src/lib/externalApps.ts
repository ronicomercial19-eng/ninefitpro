import { EMBEDDED_APPS } from '../data/ecosystemApps';

const approvedHosts = new Set([
  ...Object.values(EMBEDDED_APPS).filter(app => app.url).map(app => new URL(app.url).hostname),
  'ninefoodss.lovable.app', '9foods.lovable.app', '9recovery.lovable.app',
  'ninefit-community-flow.lovable.app', 'fit-community.9fit.com',
]);

export function safeExternalAppUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password || !approvedHosts.has(url.hostname) || (url.port && url.port !== '443')) return null;
    // Never carry credentials from the host app into another origin.
    for (const key of [...url.searchParams.keys()]) if (/token|authorization|password|secret/i.test(key)) url.searchParams.delete(key);
    url.hash = '';
    return url.toString();
  } catch { return null; }
}
