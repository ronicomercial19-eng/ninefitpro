const routes: Record<string,string> = { train:"/9fit/train", smarttreino:"/9fit/train", smart_treino:"/9fit/train", hub:"/9fit/hub", staff:"/9fit/native-system?app=staff", protocols:"/9fit/protocols", protocolos:"/9fit/protocols", foods:"/9fit/dieta", nutri:"/9fit/dieta", primepass:"/9fit/primepass", prime_pass:"/9fit/primepass", healthflix:"/9fit/healthflix", planejamento:"/9fit/planejamento", smart_periodizer:"/9fit/planejamento", ajuste_treino:"/9fit/ajuste-treino", biblioteca:"/9fit/biblioteca", ron:"/9fit/ron", progress:"/9fit/progresso", progresso:"/9fit/progresso", move:"/9fit/move", store:"/9fit/native-system?app=store", postura_pro:"/9fit/postura-pro", habitflow:"/9fit/habitflow", zap:"/9fit/mensagens", '9zap':"/9fit/mensagens", events:"/9fit/events", nexus:"/9fit/embed?title=Nexus&url=%2Fapp%2Fnexus" };
export function moduleRoute(module: {key: string; cta_route?: string | null}) {
  if (routes[module.key.toLowerCase()]) return routes[module.key.toLowerCase()];
  const route = module.cta_route;
  return route?.startsWith("/9fit/") && !route.includes("\\") ? route : null;
}
