// SRS v1.11 STF-UI-03: Fade-In-Up entrance for product cards and lazily shown content, as an inline <head> script.
// It runs before the first paint, so cards that are on screen at load also animate (no flash of the final state),
// and it does not wait for the Vue app to hydrate. Elements are marked with `data-reveal` (the v-reveal directive,
// server-rendered too); when one enters the viewport the script sets `data-in` = its stagger slot (0–5). Only opacity
// and transform animate. Nothing is hidden without JS, with prefers-reduced-motion or without IntersectionObserver.
// `data-in` is not a Vue-managed attribute, so hydration never sees a mismatch. Kept ES5 and tiny on purpose.
export const REVEAL_SCRIPT = `(function(){try{
var d=document.documentElement;
if(!('IntersectionObserver' in window)||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
d.classList.add('reveal-on');
var k=0,t;
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(!e.isIntersecting)return;
io.unobserve(e.target);e.target.setAttribute('data-in',String(Math.min(k++,5)));
clearTimeout(t);t=setTimeout(function(){k=0},400);});},{rootMargin:'0px 0px -4% 0px',threshold:0.04});
window.__sllReveal=function(el){if(el&&!el.hasAttribute('data-in'))io.observe(el)};
function scan(){var l=document.querySelectorAll('[data-reveal]:not([data-in])');for(var i=0;i<l.length;i++)io.observe(l[i])}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan);else scan();
setTimeout(function(){var l=document.querySelectorAll('[data-reveal]:not([data-in])');for(var i=0;i<l.length;i++){var r=l[i].getBoundingClientRect();if(r.top<innerHeight&&r.bottom>0)l[i].setAttribute('data-in','0')}},2500);
}catch(e){document.documentElement.classList.remove('reveal-on')}})();`
