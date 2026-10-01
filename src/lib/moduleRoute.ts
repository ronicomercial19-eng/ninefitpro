const routes: Record<string,string> = { train:"/9fit/train", smarttreino:"/9fit/train", smart_treino:"/9fit/train", hub:"/9fit/hub", staff:"/9fit/native-system?app=staff", protocols:"/9fit/protocols", protocolos:"/9fit/protocols", foods:"/9fit/dieta", nutri:"/9fit/dieta", primepass:"/9fit/primepass", prime_pass:"/9fit/primepass", healthflix:"/9fit/healthflix" };
export function moduleRoute(module: {key: string; cta_route?: string | null}) {
  if (routes[module.key.toLowerCase()]) return routes[module.key.toLowerCase()];
  const route = module.cta_route;
  return route?.startsWith("/9fit/") && !route.includes("\\") ? route : null;
}
