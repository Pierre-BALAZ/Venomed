(function(){
"use strict";
var D = window.VENOMED_DATA;
var IMG = 'assets/img/';
function imgurl(f){ return (window.__IMGMAP__ && window.__IMGMAP__[f]) ? window.__IMGMAP__[f] : IMG+f; }
function brandSrc(){ return window.__BRAND__ || 'assets/icons/icon-192.png'; }
var APP = document.getElementById('app');
var TAB = document.getElementById('tabbar');

// Syndromes rendus DANS l'encart "Prise en charge médicale"
var EMBED_SYN = {'syndrome-viperin':1,'loxocelisme':1,'latrodectisme':1,'steatodisme':1,
                 'araneisme-necosant':1,'syndrome-scorpionique':1,'syndrome-hymenoptere':1,'tetrodotoxisme':1};

var speciesById={}; D.species.forEach(function(s){ speciesById[s.id]=s; });
var syndromeById={}; D.syndromes.forEach(function(s){ syndromeById[s.id]=s; });
var catById={}; D.categories.forEach(function(c){ catById[c.id]=c; });
function speciesOfCat(cid){ return D.species.filter(function(s){return s.category===cid;}); }
function catCover(cid){ var l=speciesOfCat(cid); for(var i=0;i<l.length;i++){ if(l[i].images&&l[i].images.length) return l[i].images[0]; } return null; }

// ---- helpers ----
function esc(t){ return (t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function fmt(t){ // escape + **gras**
  return esc(t||'').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
}
function svg(p){ return '<svg viewBox="0 0 24 24">'+p+'</svg>'; }
var IC={
  back:'<path d="M15 18l-6-6 6-6"/>', chev:'<path d="M9 18l6-6-6-6"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/>',
  phone:'<path d="M6 3h4l2 5-3 2a13 13 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 4 6a2 2 0 0 1 2-3z"/>',
  shield:'<path d="M12 2 4 6v6c0 5 3.4 8.5 8 9 4.6-.5 8-4 8-9V6z"/>',
  steth:'<path d="M4.5 2A2.5 2.5 0 0 0 2 4.5V9a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4.5A2.5 2.5 0 0 0 11.5 2M8 15v1.5a5.5 5.5 0 0 0 11 0V13"/><circle cx="20" cy="10.5" r="2.2"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  zoom:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35M11 8v6M8 11h6"/>',
  x:'<path d="M18 6 6 18M6 6l12 12"/>',
  arrowL:'<path d="M15 18l-6-6 6-6"/>', arrowR:'<path d="M9 18l6-6-6-6"/>'
};

function dangerBadge(s){ var d=(s.danger_short||'').trim(); if(!d||d==='—')return ''; return '<span class="badge '+s.danger_class+'"><span class="dot"></span>'+esc(d)+'</span>'; }

// ---- gallery + lightbox ----
window.__GAL__={}; var galSeq=0;
function galleryHTML(images){
  if(!images||!images.length) return '';
  var id='g'+(++galSeq); window.__GAL__[id]=images.map(imgurl);
  var single=images.length===1?' single':'';
  var thumbs=images.map(function(f,i){
    return '<button class="gthumb" data-gal="'+id+'" data-idx="'+i+'" aria-label="Agrandir la photo '+(i+1)+'">'+
      '<img src="'+imgurl(f)+'" alt="" loading="lazy"><span class="zoomtag">'+svg(IC.zoom)+'</span></button>';
  }).join('');
  return '<div class="gallery2'+single+'">'+thumbs+'</div>';
}

// lightbox singleton
var LB={list:[],idx:0,scale:1,tx:0,ty:0};
function buildLightbox(){
  var el=document.createElement('div'); el.id='lightbox'; el.hidden=true;
  el.innerHTML=
    '<button class="lb-close" aria-label="Fermer">'+svg(IC.x)+'</button>'+
    '<button class="lb-nav lb-prev" aria-label="Précédent">'+svg(IC.arrowL)+'</button>'+
    '<button class="lb-nav lb-next" aria-label="Suivant">'+svg(IC.arrowR)+'</button>'+
    '<div class="lb-stage"><img class="lb-img" alt=""></div>'+
    '<div class="lb-count"></div>';
  document.body.appendChild(el);
  el.querySelector('.lb-close').onclick=closeLB;
  el.querySelector('.lb-prev').onclick=function(e){e.stopPropagation();stepLB(-1);};
  el.querySelector('.lb-next').onclick=function(e){e.stopPropagation();stepLB(1);};
  el.addEventListener('click',function(e){ if(e.target===el||e.target.classList.contains('lb-stage')) closeLB(); });
  var img=el.querySelector('.lb-img');
  img.addEventListener('click',function(e){ e.stopPropagation(); toggleZoom(e); });
  // drag to pan when zoomed
  var drag=false,sx=0,sy=0;
  img.addEventListener('pointerdown',function(e){ if(LB.scale>1){drag=true;sx=e.clientX-LB.tx;sy=e.clientY-LB.ty;img.setPointerCapture(e.pointerId);} });
  img.addEventListener('pointermove',function(e){ if(drag){LB.tx=e.clientX-sx;LB.ty=e.clientY-sy;applyTransform();} });
  img.addEventListener('pointerup',function(){drag=false;});
  // swipe
  var tsx=0,tsy=0;
  el.addEventListener('touchstart',function(e){ if(e.touches.length===1){tsx=e.touches[0].clientX;tsy=e.touches[0].clientY;} },{passive:true});
  el.addEventListener('touchend',function(e){ if(LB.scale>1)return; var dx=e.changedTouches[0].clientX-tsx,dy=e.changedTouches[0].clientY-tsy;
    if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)) stepLB(dx<0?1:-1); },{passive:true});
  document.addEventListener('keydown',function(e){ if(el.hidden)return;
    if(e.key==='Escape')closeLB(); else if(e.key==='ArrowLeft')stepLB(-1); else if(e.key==='ArrowRight')stepLB(1); });
  return el;
}
function applyTransform(){ document.querySelector('#lightbox .lb-img').style.transform='translate('+LB.tx+'px,'+LB.ty+'px) scale('+LB.scale+')'; }
function toggleZoom(e){ if(LB.scale>1){LB.scale=1;LB.tx=0;LB.ty=0;} else {LB.scale=2.4;}
  document.querySelector('#lightbox .lb-img').style.cursor=LB.scale>1?'grab':'zoom-in'; applyTransform(); }
function showLB(){ var el=document.getElementById('lightbox')||buildLightbox();
  var img=el.querySelector('.lb-img'); LB.scale=1;LB.tx=0;LB.ty=0;
  img.style.transform=''; img.style.cursor='zoom-in'; img.src=LB.list[LB.idx];
  el.querySelector('.lb-count').textContent=(LB.idx+1)+' / '+LB.list.length;
  var multi=LB.list.length>1;
  el.querySelector('.lb-prev').style.display=multi?'':'none';
  el.querySelector('.lb-next').style.display=multi?'':'none';
  el.querySelector('.lb-count').style.display=multi?'':'none';
  el.hidden=false; document.body.style.overflow='hidden';
}
function openLB(list,idx){ LB.list=list.slice(); LB.idx=idx; showLB(); }
function stepLB(d){ LB.idx=(LB.idx+d+LB.list.length)%LB.list.length; LB.scale=1;LB.tx=0;LB.ty=0; showLB(); }
function closeLB(){ var el=document.getElementById('lightbox'); if(el)el.hidden=true; document.body.style.overflow=''; }

// ---- appbar ----
function appbar(title, sub, back){
  var b=back?'<button class="back" onclick="history.back()" aria-label="Retour">'+svg(IC.back)+'</button>':'';
  var brand=back?'':'<img class="brandmark" src="'+brandSrc()+'" alt="">';
  return '<header class="appbar">'+b+brand+'<div><h1>'+esc(title)+'</h1>'+(sub?'<div class="sub">'+esc(sub)+'</div>':'')+'</div></header>';
}

// ---- views ----
function viewHome(){
  var cats=D.categories.map(function(c){
    var cover=catCover(c.id); var n=speciesOfCat(c.id).length;
    return '<button class="cat-card" data-nav="#/cat/'+c.id+'">'+
      '<div class="cat-thumb">'+(cover?'<img class="cat-img" src="'+imgurl(cover)+'" alt="" loading="lazy">':'<div class="cat-empty">'+svg(IC.info)+'</div>')+'</div>'+
      '<div class="cat-cap"><div class="cat-name">'+esc(c.title.replace(' de France',''))+'</div>'+
      '<div class="cat-count">'+n+' fiche'+(n>1?'s':'')+'</div></div></button>';
  }).join('');
  return '<div class="view">'+
    '<header class="appbar"><img class="brandmark" src="'+brandSrc()+'" alt="">'+
      '<div><h1>Venomed</h1><div class="sub">Envenimations · France</div></div></header>'+
    '<div class="wrap">'+
      '<div class="emergency"><div class="ico">'+svg(IC.phone)+'</div>'+
        '<div><b>Centre antipoison</b><p>En cas de morsure ou piqûre, appelez le 15 / centre antipoison.</p></div></div>'+
      '<button class="searchbar home" data-nav="#/search" style="text-align:left;margin-top:14px;border:none;padding:0;background:none">'+
        '<span style="position:relative;display:block">'+svg(IC.search)+
        '<span style="display:block;background:var(--surface);border:1px solid var(--line);border-radius:13px;color:var(--muted);padding:13px 14px 13px 42px">Rechercher une espèce, un syndrome…</span></span></button>'+
      '<div class="section-title">Catégories</div><div class="grid">'+cats+'</div>'+
      '<div class="disclaimer" style="margin-top:20px">Venomed est à visée informative pour les professionnels de santé. Contactez le centre antipoison en cas de piqûre ou de morsure.</div>'+
    '</div></div>';
}

function viewCategory(cid){
  var c=catById[cid]; if(!c) return viewNotFound();
  var list=speciesOfCat(cid).map(speciesRow).join('');
  return '<div class="view">'+appbar(c.title, speciesOfCat(cid).length+' fiches', true)+
    '<div class="wrap"><div class="list">'+list+'</div></div></div>';
}
function speciesRow(s){
  var thumb=(s.images&&s.images.length)?'<img class="thumb" src="'+imgurl(s.images[0])+'" alt="" loading="lazy">':'<div class="thumb ph">'+svg(IC.info)+'</div>';
  return '<button class="row" data-nav="#/sp/'+s.id+'">'+thumb+
    '<div class="r-main"><div class="r-name">'+esc(s.name)+'</div>'+(dangerBadge(s)?'<div class="r-sub">'+dangerBadge(s)+'</div>':'')+'</div>'+
    '<span class="chev">'+svg(IC.chev)+'</span></button>';
}

// render a syndrome's inner content (sub-sections + gallery), no outer card
function syndromeInner(sy){
  var html='<div class="syn-embed"><div class="syn-embed-title">'+svg(IC.steth)+esc(sy.name)+'</div>';
  html+=galleryHTML(sy.images);
  sy.sections.forEach(function(sec){
    if(sec.h) html+='<div class="synhead">'+esc(sec.h)+'</div>';
    if(sec.body) html+='<div class="body">'+fmt(sec.body)+'</div>';
  });
  return html+'</div>';
}

function viewSpecies(id){
  var s=speciesById[id]; if(!s) return viewNotFound();
  var top=galleryHTML(s.images);
  var secs=(s.sections||[]).slice();
  // header + latin name
  var head='<div class="detail-head"><h2>'+esc(s.name)+'</h2>';
  if(secs.length&&secs[0].h){ var parts=secs[0].h.split('\n'); if(parts.length>1) head+='<div class="sci">'+esc(parts.slice(1).join(' ').replace(/[()]/g,'').trim())+'</div>'; }
  head+='<div>'+dangerBadge(s)+'</div></div>';
  var embed=(s.syndrome&&EMBED_SYN[s.syndrome]&&syndromeById[s.syndrome])?syndromeById[s.syndrome]:null;

  var body=secs.map(function(sec,i){
    var low=(sec.h||'').toLowerCase();
    var isMed=low.indexOf('médic')>=0 && low.indexOf('non')<0;
    if(i===0){ return sec.body?card('',sec.body,''):''; }
    if(isMed){
      var inner=(sec.body?'<div class="body">'+fmt(sec.body)+'</div>':'');
      if(embed) inner+=syndromeInner(embed);
      return '<div class="card medical"><h3>'+svg(IC.steth)+esc(sec.h)+'</h3>'+inner+'</div>';
    }
    return card(sec.h,sec.body,low.indexOf('non médic')>=0?'nonmed':'');
  }).join('');

  return '<div class="view">'+appbar(s.name, s.category_title, true)+
    '<div class="wrap" style="padding-top:8px">'+top+head+body+'</div></div>';
}

function card(h,body,cls){
  var icon=cls==='nonmed'?IC.shield:IC.info;
  var head=h?'<h3>'+svg(icon)+esc(h)+'</h3>':'';
  return '<div class="card '+(cls||'')+'">'+head+'<div class="body">'+fmt(body)+'</div></div>';
}

function viewSyndrome(id){
  var s=syndromeById[id]; if(!s) return viewNotFound();
  var top=galleryHTML(s.images);
  var body=(s.sections||[]).map(function(sec){
    return '<div class="card">'+(sec.h?'<h3>'+svg(IC.steth)+esc(sec.h)+'</h3>':'')+'<div class="body">'+fmt(sec.body)+'</div></div>';
  }).join('');
  return '<div class="view">'+appbar(s.name,'Prise en charge',true)+
    '<div class="wrap" style="padding-top:8px">'+top+'<div style="height:6px"></div>'+body+'</div></div>';
}

function viewSearch(){
  return '<div class="view">'+appbar('Recherche',null,false)+
    '<div class="wrap"><div class="searchbar">'+svg(IC.search)+
    '<input id="q" type="search" placeholder="Espèce, syndrome, mot-clé…" autocomplete="off" autofocus></div>'+
    '<div id="results"><div class="empty">Tapez pour rechercher parmi '+D.species.length+' espèces et '+D.syndromes.length+' syndromes.</div></div></div></div>';
}
function norm(t){ return (t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); }
function runSearch(q){
  var box=document.getElementById('results'); if(!box)return;
  q=(q||'').trim();
  if(!q){ box.innerHTML='<div class="empty">Tapez pour rechercher parmi '+D.species.length+' espèces et '+D.syndromes.length+' syndromes.</div>'; return; }
  var nq=norm(q);
  var sp=D.species.filter(function(s){ return norm(s.name).indexOf(nq)>=0||norm(s.danger).indexOf(nq)>=0||norm(s.category_title).indexOf(nq)>=0||
    (s.sections||[]).some(function(x){return norm(x.h).indexOf(nq)>=0||norm(x.body).indexOf(nq)>=0;}); });
  var sy=D.syndromes.filter(function(s){ return norm(s.name).indexOf(nq)>=0||(s.sections||[]).some(function(x){return norm(x.body).indexOf(nq)>=0||norm(x.h).indexOf(nq)>=0;}); });
  if(!sp.length&&!sy.length){ box.innerHTML='<div class="empty">Aucun résultat pour « '+esc(q)+' ».</div>'; return; }
  var html='';
  if(sp.length) html+='<div class="section-title">Espèces ('+sp.length+')</div><div class="list">'+sp.map(speciesRow).join('')+'</div>';
  if(sy.length) html+='<div class="section-title">Syndromes & prise en charge ('+sy.length+')</div><div class="list">'+
    sy.map(function(s){return '<button class="row" data-nav="#/syn/'+s.id+'"><div class="thumb ph">'+svg(IC.steth)+'</div>'+
      '<div class="r-main"><div class="r-name">'+esc(s.name)+'</div><div class="r-sub">Prise en charge</div></div>'+
      '<span class="chev">'+svg(IC.chev)+'</span></button>';}).join('')+'</div>';
  box.innerHTML=html;
}

function viewUrgence(){
  return '<div class="view">'+appbar('Conduite d’urgence','Généralités',false)+
  '<div class="wrap"><a class="callbtn" href="tel:15">'+svg(IC.phone)+'Appeler le 15 (SAMU)</a>'+
    '<div class="ublock"><h3>À faire</h3><ol class="steps">'+
      '<li>Éloigner la victime de l’animal, la rassurer et l’allonger.</li>'+
      '<li>Retirer bagues, bracelets et vêtements serrés avant l’œdème.</li>'+
      '<li>Nettoyer et désinfecter la plaie ; immobiliser le membre.</li>'+
      '<li>Surveiller les signes locaux et généraux ; noter l’heure de la morsure.</li>'+
      '<li>Contacter le 15 / centre antipoison pour la conduite à tenir.</li></ol></div>'+
    '<div class="ublock"><h3 style="color:#ff97a6">À ne pas faire</h3><ol class="steps donot">'+
      '<li>Ne pas poser de garrot.</li><li>Ne pas inciser ni tenter d’aspirer le venin.</li>'+
      '<li>Ne pas appliquer de glace directement sur la plaie.</li>'+
      '<li>Ne pas donner d’AINS ni d’aspirine (risque hémorragique).</li></ol></div></div></div>';
}

function viewSources(){
  var body=((D.sources&&D.sources.sections)||[]).map(function(s){ return '<div class="card"><div class="body sources">'+fmt(s.body)+'</div></div>'; }).join('');
  return '<div class="view">'+appbar('Sources & mentions',null,false)+'<div class="wrap">'+body+'</div></div>';
}
function viewNotFound(){ return '<div class="view">'+appbar('Introuvable',null,true)+'<div class="wrap"><div class="empty">Page introuvable.</div></div></div>'; }

// ---- router ----
function render(){
  var h=location.hash||'#/'; var m,html;
  if(h==='#/'||h===''){ html=viewHome(); }
  else if((m=h.match(/^#\/cat\/(.+)$/))){ html=viewCategory(decodeURIComponent(m[1])); }
  else if((m=h.match(/^#\/sp\/(.+)$/))){ html=viewSpecies(decodeURIComponent(m[1])); }
  else if((m=h.match(/^#\/syn\/(.+)$/))){ html=viewSyndrome(decodeURIComponent(m[1])); }
  else if(h==='#/search'){ html=viewSearch(); }
  else if(h==='#/urgence'){ html=viewUrgence(); }
  else if(h==='#/sources'){ html=viewSources(); }
  else { html=viewNotFound(); }
  APP.innerHTML=html; window.scrollTo(0,0); TAB.hidden=false;
  var base=h==='#/'?'#/':(h.indexOf('#/search')===0?'#/search':(h.indexOf('#/urgence')===0?'#/urgence':(h.indexOf('#/sources')===0?'#/sources':'#/')));
  Array.prototype.forEach.call(TAB.querySelectorAll('.tab'),function(t){ t.classList.toggle('active',t.getAttribute('data-nav')===base); });
  var q=document.getElementById('q'); if(q) q.addEventListener('input',function(){runSearch(q.value);});
}

document.addEventListener('click',function(e){
  var g=e.target.closest('.gthumb');
  if(g){ e.preventDefault(); var list=window.__GAL__[g.getAttribute('data-gal')]; openLB(list, parseInt(g.getAttribute('data-idx'),10)||0); return; }
  var t=e.target.closest('[data-nav]'); if(!t)return;
  e.preventDefault(); var to=t.getAttribute('data-nav');
  if(location.hash===to)render(); else location.hash=to;
});
window.addEventListener('hashchange',render);
render();
})();
