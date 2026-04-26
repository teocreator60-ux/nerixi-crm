export const dynamic = 'force-dynamic'

export async function GET(request) {
  const url = new URL(request.url)
  const base = url.origin // ex: http://localhost:3000

  const js = `(function(){
  var SID_KEY='_nerixi_sid';
  var ENDPOINT='${base}/api/track';
  function uuid(){return 's_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,10)}
  function sid(){var s=null;try{s=localStorage.getItem(SID_KEY)}catch(e){}if(!s){s=uuid();try{localStorage.setItem(SID_KEY,s)}catch(e){}}return s}
  function send(path,payload){
    try{
      var body=JSON.stringify(Object.assign({sid:sid()},payload||{}));
      if(navigator.sendBeacon){navigator.sendBeacon(ENDPOINT+'/'+path,new Blob([body],{type:'application/json'}));return}
      fetch(ENDPOINT+'/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:body,keepalive:true,mode:'cors'}).catch(function(){})
    }catch(e){}
  }
  function track(){
    send('page',{url:location.href,title:document.title,referrer:document.referrer})
  }
  // Initial pageview
  track();
  // Identify from URL params (?ncid=5 or ?nemail=foo@bar)
  try{
    var params=new URLSearchParams(location.search);
    var ncid=params.get('ncid');
    var nemail=params.get('nemail');
    if(ncid||nemail) send('identify',{clientId:ncid?parseInt(ncid):null,email:nemail||null});
  }catch(e){}
  // SPA: re-track on history navigation
  var lastUrl=location.href;
  setInterval(function(){
    if(location.href!==lastUrl){lastUrl=location.href;track()}
  },800);
  // Identify on form submission with email field
  document.addEventListener('submit',function(e){
    try{
      var form=e.target;
      var email=form.querySelector?form.querySelector('input[type="email"]'):null;
      if(email&&email.value&&email.value.indexOf('@')>0) send('identify',{email:email.value.trim()});
    }catch(err){}
  },true);
  // Click on mailto links
  document.addEventListener('click',function(e){
    try{
      var a=e.target.closest&&e.target.closest('a[href^="mailto:"]');
      if(a){var em=a.getAttribute('href').replace('mailto:','').split('?')[0];if(em.indexOf('@')>0) send('identify',{email:em})}
    }catch(err){}
  },true);
  window.NerixiTrack={identify:function(p){send('identify',p)},track:track};
})();`

  return new Response(js, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
