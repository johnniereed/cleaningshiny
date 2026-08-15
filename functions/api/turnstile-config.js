export function onRequestGet({env}){
  if(!env.TURNSTILE_SITE_KEY){
    return new Response(JSON.stringify({error:'Turnstile is not configured.'}),{status:503,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
  }
  return new Response(JSON.stringify({siteKey:env.TURNSTILE_SITE_KEY}),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
}
