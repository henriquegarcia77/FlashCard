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
$('fMat').onchange=()=>{UI.cur=null;$('fTema').value='';syncTema('fMat','fTema','Todos os temas');build()};
$('fTema').onchange=$('fMode').onchange=()=>{UI.cur=null;build()};$('lMat').onchange=renderList;
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{
 document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('on',x===b));
 ['study','add','list','temas','imp','prog'].forEach(t=>$(t).classList.toggle('hide',t!==b.dataset.t));
 if(b.dataset.t==='study')build();if(b.dataset.t==='temas')renderTemas();if(b.dataset.t==='list')renderList()});
// ---- estudo
function filtered(){const m=$('fMat').value,t=$('fTema').value;return cards.filter(c=>(!m||c.mat===m)&&(!t||c.tema===t))}
function build(){const now=Date.now(),mode=$('fMode').value;
 let l=filtered();if(mode==='due')l=l.filter(c=>!c.due||c.due<=now);else if(mode!=='all')l=l.filter(c=>mode==='new'?!c.rank:c.rank===mode);
 queue=l.sort((a,b)=>(a.due||0)-(b.due||0)||Math.random()-.5).map(c=>c.id);
 const sc=UI.cur;if(sc){const i=queue.indexOf(sc);if(i>0){queue.splice(i,1);queue.unshift(sc)}}draw()}
let UI={};try{UI=JSON.parse(localStorage.getItem('fc_ui'))||{}}catch(e){}
function saveUI(){UI.fMat=$('fMat').value;UI.fTema=$('fTema').value;UI.fMode=$('fMode').value;UI.cur=cur&&queue[0]===cur.id?cur.id:UI.cur;UI.u=Date.now();try{localStorage.setItem('fc_ui',JSON.stringify(UI))}catch(e){}}
function applyUI(){if(UI.fMat!=null&&[...$('fMat').options].some(o=>o.value===UI.fMat)){$('fMat').value=UI.fMat;syncTema('fMat','fTema','Todos os temas')}if(UI.fTema!=null&&[...$('fTema').options].some(o=>o.value===UI.fTema))$('fTema').value=UI.fTema;if(UI.fMode)$('fMode').value=UI.fMode}
function stats(){const l=filtered(),now=Date.now(),n=k=>l.filter(c=>c.rank===k).length;
 $('stats').innerHTML=`<span>⏰ Pra revisar: <b>${l.filter(c=>!c.due||c.due<=now).length}</b></span><span>🆕 Novos: <b>${l.filter(c=>!c.rank).length}</b></span>`+Object.entries(RK).map(([k,[n2,co]])=>`<span style="color:${co}">${n2}: <b>${n(k)}</b></span>`).join('');$('count').textContent=cards.length}
function draw(){stats();
 if(!queue.length){$('studyArea').innerHTML=`<div class="empty">${cards.length?'Nada pra revisar agora nesse filtro 🎉<br>Escolha "Todos os cartões" pra estudar mesmo assim.':'Crie cartões na aba "Criar" ou importe um baralho do Anki na aba "Importar".'}</div>`;return}
 cur=cards.find(x=>x.id===queue[0]);if(!cur){queue.shift();return draw()}UI.cur=cur.id;saveUI();if(!draw._t){draw._t=1}else push();
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
function save(c){const d=toDoc(c);d.u=Date.now();docs.set(c.id,d);lsSave();push();}
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
$('listArea').onclick=e=>{const id=e.target.dataset&&e.target.dataset.id;if(!id)return;cards=cards.filter(c=>c.id!==id);if(DM.has(id)){const d={id,gone:1};docs.set(id,d);}else{docs.delete(id);}lsSave();push();renderList();stats()};
function renderTemas(){const MT=m=>Object.values(METAS[m]||{}).reduce((a,b)=>a+b,0),tot=Object.keys(METAS).reduce((a,m)=>a+MT(m),0);
 $('temasArea').innerHTML=`<p class="a">Meta do edital: <b>${tot}</b> questões · você tem <b>${cards.length}</b> cartões</p>`+mats().map(m=>{const cm=cards.filter(c=>c.mat===m);
 return `<details><summary><b>${esc(m)}</b> <span class="a">${cm.length} cartões${MT(m)?' · meta '+MT(m):''}</span></summary>${temasOf(m).map(t=>{const ct=cm.filter(c=>c.tema===t),bad=ct.filter(c=>c.rank==='again'||c.rank==='hard').length;
 const mt=(METAS[m]||{})[t];return `<div class="trow" data-m="${esc(m)}" data-t="${esc(t)}"><span>${esc(t)}</span><span class="a">${ct.length}${mt?' / '+mt:''}${bad?` · <span style="color:#dc2626">${bad} difíceis</span>`:''}</span></div>`}).join('')}</details>`}).join('')}
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
 l.forEach(c=>docs.set(c.id,c));cards.push(...l);lsSave();push();fillAll();stats();
 if(false){let i=0;const w=async()=>{while(i<l.length){const c=l[i++];try{await col.doc(c.id).set(c)}catch(e){}st.textContent=`Salvando na sua conta… ${Math.min(i,l.length)}/${l.length}`}};await Promise.all([w(),w(),w(),w()])}
 st.textContent=`✓ ${l.length} cartões importados.`;pending=[]}
// ---- início
function refresh(){fillAll();applyUI();renderList();build()}
$('status').textContent='salvo neste navegador';

// ===== Histórico de respostas =====
const HK='flashcards_hist';let hist=[];try{hist=JSON.parse(localStorage.getItem(HK))||[]}catch(e){}
function logAns(c,r){hist.push({id:c.id,mat:c.mat,tema:c.tema,r,ts:Date.now()});try{localStorage.setItem(HK,JSON.stringify(hist))}catch(e){}push()}
const dayKey=t=>{const d=new Date(t);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
function streak(){const days=new Set(hist.map(h=>dayKey(h.ts)));let n=0,d=new Date();if(!days.has(dayKey(d)))d.setDate(d.getDate()-1);while(days.has(dayKey(d))){n++;d.setDate(d.getDate()-1)}return n}
function donut(parts,size=170){const tot=parts.reduce((a,p)=>a+p.v,0);if(!tot)return '<p class="a">Sem respostas ainda.</p>';let a0=-Math.PI/2,paths='';const R=size/2,r=R*.58,c=R;
 parts.forEach(p=>{if(!p.v)return;const a1=a0+2*Math.PI*p.v/tot;const big=a1-a0>Math.PI?1:0;const pt=(a,rr)=>[c+rr*Math.cos(a),c+rr*Math.sin(a)];
  if(p.v===tot){paths+=`<circle cx="${c}" cy="${c}" r="${(R+r)/2}" fill="none" stroke="${p.c}" stroke-width="${R-r}"/>`}else{const [x1,y1]=pt(a0,R),[x2,y2]=pt(a1,R),[x3,y3]=pt(a1,r),[x4,y4]=pt(a0,r);
  paths+=`<path d="M${x1} ${y1}A${R} ${R} 0 ${big} 1 ${x2} ${y2}L${x3} ${y3}A${r} ${r} 0 ${big} 0 ${x4} ${y4}Z" fill="${p.c}"><title>${p.n}: ${p.v}</title></path>`}a0=a1});
 const ok=parts.filter(p=>p.good).reduce((a,p)=>a+p.v,0);
 return `<div class="donutw"><svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${paths}<text x="${c}" y="${c-2}" text-anchor="middle" class="dn1">${Math.round(100*ok/tot)}%</text><text x="${c}" y="${c+16}" text-anchor="middle" class="dn2">de acerto</text></svg>
 <div class="leg">${parts.map(p=>`<div><span class="sw" style="background:${p.c}"></span>${p.n}: <b>${p.v}</b> <span class="a">(${Math.round(100*p.v/tot)}%)</span></div>`).join('')}</div></div>`}
function renderProg(){const today=dayKey(Date.now()),hoje=hist.filter(h=>dayKey(h.ts)===today),now=Date.now();
 const due=cards.filter(c=>c.seen&&c.due<=now).length,acc=l=>l.length?Math.round(100*l.filter(h=>h.r==='good'||h.r==='easy').length/l.length):0;
 const cnt=l=>Object.entries(RK).map(([k,[n,c]])=>({n,c,v:l.filter(h=>h.r===k).length,good:k==='good'||k==='easy'}));
 const days=[...Array(21)].map((_,i)=>{const d=new Date();d.setDate(d.getDate()-20+i);const k=dayKey(d),l=hist.filter(h=>dayKey(h.ts)===k);return{k,l,lab:d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}});
 const mx=Math.max(1,...days.map(d=>d.l.length)),W=640,H=170,bw=W/days.length;
 const bars=days.map((d,i)=>{let y=H;return Object.keys(RK).map(k=>{const v=d.l.filter(h=>h.r===k).length;if(!v)return'';const h=(H-20)*v/mx;y-=h;return `<rect x="${i*bw+3}" y="${y}" width="${bw-6}" height="${h}" fill="${RK[k][1]}"><title>${d.lab} · ${RK[k][0]}: ${v}</title></rect>`}).join('')+(i%3===0?`<text x="${i*bw+bw/2}" y="${H+14}" text-anchor="middle" class="ax">${d.lab}</text>`:'')}).join('');
 const pts=days.map((d,i)=>d.l.length?[i*bw+bw/2,H-(H-20)*acc(d.l)/100,acc(d.l),d.lab]:null).filter(Boolean);
 const line=pts.length?`<polyline points="${pts.map(p=>p[0]+','+p[1]).join(' ')}" fill="none" stroke="#7c3aed" stroke-width="3" stroke-linejoin="round"/>`+pts.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="#7c3aed"><title>${p[3]}: ${p[2]}% de acerto</title></circle>`).join(''):'';
 const grid=[0,50,100].map(v=>`<line x1="0" x2="${W}" y1="${H-(H-20)*v/100}" y2="${H-(H-20)*v/100}" class="gl"/><text x="${W-2}" y="${H-(H-20)*v/100-3}" text-anchor="end" class="ax">${v}%</text>`).join('');
 const wk=l=>acc(l),last7=hist.filter(h=>h.ts>now-7*864e5),prev7=hist.filter(h=>h.ts<=now-7*864e5&&h.ts>now-14*864e5);
 const trend=!last7.length?'Comece a responder para ver sua evolução 💪':!prev7.length?`Nesta semana: <b>${wk(last7)}%</b> de acerto em <b>${last7.length}</b> respostas.`:(wk(last7)>=wk(prev7)?`📈 <b>Evoluindo!</b> Acerto subiu de <b>${wk(prev7)}%</b> para <b>${wk(last7)}%</b> em relação à semana passada.`:`📉 Acerto caiu de <b>${wk(prev7)}%</b> para <b>${wk(last7)}%</b> — revise os temas em vermelho abaixo.`);
 const mats=[...new Set(cards.map(c=>c.mat))].map(m=>{const cm=cards.filter(c=>c.mat===m),seen=cm.filter(c=>c.seen).length,hm=hist.filter(h=>h.mat===m);return{m,tot:cm.length,seen,acc:acc(hm),n:hm.length}}).sort((a,b)=>b.n-a.n||b.tot-a.tot);
 const matRows=mats.map(x=>{const pct=Math.round(100*x.seen/x.tot),col=!x.n?'var(--muted)':x.acc>=80?'#16a34a':x.acc>=60?'#ca8a04':'#dc2626';return `<div class="mrow2"><div class="mname">${esc(x.m)}</div><div class="pbar"><div style="width:${pct}%"></div></div><div class="mnum">${x.seen}/${x.tot}</div><div class="mnum" style="color:${col}">${x.n?x.acc+'%':'–'}</div></div>`}).join('');
 const weak={};hist.slice(-1500).forEach(h=>{if(h.r==='again'||h.r==='hard'){const k=h.mat+' › '+h.tema;weak[k]=(weak[k]||0)+1}});
 $('progArea').innerHTML=`<div class="kpis"><div><b>${hoje.length}</b><span>respondidos hoje</span></div><div><b>${streak()} 🔥</b><span>dias seguidos</span></div><div><b>${hist.length}</b><span>respostas no total</span></div><div><b>${due}</b><span>revisões pendentes</span></div></div>
 <div class="trend">${trend}</div>
 <div class="two"><div><h3>🍕 Desempenho geral</h3>${donut(cnt(hist))}</div><div><h3>🍕 Hoje</h3>${donut(cnt(hoje))}</div></div>
 <h3>📊 Questões por dia (últimos 21 dias)</h3><svg viewBox="0 0 ${W} ${H+20}" class="chart">${bars}</svg>
 <h3>📈 Evolução do % de acerto</h3><svg viewBox="0 0 ${W} ${H+20}" class="chart">${grid}${line}${days.map((d,i)=>i%3===0?`<text x="${i*bw+bw/2}" y="${H+14}" text-anchor="middle" class="ax">${d.lab}</text>`:'').join('')}</svg>
 <p class="a">Acerto = respostas “Bom” ou “Fácil”.</p>
 <h3>📚 Andamento por matéria</h3><div class="mrow2 hdr"><div class="mname">Matéria</div><div>cartões vistos</div><div class="mnum">vistos</div><div class="mnum">acerto</div></div>${matRows}
 <h3>🎯 Temas pra reforçar</h3>${Object.entries(weak).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,n])=>`<div class="mrow"><span>${esc(k)}</span><span style="color:#dc2626">${n} erros</span></div>`).join('')||'<p class="a">Nenhum ainda 👏</p>'}`}
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
fetch('deck.json').then(r=>r.json()).then(d=>{DECK=d;DM=new Map(DECK.map(c=>[c.id,c]));cards=lsLoad();refresh();checkDue();pull()})
 .catch(()=>{cards=lsLoad();refresh();$('status').textContent='não consegui carregar deck.json (abra pelo site, não pelo arquivo)'});

// ===== ❤️ =====
document.getElementById('love').onclick=()=>{const m=document.getElementById('loveMsg');m.classList.add('show');clearTimeout(m._t);m._t=setTimeout(()=>m.classList.remove('show'),2500);
 for(let i=0;i<14;i++){const s=document.createElement('span');s.className='fh';s.textContent=['❤️','💖','💕','💗'][i%4];s.style.left=(10+Math.random()*80)+'vw';s.style.setProperty('--r',(Math.random()*60-30)+'deg');s.style.animationDelay=(Math.random()*.6)+'s';document.body.appendChild(s);setTimeout(()=>s.remove(),3000)}};

// ===== Salvar no servidor (Cloudflare KV) =====
let pushT=null,serverOk=false,dirty=false,fails=0;
const payload=()=>JSON.stringify({v:1,docs:[...docs.values()],hist,ui:UI,at:Date.now()});
function push(){dirty=true;try{localStorage.setItem('fc_dirty','1')}catch(e){}clearTimeout(pushT);pushT=setTimeout(send,2000)}
async function send(){if(!dirty)return;try{const r=await fetch('api/state',{method:'PUT',headers:{'content-type':'application/json'},body:payload(),keepalive:true});if(!r.ok)throw 0;
 dirty=false;fails=0;try{localStorage.removeItem('fc_dirty')}catch(e){}serverOk=true;$('status').textContent='☁️ salvo no site · '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
 catch(e){fails++;$('status').textContent='⚠️ ainda não salvou no site (tentando de novo…) — guardado neste aparelho';clearTimeout(pushT);pushT=setTimeout(send,Math.min(60000,3000*fails))}}
function flush(){if(!dirty)return;try{navigator.sendBeacon('api/state',new Blob([payload()],{type:'application/json'}))}catch(e){}}
window.addEventListener('pagehide',flush);document.addEventListener('visibilitychange',()=>{if(document.hidden)flush()});
window.addEventListener('online',()=>{if(dirty)send()});
window.addEventListener('beforeunload',e=>{if(dirty){flush()}});
async function pull(){try{if(localStorage.getItem('fc_dirty'))dirty=true;const r=await fetch('api/state',{cache:'no-store'});if(!r.ok)throw 0;const j=await r.json();serverOk=true;
 (j.docs||[]).forEach(d=>{const cur=docs.get(d.id);if(!cur||(d.u||0)>=(cur.u||0))docs.set(d.id,d)});
 if(j.ui&&(j.ui.u||0)>(UI.u||0)){UI=j.ui;try{localStorage.setItem('fc_ui',JSON.stringify(UI))}catch(e){}}const seen=new Set(hist.map(h=>h.id+'|'+h.ts));(j.hist||[]).forEach(h=>{if(!seen.has(h.id+'|'+h.ts))hist.push(h)});hist.sort((a,b)=>a.ts-b.ts);
 lsSave();try{localStorage.setItem(HK,JSON.stringify(hist))}catch(e){}cards=fromDocs([...docs.values()]);refresh();checkDue();
 $('status').textContent='☁️ progresso carregado do site';if(dirty)send()}catch(e){$('status').textContent='⚠️ não consegui falar com o site, usando o que está neste aparelho'}}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)pull()});
