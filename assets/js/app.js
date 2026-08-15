const menu=document.querySelector('.menu'),links=document.querySelector('.mobile-nav'),navClose=document.querySelector('.mobile-nav .nav__close');
function closeMobileNav(){links?.classList.remove('open');document.body.classList.remove('nav-open');menu?.setAttribute('aria-expanded','false')}
menu?.addEventListener('click',e=>{e.stopPropagation();const open=!links?.classList.contains('open');if(open){links?.classList.add('open');document.body.classList.add('nav-open')}else{closeMobileNav()}menu.setAttribute('aria-expanded',String(open))});
navClose?.addEventListener('click',closeMobileNav);
links?.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMobileNav));
document.addEventListener('click',e=>{if(links?.classList.contains('open')&&!links.contains(e.target)&&!menu?.contains(e.target))closeMobileNav()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMobileNav()});
window.addEventListener('resize',()=>{if(window.innerWidth>900)closeMobileNav()});
const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')}),{threshold:.12});document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
const slides=[...document.querySelectorAll('[data-service-slide]')],dots=document.querySelector('.service-dots');let serviceIndex=0;slides.forEach((_,i)=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',`Show service category ${i+1}`);b.addEventListener('click',()=>showService(i));dots?.appendChild(b)});function showService(i){if(!slides.length)return;serviceIndex=(i+slides.length)%slides.length;slides.forEach((s,n)=>s.classList.toggle('is-active',n===serviceIndex));dots?.querySelectorAll('button').forEach((d,n)=>d.classList.toggle('active',n===serviceIndex))}document.querySelector('.service-nav--prev')?.addEventListener('click',()=>showService(serviceIndex-1));document.querySelector('.service-nav--next')?.addEventListener('click',()=>showService(serviceIndex+1));showService(0);
const form=document.querySelector('#quoteForm');
let turnstileWidgetId=null;
const formStartedAt=document.querySelector('#formStartedAt');
if(formStartedAt)formStartedAt.value=String(Date.now());

async function initQuoteTurnstile(){
  const mount=document.querySelector('#turnstileWidget');
  if(!mount||!form)return;
  try{
    const configRes=await fetch('/api/turnstile-config',{headers:{Accept:'application/json'},cache:'no-store'});
    const config=await configRes.json().catch(()=>({}));
    if(!configRes.ok||!config.siteKey)throw new Error('Security verification is not configured.');
    const deadline=Date.now()+10000;
    while(!window.turnstile&&Date.now()<deadline){await new Promise(r=>setTimeout(r,100));}
    if(!window.turnstile)throw new Error('Security verification could not load.');
    turnstileWidgetId=window.turnstile.render(mount,{sitekey:config.siteKey,action:'quote',theme:'light'});
  }catch(err){
    mount.innerHTML='<p class="turnstile-error">Security verification will be available on the live website. If this is the live site, please call or email us.</p>';
  }
}
initQuoteTurnstile();

form?.addEventListener('submit',async e=>{
  e.preventDefault();
  const status=form.querySelector('.form-status'),button=form.querySelector('button[type="submit"]');
  status.className='form-status';
  const payload=Object.fromEntries(new FormData(form).entries());
  if(!payload['cf-turnstile-response']){
    status.classList.add('error');
    status.textContent='Please complete the security check before sending your request.';
    return;
  }
  status.textContent='Sending…';button.disabled=true;
  try{
    const res=await fetch('/api/quote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data.error||'Unable to send your request.');
    status.classList.add('success');
    status.textContent='Thank you — your quote request has been sent. We’ll get back to you as soon as possible.';
    form.reset();
    if(formStartedAt)formStartedAt.value=String(Date.now());
    if(window.turnstile&&turnstileWidgetId!==null)window.turnstile.reset(turnstileWidgetId);
  }catch(err){
    status.classList.add('error');
    status.textContent=err.message||'Something went wrong. Please call or email us instead.';
    if(window.turnstile&&turnstileWidgetId!==null)window.turnstile.reset(turnstileWidgetId);
  }finally{button.disabled=false;}
});
// Approved services showcase interactions
const cleaningSlides=[...document.querySelectorAll('[data-cleaning-slide]')];
const cleaningDots=document.querySelector('.cleaning-dots');
let cleaningIndex=0;
function showCleaningSlide(index){
  if(!cleaningSlides.length)return;
  cleaningIndex=(index+cleaningSlides.length)%cleaningSlides.length;
  cleaningSlides.forEach((slide,i)=>slide.classList.toggle('is-active',i===cleaningIndex));
  cleaningDots?.querySelectorAll('button').forEach((dot,i)=>dot.classList.toggle('active',i===cleaningIndex));
}
cleaningSlides.forEach((slide,i)=>{
  const dot=document.createElement('button');
  dot.type='button';
  dot.setAttribute('aria-label',`Show cleaning service ${i+1}`);
  dot.addEventListener('click',()=>showCleaningSlide(i));
  cleaningDots?.appendChild(dot);
  slide.addEventListener('click',()=>{
    const service=slide.dataset.quoteService;
    const select=document.querySelector('#quoteForm select[name="service"]');
    if(select&&service)select.value=service;
  });
});
const cleaningPrev=document.querySelector('.cleaning-nav--prev');
const cleaningNext=document.querySelector('.cleaning-nav--next');
let cleaningAutoTimer=null;
function startCleaningAutoplay(){clearInterval(cleaningAutoTimer);if(window.matchMedia('(max-width: 600px)').matches&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches&&cleaningSlides.length>1){cleaningAutoTimer=setInterval(()=>showCleaningSlide(cleaningIndex+1),5000)}}
function resetCleaningAutoplay(){startCleaningAutoplay()}
cleaningPrev?.addEventListener('click',()=>{showCleaningSlide(cleaningIndex-1);resetCleaningAutoplay()});
cleaningNext?.addEventListener('click',()=>{showCleaningSlide(cleaningIndex+1);resetCleaningAutoplay()});
cleaningDots?.addEventListener('click',resetCleaningAutoplay);
showCleaningSlide(0);
startCleaningAutoplay();

const facilitySlides=[...document.querySelectorAll('[data-facility-slide]')];
const facilityDots=document.querySelector('.facility-dots');
let facilityIndex=0;
function showFacilitySlide(index){
  if(!facilitySlides.length)return;
  facilityIndex=(index+facilitySlides.length)%facilitySlides.length;
  facilitySlides.forEach((slide,i)=>slide.classList.toggle('is-active',i===facilityIndex));
  facilityDots?.querySelectorAll('button').forEach((dot,i)=>dot.classList.toggle('active',i===facilityIndex));
}
facilitySlides.forEach((slide,i)=>{
  const dot=document.createElement('button');
  dot.type='button';
  dot.setAttribute('aria-label',`Show facility category ${i+1}`);
  dot.addEventListener('click',()=>showFacilitySlide(i));
  facilityDots?.appendChild(dot);
});

document.querySelectorAll('.facility-type-link[data-quote-service]').forEach(link=>{
  link.addEventListener('click',()=>{
    const service=link.dataset.quoteService;
    const select=document.querySelector('#quoteForm select[name="service"]');
    if(select&&service)select.value=service;
  });
});
const facilityPrev=document.querySelector('.facility-nav--prev');
const facilityNext=document.querySelector('.facility-nav--next');
let facilityAutoTimer=null;
function startFacilityAutoplay(){clearInterval(facilityAutoTimer);if(window.matchMedia('(max-width: 600px)').matches&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches&&facilitySlides.length>1){facilityAutoTimer=setInterval(()=>showFacilitySlide(facilityIndex+1),5000)}}
function resetFacilityAutoplay(){startFacilityAutoplay()}
facilityPrev?.addEventListener('click',()=>{showFacilitySlide(facilityIndex-1);resetFacilityAutoplay()});
facilityNext?.addEventListener('click',()=>{showFacilitySlide(facilityIndex+1);resetFacilityAutoplay()});
facilityDots?.addEventListener('click',resetFacilityAutoplay);
showFacilitySlide(0);
startFacilityAutoplay();
window.addEventListener('resize',()=>{startCleaningAutoplay();startFacilityAutoplay()});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInterval(cleaningAutoTimer);clearInterval(facilityAutoTimer)}else{startCleaningAutoplay();startFacilityAutoplay()}});
