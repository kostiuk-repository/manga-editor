// ── STATE ──
let rows=[], selPID=null, selBID=null, PC=0,RC=0,BC=0;
let autoSaveTimer=null;

const TAIL_PTS={
  'bottom-left': {poly:'42,82 16,114 55,85',cover:'34,79 66,79 34,91'},
  'bottom-right':{poly:'58,82 84,114 45,85',cover:'66,79 34,79 66,91'},
  'top-left':    {poly:'42,8 16,-14 55,11', cover:'34,11 66,11 34,1'},
  'top-right':   {poly:'58,8 84,-14 45,11', cover:'66,11 34,11 66,1'},
  'left':        {poly:'4,42 -20,50 4,58',  cover:'7,35 7,65 -1,50'},
  'right':       {poly:'96,42 120,50 96,58',cover:'93,35 93,65 101,50'}
};
const THOUGHT_DOTS={
  'bottom-left': [[42,88],[33,98],[26,106]],
  'bottom-right':[[58,88],[67,98],[74,106]],
  'top-left':    [[42,2],[33,-8],[26,-16]],
  'top-right':   [[58,2],[67,-8],[74,-16]],
  'left':        [[2,44],[-9,44],[-18,44]],
  'right':       [[98,44],[109,44],[118,44]],
  'none':        []
};

const ASSETS=[
  {name:'Speed Lines',file:'assets/speed-lines.png',desc:'Dynamic energy lines'},
  {name:'Dark Gradient',file:'assets/dark-gradient.png',desc:'Bottom darkening for drama'},
  {name:'Gloom Overlay',file:'assets/gloom-overlay.png',desc:'Corner shadows for tension'}
];

function mkPanel(src){return{id:++PC,src,height:450,ox:0,oy:0,scale:100,bubbles:[],overlays:[]};}

// ── UPLOAD ──
function handleFiles(e){
  Array.from(e.target.files).forEach(f=>{
    const r=new FileReader();
    r.onload=ev=>{
      const p=mkPanel(ev.target.result);
      rows.push({id:++RC,type:'single',panels:[p]});
      renderAll();selPanel(p.id);
    };
    r.readAsDataURL(f);
  });
  e.target.value='';
}

// ── RENDER ──
function renderAll(){
  renderSidebar();renderPage();renderAssetLibrary();
  document.getElementById('tinfo').textContent=rows.length?`${rows.length} row(s) · click to select`:'Upload images to start';
}

// ── DRAG-AND-DROP PANEL SORTING ──
let dragRowId=null;

function renderSidebar(){
  const list=document.getElementById('panels-list');
  list.innerHTML='';let gi=0;
  rows.forEach((row,ri)=>{
    row.panels.forEach((p,pi)=>{
      gi++;
      const tag=row.type==='double'?` [${pi===0?'L':'R'}]`:'';
      const d=document.createElement('div');
      d.className='pi'+(p.id===selPID?' sel':'');
      d.setAttribute('draggable','true');
      d.dataset.rowId=row.id;
      d.innerHTML=`<img src="${p.src}"><span class="lbl">P${gi}${tag}</span>
        <div class="mbs">
          <button class="mb" onclick="moveRow(${row.id},-1,event)">↑</button>
          <button class="mb" onclick="moveRow(${row.id},1,event)">↓</button>
        </div>
        <button class="db" onclick="delPanel(${p.id},event)">✕</button>`;
      d.onclick=()=>selPanel(p.id);

      // Drag events for panel sorting
      d.addEventListener('dragstart',e=>{
        dragRowId=row.id;
        d.classList.add('dragging');
        e.dataTransfer.effectAllowed='move';
        e.dataTransfer.setData('text/plain','panel-sort');
      });
      d.addEventListener('dragend',()=>{
        d.classList.remove('dragging');
        dragRowId=null;
        list.querySelectorAll('.pi').forEach(el=>el.classList.remove('drag-over'));
      });
      d.addEventListener('dragover',e=>{
        e.preventDefault();
        const data=e.dataTransfer.types;
        if(dragRowId!==null){
          e.dataTransfer.dropEffect='move';
          d.classList.add('drag-over');
        }
      });
      d.addEventListener('dragleave',()=>{d.classList.remove('drag-over');});
      d.addEventListener('drop',e=>{
        e.preventDefault();
        d.classList.remove('drag-over');
        if(dragRowId===null||dragRowId===row.id)return;
        const fromIdx=rows.findIndex(r=>r.id===dragRowId);
        const toIdx=rows.findIndex(r=>r.id===row.id);
        if(fromIdx<0||toIdx<0)return;
        const [moved]=rows.splice(fromIdx,1);
        rows.splice(toIdx,0,moved);
        renderAll();
      });

      list.appendChild(d);
    });
  });
}

function renderPage(){
  const page=document.getElementById('page-canvas');
  page.innerHTML='';
  rows.forEach((row,i)=>{
    if(i>0){const g=document.createElement('div');g.className='pgap';page.appendChild(g);}
    if(row.type==='double'){
      const re=document.createElement('div');re.className='panel-row';
      row.panels.forEach(p=>{const s=mkPanelEl(p);s.style.flex='1';re.appendChild(s);});
      page.appendChild(re);
    }else{
      const w=document.createElement('div');w.className='panel-row-single';
      w.appendChild(mkPanelEl(row.panels[0]));page.appendChild(w);
    }
  });
}

function mkPanelEl(p){
  const w=document.createElement('div');
  w.className='pp'+(p.id===selPID?' psel':'');
  w.id='panel-el-'+p.id;w.style.height=p.height+'px';
  w.onclick=e=>{e.stopPropagation();selPanel(p.id);};

  // Asset drop target
  w.addEventListener('dragover',e=>{
    if(e.dataTransfer.types.includes('text/asset-file')){
      e.preventDefault();e.dataTransfer.dropEffect='copy';
      w.classList.add('panel-drop-target');
    }
  });
  w.addEventListener('dragleave',()=>w.classList.remove('panel-drop-target'));
  w.addEventListener('drop',e=>{
    w.classList.remove('panel-drop-target');
    const assetFile=e.dataTransfer.getData('text/asset-file');
    if(assetFile){
      e.preventDefault();
      if(!p.overlays)p.overlays=[];
      p.overlays.push({id:Date.now(),file:assetFile});
      renderAll();showPC();
    }
  });

  const iw=document.createElement('div');
  iw.className='pimgw';iw.style.height=p.height+'px';iw.style.overflow='hidden';
  const img=document.createElement('img');
  img.src=p.src;img.style.width=p.scale+'%';
  img.style.transform=`translate(${p.ox}px,${p.oy}px)`;
  iw.appendChild(img);w.appendChild(iw);

  // Render overlay layers (above image, below bubbles)
  if(p.overlays){
    p.overlays.forEach(ov=>{
      const layer=document.createElement('div');
      layer.className='overlay-layer';
      const ovImg=document.createElement('img');
      ovImg.src=ov.file;
      layer.appendChild(ovImg);
      const del=document.createElement('div');
      del.className='overlay-del';del.textContent='✕';
      del.onclick=e=>{e.stopPropagation();removeOverlay(p.id,ov.id);};
      layer.appendChild(del);
      w.appendChild(layer);
    });
  }

  const ov=document.createElement('div');ov.className='pov';w.appendChild(ov);
  p.bubbles.forEach(b=>w.appendChild(mkBubbleEl(b,p)));
  return w;
}

// ── BUBBLE ELEMENT ──
function mkBubbleEl(b,p){
  const el=document.createElement('div');
  el.className='bubble';el.id='bubble-'+b.id;
  el.style.cssText=`left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px`;
  const inner=document.createElement('div');inner.className='binner';

  const NS='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(NS,'svg');
  svg.classList.add('bsvg');svg.setAttribute('viewBox','0 0 100 100');
  svg.setAttribute('preserveAspectRatio','none');

  const fill=b.fillColor||( b.type==='sfx'?'#ffee00':'#ffffff');
  const stroke=b.strokeColor||( b.type==='thought'?'#444':'#000');
  const sw=b.type==='thought'?'3.5':'3';
  const sdash=b.type==='thought'?'5,3':'none';

  const ell=document.createElementNS(NS,'ellipse');
  ell.setAttribute('cx','50');ell.setAttribute('cy','46');
  ell.setAttribute('rx','47');ell.setAttribute('ry','40');
  ell.setAttribute('fill',fill);ell.setAttribute('stroke',stroke);
  ell.setAttribute('stroke-width',sw);
  if(sdash!=='none')ell.setAttribute('stroke-dasharray',sdash);
  svg.appendChild(ell);

  if(b.tail!=='none'){
    if(b.type==='thought'){
      const dots=THOUGHT_DOTS[b.tail]||[];
      dots.forEach(([cx,cy],i)=>{
        const c=document.createElementNS(NS,'circle');
        const r=(4.5-i*1.1).toFixed(1);
        c.setAttribute('cx',cx);c.setAttribute('cy',cy);c.setAttribute('r',r);
        c.setAttribute('fill',fill);c.setAttribute('stroke',stroke);
        c.setAttribute('stroke-width','2.5');c.setAttribute('stroke-dasharray','4,2');
        svg.appendChild(c);
      });
    }else{
      const pts=TAIL_PTS[b.tail];
      if(pts){
        const tail=document.createElementNS(NS,'polygon');
        tail.setAttribute('points',pts.poly);tail.setAttribute('fill',fill);
        tail.setAttribute('stroke',stroke);tail.setAttribute('stroke-width','3');
        tail.setAttribute('stroke-linejoin','round');svg.appendChild(tail);
        const cov=document.createElementNS(NS,'polygon');
        cov.setAttribute('points',pts.cover);cov.setAttribute('fill',fill);
        cov.setAttribute('stroke','none');svg.appendChild(cov);
      }
    }
  }
  inner.appendChild(svg);

  const txt=document.createElement('div');
  txt.className='btext'+(b.type==='sfx'?' sfxt':'');
  txt.style.fontSize=(b.fontSize||13)+'px';
  txt.style.color=b.textColor||'#000000';
  txt.textContent=b.text;
  inner.appendChild(txt);

  const rsz=document.createElement('div');rsz.className='brsz';
  rsz.onmousedown=e=>startResize(e,b,p);inner.appendChild(rsz);

  const del=document.createElement('div');del.className='bdelbtn';del.textContent='✕';
  del.onclick=e=>{e.stopPropagation();delBubble(b.id,p.id);};inner.appendChild(del);

  el.appendChild(inner);
  el.onmousedown=e=>{
    if(e.target===rsz||e.target===del)return;
    e.stopPropagation();selBubble(b.id);startDrag(e,b,p);
  };
  return el;
}

// ── DRAG & RESIZE ──
function startDrag(e,b,p){
  e.preventDefault();
  const pe=document.getElementById('panel-el-'+p.id);
  const rect=pe.getBoundingClientRect();
  const sx=e.clientX-rect.left-b.x,sy=e.clientY-rect.top-b.y;
  const mm=ev=>{
    b.x=Math.max(0,ev.clientX-rect.left-sx);
    b.y=Math.max(0,ev.clientY-rect.top-sy);
    const el=document.getElementById('bubble-'+b.id);
    if(el){el.style.left=b.x+'px';el.style.top=b.y+'px';}
  };
  const mu=()=>{document.removeEventListener('mousemove',mm);document.removeEventListener('mouseup',mu);};
  document.addEventListener('mousemove',mm);document.addEventListener('mouseup',mu);
}

function startResize(e,b,p){
  e.preventDefault();e.stopPropagation();
  const sx=e.clientX,sy=e.clientY,sw0=b.w,sh0=b.h,sf0=b.fontSize||13;
  const mm=ev=>{
    const nw=Math.max(60,sw0+ev.clientX-sx);
    const nh=Math.max(32,sh0+ev.clientY-sy);
    b.w=nw;b.h=nh;
    b.fontSize=Math.max(8,Math.min(48,Math.round(sf0*(nh/sh0))));
    const el=document.getElementById('bubble-'+b.id);
    if(el){el.style.width=nw+'px';el.style.height=nh+'px';
      el.querySelector('.btext').style.fontSize=b.fontSize+'px';}
  };
  const mu=()=>{
    document.removeEventListener('mousemove',mm);document.removeEventListener('mouseup',mu);
    if(selBID===b.id){document.getElementById('bfs').value=b.fontSize;document.getElementById('fsv').textContent=b.fontSize;}
    renderAll();showPC();
  };
  document.addEventListener('mousemove',mm);document.addEventListener('mouseup',mu);
}

// ── SELECT ──
function selPanel(id){selPID=id;selBID=null;renderAll();showPC();}
function selBubble(id){selBID=id;showBE();renderBList(getPanel(selPID));}

function showPC(){
  const p=getPanel(selPID);if(!p)return;
  document.getElementById('pc').style.display='flex';
  document.getElementById('ph').value=p.height;
  document.getElementById('oy').value=p.oy;
  document.getElementById('ox').value=p.ox;
  document.getElementById('sc').value=p.scale;
  renderBList(p);
  renderOverlayList(p);
  if(!selBID)document.getElementById('be').style.display='none';
}

function renderBList(p){
  if(!p)return;
  const list=document.getElementById('blist');list.innerHTML='';
  p.bubbles.forEach(b=>{
    const d=document.createElement('div');
    d.className='bi'+(b.id===selBID?' sel':'');
    const fc=b.fillColor||(b.type==='sfx'?'#ffee00':'#fff');
    d.innerHTML=`<div class="bdot" style="background:${fc};border:1px solid #555"></div>
      <span>${b.type.toUpperCase()}: "${b.text.slice(0,14)}${b.text.length>14?'…':''}"</span>`;
    d.onclick=()=>{selBubble(b.id);renderBList(p);};
    list.appendChild(d);
  });
}

function renderOverlayList(p){
  const container=document.getElementById('overlay-list');
  if(!container)return;
  container.innerHTML='';
  if(!p||!p.overlays||p.overlays.length===0){
    container.innerHTML='<div style="font-size:10px;color:#555">No overlays. Drag assets here.</div>';
    return;
  }
  p.overlays.forEach((ov,idx)=>{
    const d=document.createElement('div');
    d.className='bi';d.style.cursor='grab';d.draggable=true;
    const name=ov.file.split('/').pop().replace('.png','');
    d.innerHTML=`<span style="flex:1;color:#ccc">${idx+1}. ${name}</span>`;
    const del=document.createElement('button');
    del.className='db';del.textContent='✕';del.style.marginLeft='4px';
    del.onclick=e=>{e.stopPropagation();removeOverlay(p.id,ov.id);};
    d.appendChild(del);

    // Reorder overlays via drag
    d.addEventListener('dragstart',e=>{
      e.dataTransfer.setData('text/overlay-idx',String(idx));
      e.dataTransfer.effectAllowed='move';
    });
    d.addEventListener('dragover',e=>{
      if(e.dataTransfer.types.includes('text/overlay-idx')){
        e.preventDefault();e.dataTransfer.dropEffect='move';
        d.style.borderColor='#0ff';
      }
    });
    d.addEventListener('dragleave',()=>{d.style.borderColor='#333';});
    d.addEventListener('drop',e=>{
      d.style.borderColor='#333';
      const fromIdx=parseInt(e.dataTransfer.getData('text/overlay-idx'));
      if(isNaN(fromIdx)||fromIdx===idx)return;
      const [moved]=p.overlays.splice(fromIdx,1);
      p.overlays.splice(idx,0,moved);
      renderAll();showPC();
    });

    container.appendChild(d);
  });
}

function removeOverlay(pid,ovId){
  const p=getPanel(pid);if(!p||!p.overlays)return;
  p.overlays=p.overlays.filter(o=>o.id!==ovId);
  renderAll();showPC();
}

function showBE(){
  const b=getSelBubble();if(!b)return;
  document.getElementById('be').style.display='block';
  document.getElementById('bt').value=b.text;
  document.getElementById('bfs').value=b.fontSize||13;
  document.getElementById('fsv').textContent=b.fontSize||13;
  document.getElementById('btail').value=b.tail||'bottom-left';
  document.getElementById('bfill').value=b.fillColor||(b.type==='sfx'?'#ffee00':'#ffffff');
  document.getElementById('btcol').value=b.textColor||'#000000';
  document.getElementById('bstroke').value=b.strokeColor||'#000000';
}

// ── UPDATE ──
function upH(){const p=getPanel(selPID);if(p){p.height=parseInt(document.getElementById('ph').value);renderAll();}}
function upOY(){const p=getPanel(selPID);if(p){p.oy=parseInt(document.getElementById('oy').value);renderAll();}}
function upOX(){const p=getPanel(selPID);if(p){p.ox=parseInt(document.getElementById('ox').value);renderAll();}}
function upSC(){const p=getPanel(selPID);if(p){p.scale=parseInt(document.getElementById('sc').value);renderAll();}}
function upBT(){const b=getSelBubble();if(!b)return;b.text=document.getElementById('bt').value;const el=document.getElementById('bubble-'+b.id);if(el)el.querySelector('.btext').textContent=b.text;renderBList(getPanel(selPID));}
function upBFS(){const b=getSelBubble();if(!b)return;b.fontSize=parseInt(document.getElementById('bfs').value);document.getElementById('fsv').textContent=b.fontSize;const el=document.getElementById('bubble-'+b.id);if(el)el.querySelector('.btext').style.fontSize=b.fontSize+'px';}
function upBTail(){const b=getSelBubble();if(!b)return;b.tail=document.getElementById('btail').value;renderAll();showPC();}
function upBColors(){
  const b=getSelBubble();if(!b)return;
  b.fillColor=document.getElementById('bfill').value;
  b.textColor=document.getElementById('btcol').value;
  b.strokeColor=document.getElementById('bstroke').value;
  renderAll();showPC();
}

// ── JSON IMPORT ──
function getAllPanelsOrdered(){
  const result=[];
  rows.forEach(row=>row.panels.forEach(p=>result.push(p)));
  return result;
}

function getPanelPixelWidth(pid){
  const{row}=findRow(pid);
  if(!row)return 800;
  return row.type==='double'?396:800;
}

function placeBubbles(panel, bubbles){
  const panelW=getPanelPixelWidth(panel.id);
  const panelH=panel.height;
  const BW=Math.min(180,Math.floor(panelW*0.38));
  const BH=80;
  const PAD=16;
  const cols=Math.max(1,Math.floor((panelW-PAD)/(BW+PAD)));

  bubbles.forEach((b,i)=>{
    const col=i%cols;
    const row=Math.floor(i/cols);
    b.x=PAD+col*(BW+PAD);
    b.y=PAD+row*(BH+PAD);
    b.w=BW;
    b.h=BH;
    if(b.x+b.w>panelW-PAD) b.x=Math.max(PAD,panelW-b.w-PAD);
    if(b.y+b.h>panelH-PAD) b.y=Math.max(PAD,panelH-b.h-PAD);
  });
}

function importJSON(){
  const raw=document.getElementById('json-input').value.trim();
  const err=document.getElementById('json-err');
  err.style.display='none';
  let arr;
  try{arr=JSON.parse(raw);}
  catch(e){err.textContent='Invalid JSON: '+e.message;err.style.display='block';return;}
  if(!Array.isArray(arr)){err.textContent='JSON must be an array []';err.style.display='block';return;}

  const allPanels=getAllPanelsOrdered();
  if(allPanels.length===0){err.textContent='No panels on page yet!';err.style.display='block';return;}

  const groups={};
  arr.forEach((obj,i)=>{
    let pi=obj.panelIndex;
    if(pi===undefined||pi===null){
      const selIdx=allPanels.findIndex(p=>p.id===selPID);
      pi=selIdx>=0?selIdx:0;
    }
    pi=Math.max(0,Math.min(pi,allPanels.length-1));
    if(!groups[pi])groups[pi]=[];
    groups[pi].push(obj);
  });

  Object.entries(groups).forEach(([piStr,objs])=>{
    const pi=parseInt(piStr);
    const panel=allPanels[pi];
    const newBubbles=objs.map(obj=>{
      const type=obj.type||'speech';
      return{
        id:++BC,type,
        text:obj.text||'...',
        x:0,y:0,w:160,h:80,
        fontSize:obj.fontSize||(type==='sfx'?22:13),
        tail:obj.tail||(type==='sfx'?'none':'bottom-left'),
        fillColor:obj.fillColor||(type==='sfx'?'#ffee00':'#ffffff'),
        textColor:obj.textColor||'#000000',
        strokeColor:obj.strokeColor||(type==='thought'?'#444444':'#000000')
      };
    });
    placeBubbles(panel,newBubbles);
    panel.bubbles.push(...newBubbles);
  });

  renderAll();
  const firstPi=parseInt(Object.keys(groups)[0]);
  selPanel(allPanels[firstPi].id);
  err.style.display='none';
}

// ── ROW OPS ──
function mergeRow(){
  if(!selPID)return;
  const{row}=findRow(selPID);if(!row)return;
  if(row.type==='double'){alert('Already a double row. Split first.');return;}
  const ri=rows.indexOf(row);
  if(ri>=rows.length-1){alert('No next panel.');return;}
  const next=rows[ri+1];
  if(next.type==='double'){alert('Next is already a double row.');return;}
  const p1=row.panels[0],p2=next.panels[0];
  const h=Math.round((p1.height+p2.height)/2);
  p1.height=h;p2.height=h;
  rows.splice(ri,2,{id:++RC,type:'double',panels:[p1,p2]});
  renderAll();selPanel(p1.id);
}

function splitRow(){
  if(!selPID)return;
  const{row}=findRow(selPID);
  if(!row||row.type!=='double'){alert('Not a double row.');return;}
  const ri=rows.indexOf(row);
  const[p1,p2]=row.panels;
  rows.splice(ri,1,{id:++RC,type:'single',panels:[p1]},{id:++RC,type:'single',panels:[p2]});
  renderAll();selPanel(p1.id);
}

function swapRow(){
  if(!selPID)return;
  const{row}=findRow(selPID);
  if(!row||row.type!=='double'){alert('Select a panel inside a double row.');return;}
  row.panels=[row.panels[1],row.panels[0]];
  renderAll();showPC();
}

function delPanel(id,e){
  e&&e.stopPropagation();
  const{row}=findRow(id);if(!row)return;
  const ri=rows.indexOf(row);
  if(row.type==='double'){
    const rem=row.panels.find(p=>p.id!==id);
    rows.splice(ri,1,{id:++RC,type:'single',panels:[rem]});
  }else{rows.splice(ri,1);}
  if(selPID===id){selPID=null;selBID=null;document.getElementById('pc').style.display='none';}
  renderAll();
}

function delBubble(bid,pid){
  const p=getPanel(pid);if(!p)return;
  p.bubbles=p.bubbles.filter(b=>b.id!==bid);
  if(selBID===bid){selBID=null;document.getElementById('be').style.display='none';}
  renderAll();showPC();
}
function delSelBubble(){if(selBID&&selPID)delBubble(selBID,selPID);}

function addBubble(type){
  if(!selPID)return;
  const p=getPanel(selPID);
  const b={id:++BC,type,text:type==='sfx'?'BOOM!':type==='thought'?'...':'Hello!',
    x:60,y:40,w:160,h:80,fontSize:type==='sfx'?22:13,
    tail:type==='sfx'?'none':'bottom-left',
    fillColor:type==='sfx'?'#ffee00':'#ffffff',
    textColor:'#000000',strokeColor:type==='thought'?'#444444':'#000000'};
  p.bubbles.push(b);renderAll();selBubble(b.id);showPC();
}

function moveRow(rowId,dir,e){
  e&&e.stopPropagation();
  const i=rows.findIndex(r=>r.id===rowId);if(i<0)return;
  const ni=i+dir;if(ni<0||ni>=rows.length)return;
  [rows[i],rows[ni]]=[rows[ni],rows[i]];renderAll();
}

// ── HELPERS ──
function getPanel(id){for(const r of rows)for(const p of r.panels)if(p.id===id)return p;return null;}
function findRow(pid){for(const row of rows){const idx=row.panels.findIndex(p=>p.id===pid);if(idx>=0)return{row,idx};}return{row:null,idx:-1};}
function getSelBubble(){if(!selPID||!selBID)return null;return getPanel(selPID)?.bubbles.find(b=>b.id===selBID)||null;}

// ── ASSET LIBRARY ──
function renderAssetLibrary(){
  const container=document.getElementById('asset-items');
  if(!container)return;
  container.innerHTML='';
  ASSETS.forEach(asset=>{
    const d=document.createElement('div');
    d.className='asset-item';d.draggable=true;
    d.innerHTML=`<img src="${asset.file}" alt="${asset.name}"><span class="asset-name">${asset.name}<br><small style="color:#666">${asset.desc}</small></span>`;
    d.addEventListener('dragstart',e=>{
      e.dataTransfer.setData('text/asset-file',asset.file);
      e.dataTransfer.effectAllowed='copy';
    });
    container.appendChild(d);
  });
}

// ── BUBBLE PRESETS ──
function loadPresets(){
  try{return JSON.parse(localStorage.getItem('mangaEditorPresets'))||[];}
  catch(e){return[];}
}
function savePresets(presets){
  localStorage.setItem('mangaEditorPresets',JSON.stringify(presets));
}

function renderPresets(){
  const list=document.getElementById('preset-list');
  if(!list)return;
  const presets=loadPresets();
  list.innerHTML='';
  if(presets.length===0){
    list.innerHTML='<div style="font-size:10px;color:#555">No presets saved yet.</div>';
    return;
  }
  presets.forEach((pr,i)=>{
    const d=document.createElement('div');
    d.className='preset-item';
    d.innerHTML=`<div class="bdot" style="background:${pr.fillColor};border:1px solid #555"></div>
      <span class="preset-name">${pr.name}</span>`;
    const apply=document.createElement('button');
    apply.className='btn bb';apply.textContent='Apply';apply.style.fontSize='9px';apply.style.padding='2px 5px';
    apply.onclick=e=>{e.stopPropagation();applyPreset(pr);};
    const del=document.createElement('button');
    del.className='preset-del';del.textContent='✕';
    del.onclick=e=>{e.stopPropagation();deletePreset(i);};
    d.appendChild(apply);d.appendChild(del);
    list.appendChild(d);
  });
}

function saveCurrentAsPreset(){
  const b=getSelBubble();
  if(!b){alert('Select a bubble first to save its style as a preset.');return;}
  const name=prompt('Preset name:');
  if(!name||!name.trim())return;
  const presets=loadPresets();
  presets.push({
    name:name.trim(),
    fontSize:b.fontSize||13,
    tail:b.tail||'bottom-left',
    fillColor:b.fillColor||'#ffffff',
    textColor:b.textColor||'#000000',
    strokeColor:b.strokeColor||'#000000'
  });
  savePresets(presets);
  renderPresets();
}

function applyPreset(pr){
  const b=getSelBubble();
  if(!b){alert('Select a bubble first to apply preset.');return;}
  b.fontSize=pr.fontSize;
  b.tail=pr.tail;
  b.fillColor=pr.fillColor;
  b.textColor=pr.textColor;
  b.strokeColor=pr.strokeColor;
  renderAll();showPC();showBE();
}

function deletePreset(idx){
  const presets=loadPresets();
  presets.splice(idx,1);
  savePresets(presets);
  renderPresets();
}

// ── AUTO-SAVE ──
function autoSave(){
  try{
    const state={
      rows:rows.map(r=>({
        id:r.id,type:r.type,
        panels:r.panels.map(p=>({
          id:p.id,src:p.src,height:p.height,ox:p.ox,oy:p.oy,scale:p.scale,
          bubbles:p.bubbles.map(b=>({...b})),
          overlays:(p.overlays||[]).map(o=>({...o}))
        }))
      })),
      selPID,selBID,PC,RC,BC
    };
    localStorage.setItem('mangaEditorState',JSON.stringify(state));
    const el=document.getElementById('autosave-status');
    if(el){el.textContent='Auto-saved '+new Date().toLocaleTimeString();el.className='saved';}
  }catch(e){
    const el=document.getElementById('autosave-status');
    if(el){el.textContent='Auto-save failed';el.className='';}
  }
}

function restoreState(){
  try{
    const raw=localStorage.getItem('mangaEditorState');
    if(!raw)return false;
    const state=JSON.parse(raw);
    rows=state.rows||[];
    selPID=state.selPID||null;
    selBID=state.selBID||null;
    PC=state.PC||0;
    RC=state.RC||0;
    BC=state.BC||0;
    // Ensure overlays array exists on all panels
    rows.forEach(r=>r.panels.forEach(p=>{if(!p.overlays)p.overlays=[];}));
    return true;
  }catch(e){return false;}
}

function clearAll(){
  if(!confirm('Clear all panels and reset the editor?'))return;
  rows=[];selPID=null;selBID=null;PC=0;RC=0;BC=0;
  localStorage.removeItem('mangaEditorState');
  document.getElementById('pc').style.display='none';
  renderAll();
  const el=document.getElementById('autosave-status');
  if(el){el.textContent='Cleared';el.className='';}
}

function startAutoSave(){
  if(autoSaveTimer)clearInterval(autoSaveTimer);
  autoSaveTimer=setInterval(autoSave,10000);
}

// ── EXPORT — pure Canvas API, no html2canvas ──
async function exportPage(){
  const GAP=6, PAGE_W=800;

  let totalH=0;
  rows.forEach((row,i)=>{
    if(i>0)totalH+=GAP;
    totalH+=Math.max(...row.panels.map(p=>p.height));
  });

  const canvas=document.createElement('canvas');
  canvas.width=PAGE_W; canvas.height=totalH;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#000'; ctx.fillRect(0,0,PAGE_W,totalH);

  const imgCache={};
  const loadImg=src=>new Promise(res=>{
    if(imgCache[src]){res(imgCache[src]);return;}
    const img=new Image();
    img.onload=()=>{imgCache[src]=img;res(img);};
    img.onerror=()=>res(null); img.src=src;
  });
  const allP=[];rows.forEach(r=>r.panels.forEach(p=>allP.push(p)));
  await Promise.all(allP.map(p=>loadImg(p.src)));
  // Also preload overlay images
  const overlayFiles=new Set();
  allP.forEach(p=>(p.overlays||[]).forEach(o=>overlayFiles.add(o.file)));
  await Promise.all([...overlayFiles].map(f=>loadImg(f)));

  let curY=0;
  for(let ri=0;ri<rows.length;ri++){
    if(ri>0)curY+=GAP;
    const row=rows[ri];
    const rowH=Math.max(...row.panels.map(p=>p.height));
    if(row.type==='double'){
      const sw=Math.floor((PAGE_W-GAP)/2);
      await drawPanel(ctx,row.panels[0],0,curY,sw,rowH,imgCache);
      await drawPanel(ctx,row.panels[1],sw+GAP,curY,sw,rowH,imgCache);
    }else{
      await drawPanel(ctx,row.panels[0],0,curY,PAGE_W,rowH,imgCache);
    }
    curY+=rowH;
  }

  const a=document.createElement('a');
  a.download='manhwa-page.png';
  a.href=canvas.toDataURL('image/png',1.0);
  document.body.appendChild(a);a.click();document.body.removeChild(a);
}

async function drawPanel(ctx,p,px,py,pw,ph,imgCache){
  ctx.save();
  ctx.beginPath();ctx.rect(px,py,pw,ph);ctx.clip();

  ctx.fillStyle='#111';ctx.fillRect(px,py,pw,ph);

  const img=imgCache[p.src];
  if(img){
    const iw=Math.round(img.naturalWidth*(p.scale/100));
    const ih=Math.round(img.naturalHeight*(p.scale/100));
    ctx.drawImage(img, px+p.ox, py+p.oy, iw, ih);
  }

  // Draw overlays
  if(p.overlays){
    for(const ov of p.overlays){
      const ovImg=imgCache[ov.file];
      if(ovImg){
        ctx.globalAlpha=0.5;
        ctx.drawImage(ovImg,px,py,pw,ph);
        ctx.globalAlpha=1.0;
      }
    }
  }

  ctx.strokeStyle='#000';ctx.lineWidth=3;
  ctx.strokeRect(px,py,pw,ph);

  ctx.restore();

  p.bubbles.forEach(b=>{
    ctx.save();
    ctx.beginPath();ctx.rect(px,py,pw,ph);ctx.clip();
    drawBubble(ctx,b,px,py);
    ctx.restore();
  });
}

function drawBubble(ctx,b,ox,oy){
  const x=ox+b.x, y=oy+b.y, w=b.w, h=b.h;
  const fill=b.fillColor||(b.type==='sfx'?'#ffee00':'#ffffff');
  const stroke=b.strokeColor||(b.type==='thought'?'#444':'#000');
  const isDotted=b.type==='thought';

  ctx.save();

  const cx=x+w/2, cy=y+h*0.46;
  const rx=w*0.47, ry=h*0.40;

  if(b.tail!=='none'){
    if(isDotted){
      const dots=getThoughtDots(b.tail,x,y,w,h);
      dots.forEach(([dx,dy,dr])=>{
        ctx.beginPath();ctx.arc(dx,dy,dr,0,Math.PI*2);
        ctx.fillStyle=fill;ctx.fill();
        ctx.setLineDash([3,2]);ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();
        ctx.setLineDash([]);
      });
    }else{
      const tp=getTailPolyCanvas(b.tail,x,y,w,h);
      if(tp){
        ctx.beginPath();ctx.moveTo(tp[0][0],tp[0][1]);
        tp.forEach(pt=>ctx.lineTo(pt[0],pt[1]));
        ctx.closePath();ctx.fillStyle=fill;ctx.fill();
        ctx.strokeStyle=stroke;ctx.lineWidth=2.5;ctx.stroke();
      }
    }
  }

  ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);
  ctx.fillStyle=fill;ctx.fill();
  if(isDotted){ctx.setLineDash([6,4]);ctx.lineWidth=2.5;}
  else{ctx.setLineDash([]);ctx.lineWidth=2.5;}
  ctx.strokeStyle=stroke;ctx.stroke();
  ctx.setLineDash([]);

  const fs=b.fontSize||13;
  ctx.font=`bold ${fs}px "Comic Neue", "Comic Sans MS", cursive`;
  ctx.fillStyle=b.textColor||'#000';
  ctx.textAlign='center';ctx.textBaseline='middle';

  const maxW=w*0.82;
  const lines=wrapText(ctx,b.text,maxW);
  const lh=fs*1.3;
  const totalTH=lines.length*lh;
  lines.forEach((line,i)=>{
    const ly=cy - totalTH/2 + lh*0.5 + i*lh;
    ctx.fillText(line,cx,ly);
  });

  ctx.restore();
}

function wrapText(ctx,text,maxW){
  const words=text.split(' ');
  const lines=[];let cur='';
  words.forEach(w=>{
    const test=cur?cur+' '+w:w;
    if(ctx.measureText(test).width>maxW&&cur){lines.push(cur);cur=w;}
    else cur=test;
  });
  if(cur)lines.push(cur);
  return lines.length?lines:[''];
}

function getTailPolyCanvas(tail,x,y,w,h){
  const cx=x+w/2, cy=y+h*0.46;
  const rx=w*0.47;
  const pts={
    'bottom-left': [[cx-w*0.08,cy+h*0.36],[x+w*0.05,y+h*1.12],[cx+w*0.06,cy+h*0.38]],
    'bottom-right':[[cx+w*0.08,cy+h*0.36],[x+w*0.95,y+h*1.12],[cx-w*0.06,cy+h*0.38]],
    'top-left':    [[cx-w*0.08,cy-h*0.36],[x+w*0.05,y-h*0.12],[cx+w*0.06,cy-h*0.38]],
    'top-right':   [[cx+w*0.08,cy-h*0.36],[x+w*0.95,y-h*0.12],[cx-w*0.06,cy-h*0.38]],
    'left':        [[cx-rx*0.92,cy-h*0.08],[x-w*0.18,cy],[cx-rx*0.92,cy+h*0.08]],
    'right':       [[cx+rx*0.92,cy-h*0.08],[x+w*1.18,cy],[cx+rx*0.92,cy+h*0.08]]
  };
  return pts[tail]||null;
}

function getThoughtDots(tail,x,y,w,h){
  const cx=x+w/2,cy=y+h*0.46;
  const sets={
    'bottom-left': [[cx-w*0.08,cy+h*0.45,4],[cx-w*0.18,cy+h*0.62,3],[cx-w*0.26,cy+h*0.78,2.2]],
    'bottom-right':[[cx+w*0.08,cy+h*0.45,4],[cx+w*0.18,cy+h*0.62,3],[cx+w*0.26,cy+h*0.78,2.2]],
    'top-left':    [[cx-w*0.08,cy-h*0.45,4],[cx-w*0.18,cy-h*0.62,3],[cx-w*0.26,cy-h*0.78,2.2]],
    'top-right':   [[cx+w*0.08,cy-h*0.45,4],[cx+w*0.18,cy-h*0.62,3],[cx+w*0.26,cy-h*0.78,2.2]],
    'left':        [[cx-w*0.55,cy,4],[cx-w*0.68,cy,3],[cx-w*0.80,cy,2.2]],
    'right':       [[cx+w*0.55,cy,4],[cx+w*0.68,cy,3],[cx+w*0.80,cy,2.2]],
    'none':[]
  };
  return sets[tail]||sets['bottom-left'];
}

// ── INIT ──
document.addEventListener('DOMContentLoaded',()=>{
  const restored=restoreState();
  if(restored){
    renderAll();
    if(selPID)showPC();
  }
  renderPresets();
  renderAssetLibrary();
  startAutoSave();
});
