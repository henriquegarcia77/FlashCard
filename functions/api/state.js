// Salva e devolve todo o progresso (um único usuário) no Cloudflare KV (binding: FC)
const H={'content-type':'application/json','cache-control':'no-store'};
export async function onRequestGet({env}){
  if(!env.FC)return new Response('{"error":"KV FC não configurado"}',{status:500,headers:H});
  return new Response((await env.FC.get('state'))||'{}',{headers:H});
}
export async function onRequestPut({request,env}){
  if(!env.FC)return new Response('{"error":"KV FC não configurado"}',{status:500,headers:H});
  const t=await request.text();
  try{JSON.parse(t)}catch(e){return new Response('{"error":"json"}',{status:400,headers:H})}
  await env.FC.put('state',t);
  return new Response('{"ok":true}',{headers:H});
}
