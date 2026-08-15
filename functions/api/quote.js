const attempts = new Map();
const SERVICES = new Set([
  'Spring Cleaning','Move-In / Move-Out Cleaning','Post-Construction Cleaning','Routine Janitorial Cleaning',
  'Medical Clinics','Eye Care Offices','Pharmacies','Dental Offices','Chiropractic Clinics','Physiotherapy Centres',
  'Grocery Stores','Clothing Boutiques','Hardware Stores','Pet Shops','Electronics Stores','Department Stores',
  'Nail Salons','Hair Salons','Day Spas','Barber Shops','Gyms and Fitness Studios',
  'Restaurants','Cafes and Coffee Shops','Bakeries','Bars and Pubs',
  'Corporate Offices','Banks and Credit Unions','Law Firms','Co-working Spaces',
  'Daycares and Preschools','Schools and Tutoring Centres','Community Centres','Churches and Places of Worship',
  'Movie Theatres','Bowling Alleys','Hotels and Motels'
]);

function json(body,status=200){
  return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
}
function clean(v,max){return String(v||'').trim().slice(0,max);}
function sameOrigin(request){
  const origin=request.headers.get('origin');
  if(!origin)return true;
  try{return new URL(origin).host===new URL(request.url).host;}catch{return false;}
}
function allowBurst(request){
  const now=Date.now(),windowMs=60_000,max=8;
  const ip=request.headers.get('CF-Connecting-IP')||'unknown';
  const current=(attempts.get(ip)||[]).filter(t=>now-t<windowMs);
  if(current.length>=max){attempts.set(ip,current);return false;}
  current.push(now);attempts.set(ip,current);
  if(attempts.size>500){for(const [key,times] of attempts){if(!times.some(t=>now-t<windowMs))attempts.delete(key);}}
  return true;
}
async function verifyTurnstile(request,env,token){
  if(!env.TURNSTILE_SECRET_KEY)return {success:false,reason:'not-configured'};
  const body=new FormData();
  body.append('secret',env.TURNSTILE_SECRET_KEY);
  body.append('response',token);
  const ip=request.headers.get('CF-Connecting-IP');
  if(ip)body.append('remoteip',ip);

  const res=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body});
  if(!res.ok)return {success:false,reason:'verification-unavailable'};

  const result=await res.json();
  if(!result.success)return {success:false,reason:'failed',codes:result['error-codes']||[]};

  // Mirror Cloudflare Turnstile hostname behavior: an authorized hostname also
  // authorizes its subdomains. This covers www.shinyrockjanitorial.com and
  // Cloudflare Pages preview hosts such as <hash>.cleaningshiny.pages.dev.
  const hostname=String(result.hostname||'').toLowerCase().replace(/\.$/,'');
  const hostAllowed = !hostname ||
    hostname==='shinyrockjanitorial.com' || hostname.endsWith('.shinyrockjanitorial.com') ||
    hostname==='cleaningshiny.pages.dev' || hostname.endsWith('.cleaningshiny.pages.dev');
  if(!hostAllowed){
    console.warn('Turnstile hostname rejected',hostname);
    return {success:false,reason:'wrong-host'};
  }
  return {success:true};
}

export async function onRequestPost({request,env}){
  try{
    if(!sameOrigin(request))return json({error:'Request origin was not accepted.'},403);
    const length=Number(request.headers.get('content-length')||0);
    if(length>64_000)return json({error:'Request is too large.'},413);
    if(!allowBurst(request))return json({error:'Too many requests. Please wait a minute and try again.'},429);

    const type=request.headers.get('content-type')||'';
    const data=type.includes('application/json')?await request.json():Object.fromEntries((await request.formData()).entries());
    if(data.website)return json({ok:true});

    const started=Number(data.form_started_at||0),now=Date.now();
    if(!Number.isFinite(started)||started<=0||now-started<1500||now-started>21_600_000){
      return json({error:'Please refresh the page and try the form again.'},400);
    }

    const name=clean(data.name,150),company=clean(data.company,200),email=clean(data.email,320),phone=clean(data.phone,50),service=clean(data.service,120),message=clean(data.message,5000);
    const token=clean(data['cf-turnstile-response'],4096);
    if(!name||!email||!phone||!service)return json({error:'Please complete all required fields.'},400);
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json({error:'Please enter a valid email address.'},400);
    if(!SERVICES.has(service))return json({error:'Please choose a valid service.'},400);
    if(!token)return json({error:'Please complete the security check.'},400);

    const turnstile=await verifyTurnstile(request,env,token);
    if(!turnstile.success){
      console.warn('Turnstile rejected quote request',turnstile.reason);
      return json({error:turnstile.reason==='not-configured'?'Security verification is not configured yet.':'Security verification failed. Please try again.'},403);
    }

    if(!env.RESEND_API_KEY||!env.QUOTE_TO_EMAIL||!env.QUOTE_FROM_EMAIL)return json({error:'Email service is not configured yet.'},503);
    const esc=x=>x.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const body=`<h2>New Shiny Rock quote request</h2><p><b>Name:</b> ${esc(name)}</p><p><b>Company:</b> ${esc(company||'—')}</p><p><b>Email:</b> ${esc(email)}</p><p><b>Phone:</b> ${esc(phone)}</p><p><b>Service:</b> ${esc(service)}</p><p><b>Message:</b><br>${esc(message||'—').replace(/\n/g,'<br>')}</p>`;
    const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:env.QUOTE_FROM_EMAIL,to:[env.QUOTE_TO_EMAIL],reply_to:email,subject:`Quote request: ${service} — ${name}`,html:body})});
    if(!r.ok){console.error('Resend error',r.status,await r.text());return json({error:'We could not send your request right now. Please call or email us.'},502);}
    return json({ok:true});
  }catch(e){console.error(e);return json({error:'We could not send your request right now.'},500);}
}
