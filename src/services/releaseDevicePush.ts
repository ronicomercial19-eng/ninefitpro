import {withTimeout} from '@/lib/withTimeout';
/** Browser endpoint becomes invalid on logout; the sender removes HTTP 410 rows. */
export async function releaseDevicePush() {
 if(typeof navigator==='undefined' || !('serviceWorker' in navigator))return;
 try {
  const registration=await withTimeout(navigator.serviceWorker.getRegistration(),1500);
  const subscription=await withTimeout(Promise.resolve(registration?.pushManager?.getSubscription()),1500);
  if(subscription)await withTimeout(subscription.unsubscribe(),1500);
 }catch { /* Logout must still invalidate the account if the browser is offline. */ }
}
