let cards=[],col=null,queue=[],cur=null;let DECK=[],DM=new Map();
const $=id=>document.getElementById(id),LS='flashcards_v2',MIN=60e3,DAY=864e5;
const P=['rank','ivl','due','seen'];
const toDoc=c=>DM.has(c.id)?Object.fromEntries([['id',c.id],['deck',1],...P.filter(k=>c[k]!=null).map(k=>[k,c[k]])]):c;
function fromDocs(docs){const m=new Map(DECK.map(c=>[c.id,{...c}]));docs.forEach(d=>{if(!d||!d.id)return;if(d.gone){m.delete(d.id);return}
 if(DM.has(d.id)){const c=m.get(d.id);if(c)P.forEach(k=>{if(d[k]!=null)c[k]=d[k]})}else if(d.mat)m.set(d.id,d)});return[...m.values()]}
let docs=new Map();
const lsLoad=()=>{try{(JSON.parse(localStorage.getItem(LS))||[]).forEach(d=>docs.set(d.id,d))}catch(e){}return fromDocs([...docs.values()])};
const lsSave=()=>{try{localStorage.setItem(LS,JSON.stringify([...docs.values()]))}catch(e){}};
const esc=s=>String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const RK={again:['Novamente','#dc2626'],hard:['Difícil','#ea580c'],good:['Bom','#16a34a'],easy:['Fácil','#2563eb']};
const fmt=ms=>ms<3600e3?'< '+Math.max(1,Math.round(ms/MIN))+' min':ms<DAY?Math.round(ms/3600e3)+' h':Math.round(ms/DAY)+' dia'+(Math.round(ms/DAY)>1?'s':'');
function next(c,r){const iv=c.ivl||0;
 if(r==='again')return{ivl:0,wait:MIN};
 if(r==='hard')return iv?{ivl:Math.max(1,iv*1.2),wait:Math.max(1,iv*1.2)*DAY}:{ivl:0,wait:6*MIN};
 if(r==='good')return iv?{ivl:iv*2.5,wait:iv*2.5*DAY}:c.seen?{ivl:1,wait:DAY}:{ivl:0,wait:10*MIN};
 const n=iv?iv*3.5:3;return{ivl:n,wait:n*DAY}}
// ---- HTML seguro + lacunas
function clean(html){const d=new DOMParser().parseFromString('<div>'+html+'</div>','text/html');
 d.querySelectorAll('script,style,iframe,object,embed,img,link,meta,audio,video').forEach(e=>e.remove());
 d.querySelectorAll('*').forEach(e=>[...e.attributes].forEach(a=>{if(/^on/i.test(a.name)||(a.name==='href'))e.removeAttribute(a.name)}));
 return d.body.firstChild.innerHTML}
const CZ=/\{\{c(\d+)::([\s\S]*?)(?:::([\s\S]*?))?\}\}/g;
function cloze(html,n,reveal){return html.replace(CZ,(m,k,t,h)=>+k!==n?t:reveal?`<span class="czA">${t}</span>`:`<span class="cz">[${h||'...'}]</span>`)}
function faces(c){const h=clean(c.front||'');
 if(c.type==='cloze')return[cloze(h,c.cl,false),cloze(h,c.cl,true)+(c.back?'<hr>'+clean(c.back):'')];
 return[h,h+'<hr>'+clean(c.back||'')]}
const plain=h=>{const d=document.createElement('div');d.innerHTML=String(h||'').replace(CZ,'$2').replace(/<br\s*\/?>/gi,' ');return d.textContent.replace(/\s+/g,' ').trim()};
// ---- matérias/temas
const mats=()=>[...new Set([...Object.keys(TOPICS),...cards.map(c=>c.mat)])];
const temasOf=m=>[...new Set([...(TOPICS[m]||[]),...cards.filter(c=>c.mat===m).map(c=>c.tema)])];
function fillSel(sel,opts,first){const v=sel.value;sel.innerHTML=(first?`<option value="">${first}</option>`:'')+opts.map(o=>`<option ${o===v?'selected':''}>${esc(o)}</option>`).join('')}
function fillAll(){fillSel($('mat'),mats());fillSel($('fMat'),mats(),'Todas as matérias');fillSel($('lMat'),mats(),'Todas as matérias');syncTema('mat','tema');syncTema('fMat','fTema','Todos os temas')}
function syncTema(m,t,first){fillSel($(t),$(m).value?temasOf($(m).value):[],first)}
$('mat').onchange=()=>syncTema('mat','tema');
$('fMat').onchange=()=>{$('fTema').value='';syncTema('fMat','fTema','Todos os temas');build()};
$('fTema').onchange=$('fMode').onchange=build;$('lMat').onchange=renderList;
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{
 document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('on',x===b));
 ['study','add','list','temas','imp','prog'].forEach(t=>$(t).classList.toggle('hide',t!==b.dataset.t));
 if(b.dataset.t==='study')build();if(b.dataset.t==='temas')renderTemas();if(b.dataset.t==='list')renderList()});
// ---- estudo
function filtered(){const m=$('fMat').value,t=$('fTema').value;return cards.filter(c=>(!m||c.mat===m)&&(!t||c.tema===t))}
function build(){const now=Date.now(),mode=$('fMode').value;
 let l=filtered();if(mode==='due')l=l.filter(c=>!c.due||c.due<=now);else if(mode!=='all')l=l.filter(c=>mode==='new'?!c.rank:c.rank===mode);
 queue=l.sort((a,b)=>(a.due||0)-(b.due||0)||Math.random()-.5).map(c=>c.id);draw()}
function stats(){const l=filtered(),now=Date.now(),n=k=>l.filter(c=>c.rank===k).length;
 $('stats').innerHTML=`<span>⏰ Pra revisar: <b>${l.filter(c=>!c.due||c.due<=now).length}</b></span><span>🆕 Novos: <b>${l.filter(c=>!c.rank).length}</b></span>`+Object.entries(RK).map(([k,[n2,co]])=>`<span style="color:${co}">${n2}: <b>${n(k)}</b></span>`).join('');$('count').textContent=cards.length}
function draw(){stats();
 if(!queue.length){$('studyArea').innerHTML=`<div class="empty">${cards.length?'Nada pra revisar agora nesse filtro 🎉<br>Escolha "Todos os cartões" pra estudar mesmo assim.':'Crie cartões na aba "Criar" ou importe um baralho do Anki na aba "Importar".'}</div>`;return}
 cur=cards.find(x=>x.id===queue[0]);if(!cur){queue.shift();return draw()}
 const [f,b]=faces(cur);
 $('studyArea').innerHTML=`<div class="tag">${esc(cur.mat)} › ${esc(cur.tema)} · faltam ${queue.length}</div>${cur.src?`<div class="src">${esc(cur.src)}</div>`:''}<div class="cardbox" id="fc">${f}</div>
 <div id="act" class="row"><button class="btn pri" id="turn" style="width:100%">Mostrar resposta</button></div>`;
 const show=()=>{$('fc').innerHTML=b;$('act').innerHTML='<div class="anki">'+Object.entries(RK).map(([k,[n,co]])=>`<button class="ak" data-r="${k}" style="background:${co}">${n}<small>${fmt(next(cur,k).wait)}</small></button>`).join('')+'</div>';
  document.querySelectorAll('.ak').forEach(x=>x.onclick=()=>rate(x.dataset.r))};
 $('turn').onclick=show}
document.addEventListener('keydown',e=>{if($('study').classList.contains('hide')||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
 if(e.key===' '&&$('turn')){e.preventDefault();$('turn').click()}const k={1:'again',2:'hard',3:'good',4:'easy'}[e.key];if(k&&!$('turn')&&cur)rate(k)});
function rate(r){const n=next(cur,r);Object.assign(cur,{rank:r,ivl:n.ivl,due:Date.now()+n.wait,seen:1});save(cur);
 queue.shift();if(n.wait<=10*MIN)queue.splice(Math.min(queue.length,r==='again'?3:6),0,cur.id);draw()}
function save(c){const d=toDoc(c);docs.set(c.id,d);lsSave();}
// ---- criar
const md=t=>esc(t).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/==(.+?)==/g,'<mark>$1</mark>').replace(/\n/g,'<br>');
$('type').onchange=()=>{const cz=$('type').value==='cloze';$('lblF').textContent=cz?'Texto (selecione um trecho e toque em "Ocultar")':'Frente (pergunta)';$('lblB').textContent=cz?'Extra (opcional)':'Verso (resposta)';$('czTools').classList.toggle('hide',!cz)};
function wrap(a,b){const t=$('front'),s=t.selectionStart,e=t.selectionEnd;if(s===e)return;t.value=t.value.slice(0,s)+a+t.value.slice(s,e)+b+t.value.slice(e);t.focus()}
const maxC=()=>Math.max(0,...[...$('front').value.matchAll(/\{\{c(\d+)::/g)].map(m=>+m[1]));
$('bNew').onclick=()=>wrap(`{{c${maxC()+1}::`,'}}');$('bSame').onclick=()=>wrap(`{{c${maxC()||1}::`,'}}');
$('bB').onclick=()=>wrap('**','**');$('bH').onclick=()=>wrap('==','==');
$('form').onsubmit=e=>{e.preventDefault();const type=$('type').value,F=$('front').value.trim(),B=$('back').value.trim();if(!F)return;
 const base={mat:$('mat').value,tema:$('tema').value,src:$('src').value.trim(),type,front:md(F),back:md(B),t:Date.now()},id=Date.now().toString(36)+Math.random().toString(36).slice(2,5);
 let made=[];
 if(type==='cloze'){const ns=[...new Set([...F.matchAll(/\{\{c(\d+)::/g)].map(m=>+m[1]))];if(!ns.length){$('saved').textContent='Oculte pelo menos um trecho';return}
  made=ns.map(n=>({...base,id:id+'_c'+n,cl:n}))}else{if(!B)return;made=[{...base,id}]}
 made.forEach(c=>{cards.push(c);save(c)});stats();
 $('front').value='';$('back').value='';$('front').focus();$('saved').textContent=`Salvo ✓ (${made.length} cartão${made.length>1?'es':''})`;setTimeout(()=>$('saved').textContent='',2000)};
// ---- lista / temas
function renderList(){const m=$('lMat').value,l=cards.filter(c=>!m||c.mat===m).sort((a,b)=>(b.t||0)-(a.t||0)),L=l.slice(0,300);
 $('listArea').innerHTML=l.length?L.map(c=>`<div class="item"><div><div class="q">${c.rank?`<span class="dot" style="background:${RK[c.rank][1]}"></span>`:'🆕 '}${esc(plain(c.front).slice(0,160))}${c.type==='cloze'?` <span class="pill">lacuna ${c.cl}</span>`:''}</div><div class="a"><i>${esc(c.mat)} › ${esc(c.tema)}</i></div></div><button class="x" data-id="${c.id}">✕</button></div>`).join('')+(l.length>300?`<div class="empty">Mostrando 300 de ${l.length}. Filtre por matéria.</div>`:''):'<div class="empty">Nenhum cartão.</div>'}
$('listArea').onclick=e=>{const id=e.target.dataset&&e.target.dataset.id;if(!id)return;cards=cards.filter(c=>c.id!==id);if(DM.has(id)){const d={id,gone:1};docs.set(id,d);}else{docs.delete(id);}lsSave();renderList();stats()};
function renderTemas(){$('temasArea').innerHTML=mats().map(m=>{const cm=cards.filter(c=>c.mat===m);
 return `<details><summary><b>${esc(m)}</b> <span class="a">${cm.length} cartões</span></summary>${temasOf(m).map(t=>{const ct=cm.filter(c=>c.tema===t),bad=ct.filter(c=>c.rank==='again'||c.rank==='hard').length;
 return `<div class="trow" data-m="${esc(m)}" data-t="${esc(t)}"><span>${esc(t)}</span><span class="a">${ct.length}${bad?` · <span style="color:#dc2626">${bad} difíceis</span>`:''}</span></div>`}).join('')}</details>`}).join('')}
$('temasArea').onclick=e=>{const r=e.target.closest('.trow');if(!r)return;$('fMat').value=r.dataset.m;syncTema('fMat','fTema','Todos os temas');$('fTema').value=r.dataset.t;$('fMode').value='all';document.querySelector('[data-t=study]').click()};
// ---- importar .apkg
const loadJS=u=>new Promise((ok,no)=>{const s=document.createElement('script');s.src=u;s.onload=ok;s.onerror=no;document.head.appendChild(s)});
let pending=[];
function mapDeck(name){let seg=name.split('::').map(s=>s.replace(/^TJSP\s*-\s*/,'').trim());
 let i=-1;seg.forEach((s,k)=>{if(TOPICS[s])i=k});
 if(i<0){if(seg.length>2&&/amostra|grátis|gratis/i.test(seg[0]))seg=seg.slice(1);i=0}
 return{mat:seg[i],tema:seg.slice(i+1).join(' › ')||'Geral'}}
$('apkg').onchange=async e=>{const f=e.target.files[0];if(!f)return;const st=$('impStatus');st.textContent='Lendo o arquivo…';$('impPick').innerHTML='';
 try{
  if(!window.JSZip)await loadJS('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
  if(!window.initSqlJs)await loadJS('https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-asm.js');
  const zip=await JSZip.loadAsync(f),file=zip.file('collection.anki21')||zip.file('collection.anki2');
  if(!file){st.textContent=zip.file('collection.anki21b')?'Esse arquivo está no formato novo do Anki. No Anki, exporte de novo marcando "Suporte a versões antigas do Anki".':'Não achei o baralho dentro desse arquivo.';return}
  const SQL=await initSqlJs(),db=new SQL.Database(new Uint8Array(await file.async('uint8array')));
  const q=s=>{try{const r=db.exec(s)[0];return r?r.values:[]}catch(e){return[]}};
  const decks={};const dj=q('select decks from col')[0];
  if(dj&&dj[0]&&dj[0].length>2)Object.values(JSON.parse(dj[0])).forEach(d=>decks[d.id]=d.name);else q('select id,name from decks').forEach(([id,n])=>decks[id]=String(n).replace(/\x1f/g,'::'));
  const notes={};q('select id,flds from notes').forEach(([id,f])=>notes[id]=f.split('\x1f'));
  pending=[];let skip=0;
  q('select nid,ord,did from cards').forEach(([nid,ord,did])=>{const fl=notes[nid];if(!fl)return;const txt=fl[0]||'';
   const {mat,tema}=mapDeck(decks[did]||'Importados');const base={mat,tema,t:Date.now()};
   if(/\{\{c\d+::/.test(txt))pending.push({...base,id:'a'+nid+'_c'+(ord+1),type:'cloze',cl:ord+1,front:txt,back:fl[1]||''});
   else if(plain(txt)&&plain(fl[1]||''))pending.push({...base,id:'a'+nid+'_'+ord,type:'basic',front:ord?fl[1]:txt,back:ord?txt:fl[1]});
   else skip++});
  const by={};pending.forEach(c=>by[c.mat]=(by[c.mat]||0)+1);
  st.textContent=`Encontrei ${pending.length} cartões${skip?` (${skip} de imagem foram ignorados)`:''}. Escolha as matérias:`;
  $('impPick').innerHTML=Object.entries(by).sort((a,b)=>(!!TOPICS[b[0]]-!!TOPICS[a[0]])||b[1]-a[1]).map(([m,n])=>`<label class="chk"><input type="checkbox" value="${esc(m)}" ${TOPICS[m]?'checked':''}> ${esc(m)} <span class="a">(${n})</span></label>`).join('')+`<div class="row"><button class="btn pri" id="doImp">Importar selecionados</button></div>`;
  $('doImp').onclick=doImport}catch(err){st.textContent='Não consegui ler esse arquivo ('+err.message+').'}};
async function doImport(){const sel=new Set([...document.querySelectorAll('#impPick input:checked')].map(i=>i.value)),have=new Set(cards.map(c=>c.id));
 const l=pending.filter(c=>sel.has(c.mat)&&!have.has(c.id));const st=$('impStatus');$('impPick').innerHTML='';
 l.forEach(c=>docs.set(c.id,c));cards.push(...l);lsSave();fillAll();stats();
 if(false){let i=0;const w=async()=>{while(i<l.length){const c=l[i++];try{await col.doc(c.id).set(c)}catch(e){}st.textContent=`Salvando na sua conta… ${Math.min(i,l.length)}/${l.length}`}};await Promise.all([w(),w(),w(),w()])}
 st.textContent=`✓ ${l.length} cartões importados.`;pending=[]}
// ---- início
function refresh(){fillAll();renderList();build()}
$('status').textContent='salvo neste navegador';

// ===== Histórico de respostas =====
const HK='flashcards_hist';let hist=[];try{hist=JSON.parse(localStorage.getItem(HK))||[]}catch(e){}
function logAns(c,r){hist.push({id:c.id,mat:c.mat,tema:c.tema,r,ts:Date.now()});try{localStorage.setItem(HK,JSON.stringify(hist))}catch(e){}}
const dayKey=t=>{const d=new Date(t);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
function streak(){const days=new Set(hist.map(h=>dayKey(h.ts)));let n=0,d=new Date();if(!days.has(dayKey(d)))d.setDate(d.getDate()-1);while(days.has(dayKey(d))){n++;d.setDate(d.getDate()-1)}return n}
function renderProg(){const today=dayKey(Date.now()),hoje=hist.filter(h=>dayKey(h.ts)===today),now=Date.now();
 const due=cards.filter(c=>c.seen&&c.due<=now).length,acc=l=>l.length?Math.round(100*l.filter(h=>h.r!=='again').length/l.length):0;
 const last30=[...Array(30)].map((_,i)=>{const d=new Date();d.setDate(d.getDate()-29+i);const k=dayKey(d);return[k,hist.filter(h=>dayKey(h.ts)===k).length]}),mx=Math.max(1,...last30.map(x=>x[1]));
 const bym={};hist.forEach(h=>{(bym[h.mat]=bym[h.mat]||[]).push(h)});
 const weak={};hist.slice(-1500).forEach(h=>{if(h.r==='again'||h.r==='hard'){const k=h.mat+' › '+h.tema;weak[k]=(weak[k]||0)+1}});
 $('progArea').innerHTML=`<div class="kpis"><div><b>${hoje.length}</b><span>respondidos hoje</span></div><div><b>${streak()} 🔥</b><span>dias seguidos</span></div><div><b>${acc(hoje)}%</b><span>acerto hoje</span></div><div><b>${due}</b><span>revisões pendentes</span></div></div>
 <h3>Últimos 30 dias</h3><div class="bars">${last30.map(([k,n])=>`<div title="${k}: ${n}" style="height:${4+96*n/mx}%"></div>`).join('')}</div>
 <h3>Acerto por matéria</h3>${Object.entries(bym).map(([m,l])=>`<div class="mrow"><span>${esc(m)}</span><span class="a">${l.length} respostas · <b>${acc(l)}%</b></span></div>`).join('')||'<p class="a">Ainda sem respostas.</p>'}
 <h3>Temas pra reforçar</h3>${Object.entries(weak).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,n])=>`<div class="mrow"><span>${esc(k)}</span><span style="color:#dc2626">${n} erros</span></div>`).join('')||'<p class="a">Nenhum ainda 👏</p>'}
 <h3>Últimas respostas</h3>${hist.slice(-15).reverse().map(h=>{const c=cards.find(x=>x.id===h.id);return `<div class="mrow"><span>${esc(plain(c?c.front:'').slice(0,70))}</span><span style="color:${RK[h.r][1]}">${RK[h.r][0]} · ${new Date(h.ts).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</span></div>`}).join('')}`}
// ===== Backup =====
$('bExp').onclick=()=>{const blob=new Blob([JSON.stringify({v:1,docs:[...docs.values()],hist},null,0)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='flashcards-backup-'+dayKey(Date.now())+'.json';a.click()};
$('bImp').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const j=JSON.parse(await f.text());(j.docs||[]).forEach(d=>docs.set(d.id,d));const seen=new Set(hist.map(h=>h.id+h.ts));(j.hist||[]).forEach(h=>{if(!seen.has(h.id+h.ts))hist.push(h)});hist.sort((a,b)=>a.ts-b.ts);
 lsSave();localStorage.setItem(HK,JSON.stringify(hist));cards=fromDocs([...docs.values()]);refresh();renderProg();$('bkMsg').textContent='✓ Backup restaurado'}catch(err){$('bkMsg').textContent='Arquivo inválido'}};
// ===== Lembretes =====
const RKEY='flashcards_rem';
function remCfg(){try{return JSON.parse(localStorage.getItem(RKEY))||{}}catch(e){return{}}}
$('remTime').value=remCfg().time||'20:00';
$('bIcs').onclick=()=>{const [h,m]=$('remTime').value.split(':'),d=new Date();d.setHours(+h,+m,0,0);if(d<new Date())d.setDate(d.getDate()+1);
 const p=n=>String(n).padStart(2,'0'),dt=`${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`,url=location.href.split('#')[0];
 const ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//flashcards//PT','BEGIN:VEVENT','UID:flashcards-'+Date.now(),'DTSTART:'+dt,'DURATION:PT30M','RRULE:FREQ=DAILY','SUMMARY:📚 Revisar flashcards','DESCRIPTION:Hora de revisar! '+url,'URL:'+url,'BEGIN:VALARM','TRIGGER:PT0M','ACTION:DISPLAY','DESCRIPTION:Revisar flashcards','END:VALARM','END:VEVENT','END:VCALENDAR'].join('\r\n');
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([ics],{type:'text/calendar'}));a.download='lembrete-flashcards.ics';a.click();localStorage.setItem(RKEY,JSON.stringify({...remCfg(),time:$('remTime').value}))};
$('bGcal').onclick=()=>{const [h,m]=$('remTime').value.split(':'),d=new Date();d.setHours(+h,+m,0,0);if(d<new Date())d.setDate(d.getDate()+1);const e=new Date(d.getTime()+30*MIN),f=x=>x.toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
 window.open('https://calendar.google.com/calendar/render?action=TEMPLATE&text='+encodeURIComponent('📚 Revisar flashcards')+'&dates='+f(d)+'/'+f(e)+'&recur='+encodeURIComponent('RRULE:FREQ=DAILY')+'&details='+encodeURIComponent('Hora de revisar! '+location.href.split('#')[0]),'_blank');localStorage.setItem(RKEY,JSON.stringify({...remCfg(),time:$('remTime').value}))};
$('bNotif').onclick=async()=>{if(!('Notification'in window))return $('remMsg').textContent='Seu navegador não suporta notificações.';const p=await Notification.requestPermission();localStorage.setItem(RKEY,JSON.stringify({...remCfg(),notif:p==='granted'}));$('remMsg').textContent=p==='granted'?'✓ Vou avisar quando houver revisões (com o site aberto).':'Permissão negada.'};
function checkDue(){const n=cards.filter(c=>c.seen&&c.due<=Date.now()).length;document.title=(n?`(${n}) `:'')+'Flashcards · Escrevente TJSP';
 if(n&&remCfg().notif&&window.Notification&&Notification.permission==='granted'&&document.hidden){const last=+localStorage.getItem('fc_lastNotif')||0;if(Date.now()-last>3600e3){new Notification('📚 Flashcards',{body:`Você tem ${n} cartões pra revisar.`});localStorage.setItem('fc_lastNotif',Date.now())}}}
setInterval(checkDue,60e3);
document.querySelector('[data-t=prog]').addEventListener('click',renderProg);
// ===== Início =====
fetch('deck.json').then(r=>r.json()).then(d=>{DECK=d;DM=new Map(DECK.map(c=>[c.id,c]));cards=lsLoad();refresh();checkDue();$('status').textContent='salvo neste aparelho · faça backup na aba Progresso'})
 .catch(()=>{cards=lsLoad();refresh();$('status').textContent='não consegui carregar deck.json (abra pelo site, não pelo arquivo)'});

// ===== ❤️ =====
document.getElementById('love').onclick=()=>{const m=document.getElementById('loveMsg');m.classList.add('show');clearTimeout(m._t);m._t=setTimeout(()=>m.classList.remove('show'),2500);
 for(let i=0;i<14;i++){const s=document.createElement('span');s.className='fh';s.textContent=['❤️','💖','💕','💗'][i%4];s.style.left=(10+Math.random()*80)+'vw';s.style.setProperty('--r',(Math.random()*60-30)+'deg');s.style.animationDelay=(Math.random()*.6)+'s';document.body.appendChild(s);setTimeout(()=>s.remove(),3000)}};
