// Progresso único salvo no Cloudflare KV (binding FC).
// O servidor JUNTA (merge) o que chega com o que já existe: nada é apagado por outro aparelho desatualizado.
const H={'content-type':'application/json','cache-control':'no-store'};
const day=()=>new Date(Date.now()-3*3600e3).toISOString().slice(0,10);
function merge(a,b){
  a=a||{};b=b||{};
  const docs=new Map();for(const d of [...(a.docs||[]),...(b.docs||[])]){if(!d||!d.id)continue;const c=docs.get(d.id);if(!c||(d.u||0)>=(c.u||0))docs.set(d.id,d)}
  const hs=new Map();for(const h of [...(a.hist||[]),...(b.hist||[])]){if(h&&h.id)hs.set(h.id+'|'+h.ts,h)}
  const hist=[...hs.values()].sort((x,y)=>x.ts-y.ts);
  const ui=((b.ui&&b.ui.u)||0)>=((a.ui&&a.ui.u)||0)?b.ui:a.ui;
  return {v:1,docs:[...docs.values()],hist,ui,at:Date.now()};
}
async function save(request,env){
  if(!env.FC)return new Response('{"error":"KV FC não configurado"}',{status:500,headers:H});
  let inc;try{inc=JSON.parse(await request.text())}catch(e){return new Response('{"error":"json"}',{status:400,headers:H})}
  const cur=JSON.parse((await env.FC.get('state'))||'{}');
  const m=merge(cur,inc);const s=JSON.stringify(m);
  await env.FC.put('state',s);
  const k='backup-'+day();if(!(await env.FC.get(k,{type:'stream'})))await env.FC.put(k,s,{expirationTtl:60*60*24*60});
  return new Response(JSON.stringify({ok:true,docs:m.docs.length,hist:m.hist.length,at:m.at}),{headers:H});
}
export async function onRequestGet({env}){
  if(!env.FC)return new Response('{"error":"KV FC não configurado"}',{status:500,headers:H});
  return new Response((await env.FC.get('state'))||'{}',{headers:H});
}
export const onRequestPut=({request,env})=>save(request,env);
export const onRequestPost=({request,env})=>save(request,env);
