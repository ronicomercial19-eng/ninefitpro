// Imported by the generated Workbox worker; never replace that worker at runtime.
const notificationTarget = value => {
 try { const target = new URL(value || '/9fit/notificacoes',self.location.origin); return target.origin === self.location.origin && target.pathname.startsWith('/9fit/') ? target.href : new URL('/9fit/notificacoes',self.location.origin).href; }
 catch { return new URL('/9fit/notificacoes',self.location.origin).href; }
};
self.addEventListener('push',event=>{
 let data={};try{data=event.data?.json()||{}}catch{}
 event.waitUntil(self.registration.showNotification(typeof data.title==='string'?data.title.slice(0,150):'9FIT',{
  body:typeof data.body==='string'?data.body.slice(0,1000):'Você tem uma nova notificação.',
  icon:'/icons/icon-192.png',badge:'/icons/icon-192.png',data:{url:notificationTarget(data.url)}
 }));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();const target=notificationTarget(event.notification.data?.url);
 event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(async windows=>{
  const current=windows.find(w=>w.url===target);if(current)return current.focus();
  return clients.openWindow(target);
 }));
});
