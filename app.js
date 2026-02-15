// ── STATE ──
let rows=[], selPID=null, selBID=null, PC=0,RC=0,BC=0;
let autoSaveTimer=null, autoSaveTs=null, autoSaveTick=null;

const ASSETS=[
  {name:'Speed Lines',file:'assets/speed-lines.png',desc:'Dynamic energy lines'},
  {name:'Dark Gradient',file:'assets/dark-gradient.png',desc:'Bottom darkening for drama'},
  {name:'Gloom Overlay',file:'assets/gloom-overlay.png',desc:'Corner shadows for tension'},
  {name:'Halftone',file:'assets/halftone.png',desc:'Manga-style dot pattern'},
  {name:'Rain Overlay',file:'assets/rain-overlay.png',desc:'Diagonal rain streaks'},
  {name:'Impact Burst',file:'assets/impact-burst.png',desc:'Radial action lines'},
  {name:'Dust Particles',file:'assets/dust-particles.png',desc:'Floating debris/atmosphere'},
  {name:'Screen Tone Light',file:'assets/screen-tone-light.png',desc:'Classic screentone (light)'},
  {name:'Screen Tone Dark',file:'assets/screen-tone-dark.png',desc:'Classic screentone (dark)'},
  {name:'Vignette',file:'assets/vignette.png',desc:'Soft edge darkening'},
  {name:'Crack Overlay',file:'assets/crack-overlay.png',desc:'Cracked glass effect'}
];

const GROUP_LAYOUTS={
  'left-right':{cols:'1fr 1fr',rows:'1fr',positions:[{col:'1',row:'1'},{col:'2',row:'1'}],label:'Left | Right',count:2},
  'large-left-2right':{cols:'3fr 2fr',rows:'1fr 1fr',positions:[{col:'1',row:'1 / -1'},{col:'2',row:'1'},{col:'2',row:'2'}],label:'Large L + 2 R',count:3},
  '2left-large-right':{cols:'2fr 3fr',rows:'1fr 1fr',positions:[{col:'1',row:'1'},{col:'1',row:'2'},{col:'2',row:'1 / -1'}],label:'2 L + Large R',count:3},
  '2x2':{cols:'1fr 1fr',rows:'1fr 1fr',positions:[{col:'1',row:'1'},{col:'2',row:'1'},{col:'1',row:'2'},{col:'2',row:'2'}],label:'2×2 Grid',count:4},
  '1left-3right':{cols:'1fr 1fr',rows:'1fr 1fr 1fr',positions:[{col:'1',row:'1 / -1'},{col:'2',row:'1'},{col:'2',row:'2'},{col:'2',row:'3'}],label:'1 L + 3 R',count:4},
  '3left-1right':{cols:'1fr 1fr',rows:'1fr 1fr 1fr',positions:[{col:'1',row:'1'},{col:'1',row:'2'},{col:'1',row:'3'},{col:'2',row:'1 / -1'}],label:'3 L + 1 R',count:4}
};

function mkPanel(src){return{id:++PC,src,height:450,ox:0,oy:0,scale:100,bubbles:[],overlays:[]};}

function getExpectedPanelWidth(pid){
  const{row,idx}=findRow(pid);
  if(!row)return 800;
  if(row.type==='single')return 800;
  if(row.type==='double')return 396;
  if(row.type==='group'){
    const ldef=GROUP_LAYOUTS[row.layout];
    if(!ldef||idx>=ldef.positions.length)return 800;
    const cols=ldef.cols.split(' ');
    const totalFr=cols.reduce((s,c)=>s+parseFloat(c),0);
    const colPart=ldef.positions[idx].col.split(' / ')[0];
    const colIdx=parseInt(colPart)-1;
    const colFr=parseFloat(cols[Math.min(colIdx,cols.length-1)]);
    return Math.round((800-4*(cols.length-1))*colFr/totalFr);
  }
  return 800;
}

// ── UPLOAD ──
function handleFiles(e){
  Array.from(e.target.files).forEach(f=>{
    const r=new FileReader();
    r.onload=ev=>{
      const p=mkPanel(ev.target.result);
      rows.push({id:++RC,type:'single',panels:[p]});
      HistoryLog.add('panel-added','Panel '+p.id+' added');
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
      const tag=row.type==='double'?` [${pi===0?'L':'R'}]`:(row.type==='group'?` [G${pi+1}]`:'');
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
    if(row.type==='group'){
      const ldef=GROUP_LAYOUTS[row.layout];
      if(!ldef){return;}
      const ge=document.createElement('div');
      ge.className='panel-group';
      ge.style.display='grid';
      ge.style.gridTemplateColumns=ldef.cols;
      ge.style.gridTemplateRows=ldef.rows;
      ge.style.gap='4px';ge.style.width='100%';
      ge.style.border='2px solid #555';ge.style.borderRadius='4px';ge.style.padding='2px';
      row.panels.forEach((p,pi)=>{
        if(pi>=ldef.positions.length)return;
        const pos=ldef.positions[pi];
        const s=mkPanelEl(p);
        s.style.gridColumn=pos.col;s.style.gridRow=pos.row;
        ge.appendChild(s);
      });
      // Ungroup button
      const ub=document.createElement('button');
      ub.className='btn bd';ub.style.cssText='width:100%;margin-top:2px;font-size:10px';
      ub.textContent='⊟ Ungroup';
      ub.onclick=function(e){e.stopPropagation();ungroupRow(row.id);};
      ge.appendChild(ub);
      page.appendChild(ge);
    }else if(row.type==='double'){
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
  const panelW=getExpectedPanelWidth(p.id);
  const panelH=p.height;
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
      Layers.addOverlay(p,assetFile);
      HistoryLog.add('asset-added','Overlay added to panel '+p.id);
      renderAll();showPC();
    }
  });

  const iw=document.createElement('div');
  iw.className='pimgw';iw.style.height=p.height+'px';iw.style.overflow='hidden';
  const img=document.createElement('img');
  img.src=p.src;img.style.width=p.scale+'%';
  img.style.transform=`translate(${p.ox}px,${p.oy}px)`;
  iw.appendChild(img);w.appendChild(iw);

  // Render overlay layers (above image, below bubbles) using Layers module
  Layers.renderOverlays(w,p,function(pid,ovId){removeOverlay(pid,ovId);});

  const ov=document.createElement('div');ov.className='pov';w.appendChild(ov);
  p.bubbles.forEach(b=>w.appendChild(mkBubbleEl(b,p,panelW,panelH)));
  return w;
}

// ── BUBBLE ELEMENT ──
function mkBubbleEl(b,p,panelW,panelH){
  // Convert percentage to pixels for rendering
  const bx=(b.xPct||0)*panelW/100;
  const by=(b.yPct||0)*panelH/100;
  const bw=(b.wPct||20)*panelW/100;
  const bh=(b.hPct||18)*panelH/100;
  // Cache pixel values for export
  b._px=bx;b._py=by;b._pw=bw;b._ph=bh;

  const el=document.createElement('div');
  el.className='bubble';el.id='bubble-'+b.id;
  el.style.cssText=`left:${bx}px;top:${by}px;width:${bw}px;height:${bh}px`;
  const inner=document.createElement('div');inner.className='binner';

  // Use BubbleShapes module for SVG
  const svg=BubbleShapes.createSVG(b);
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

// ── DRAG & RESIZE (using percentages) ──
function startDrag(e,b,p){
  e.preventDefault();
  const pe=document.getElementById('panel-el-'+p.id);
  const rect=pe.getBoundingClientRect();
  const pw=rect.width,ph=rect.height;
  const bxPx=(b.xPct||0)*pw/100, byPx=(b.yPct||0)*ph/100;
  const sx=e.clientX-rect.left-bxPx, sy=e.clientY-rect.top-byPx;
  const mm=ev=>{
    const nx=Math.max(0,ev.clientX-rect.left-sx);
    const ny=Math.max(0,ev.clientY-rect.top-sy);
    b.xPct=nx/pw*100;
    b.yPct=ny/ph*100;
    const el=document.getElementById('bubble-'+b.id);
    if(el){el.style.left=nx+'px';el.style.top=ny+'px';}
  };
  const mu=()=>{document.removeEventListener('mousemove',mm);document.removeEventListener('mouseup',mu);};
  document.addEventListener('mousemove',mm);document.addEventListener('mouseup',mu);
}

function startResize(e,b,p){
  e.preventDefault();e.stopPropagation();
  const pe=document.getElementById('panel-el-'+p.id);
  const rect=pe.getBoundingClientRect();
  const pw=rect.width,ph=rect.height;
  const sx=e.clientX,sy=e.clientY;
  const sw0=(b.wPct||20)*pw/100, sh0=(b.hPct||18)*ph/100;
  const sf0=b.fontSize||13;
  const mm=ev=>{
    const nw=Math.max(60,sw0+ev.clientX-sx);
    const nh=Math.max(32,sh0+ev.clientY-sy);
    b.wPct=nw/pw*100;
    b.hPct=nh/ph*100;
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
  Layers.renderOverlayList(container,p,
    function(pid,ovId){removeOverlay(pid,ovId);},
    function(pid,fromIdx,toIdx){
      const pp=getPanel(pid);if(pp)Layers.reorderOverlay(pp,fromIdx,toIdx);
      renderAll();showPC();
    },
    function(pid,ovId,val){
      const pp=getPanel(pid);if(pp)Layers.setOpacity(pp,ovId,val);
      renderAll();
    }
  );
}

function removeOverlay(pid,ovId){
  const p=getPanel(pid);if(!p)return;
  Layers.removeOverlay(p,ovId);
  HistoryLog.add('asset-removed','Overlay removed from panel '+pid);
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
  const shapeEl=document.getElementById('bshape');
  if(shapeEl)shapeEl.value=b.shape||'oval';
  const bsEl=document.getElementById('bborderstyle');
  if(bsEl)bsEl.value=b.borderStyle||'solid';
}

// ── UPDATE ──
function upH(){const p=getPanel(selPID);if(p){p.height=parseInt(document.getElementById('ph').value);renderAll();}}
function upOY(){const p=getPanel(selPID);if(p){p.oy=parseInt(document.getElementById('oy').value);renderAll();}}
function upOX(){const p=getPanel(selPID);if(p){p.ox=parseInt(document.getElementById('ox').value);renderAll();}}
function upSC(){const p=getPanel(selPID);if(p){p.scale=parseInt(document.getElementById('sc').value);renderAll();}}
function upBT(){const b=getSelBubble();if(!b)return;b.text=document.getElementById('bt').value;const el=document.getElementById('bubble-'+b.id);if(el)el.querySelector('.btext').textContent=b.text;renderBList(getPanel(selPID));}
function upBFS(){const b=getSelBubble();if(!b)return;b.fontSize=parseInt(document.getElementById('bfs').value);document.getElementById('fsv').textContent=b.fontSize;const el=document.getElementById('bubble-'+b.id);if(el)el.querySelector('.btext').style.fontSize=b.fontSize+'px';}
function upBTail(){const b=getSelBubble();if(!b)return;b.tail=document.getElementById('btail').value;renderAll();showPC();}
function upBShape(){const b=getSelBubble();if(!b)return;b.shape=document.getElementById('bshape').value;renderAll();showPC();}
function upBBorderStyle(){const b=getSelBubble();if(!b)return;b.borderStyle=document.getElementById('bborderstyle').value;renderAll();showPC();}
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
  return getExpectedPanelWidth(pid);
}

function placeBubbles(panel, bubbles){
  // Place bubbles using percentage coordinates
  const panelW=getPanelPixelWidth(panel.id);
  const panelH=panel.height;
  const BW=Math.min(180,Math.floor(panelW*0.38));
  const BH=80;
  const PAD=16;
  const cols=Math.max(1,Math.floor((panelW-PAD)/(BW+PAD)));

  bubbles.forEach((b,i)=>{
    const col=i%cols;
    const r=Math.floor(i/cols);
    let bx=PAD+col*(BW+PAD);
    let by=PAD+r*(BH+PAD);
    if(bx+BW>panelW-PAD) bx=Math.max(PAD,panelW-BW-PAD);
    if(by+BH>panelH-PAD) by=Math.max(PAD,panelH-BH-PAD);
    // Store as percentages
    b.xPct=bx/panelW*100;
    b.yPct=by/panelH*100;
    b.wPct=BW/panelW*100;
    b.hPct=BH/panelH*100;
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
  let totalBubbles=0;
  arr.forEach((obj,i)=>{
    let pi=obj.panelIndex;
    if(pi===undefined||pi===null){
      // No panelIndex → use selected panel (1-based)
      const selIdx=allPanels.findIndex(p=>p.id===selPID);
      pi=selIdx>=0?selIdx:0;
    }else{
      // panelIndex is 1-based in JSON, convert to 0-based
      pi=pi-1;
    }
    // Silently ignore non-existent panel IDs
    if(pi<0||pi>=allPanels.length)return;
    if(!groups[pi])groups[pi]=[];
    groups[pi].push(obj);
    totalBubbles++;
  });

  Object.entries(groups).forEach(([piStr,objs])=>{
    const pi=parseInt(piStr);
    const panel=allPanels[pi];
    const newBubbles=objs.map(obj=>{
      const type=obj.type||'speech';
      return{
        id:++BC,type,
        text:obj.text||'...',
        xPct:0,yPct:0,wPct:20,hPct:18,
        fontSize:obj.fontSize||(type==='sfx'?22:13),
        tail:obj.tail||(type==='sfx'?'none':'bottom-left'),
        fillColor:obj.fillColor||(type==='sfx'?'#ffee00':'#ffffff'),
        textColor:obj.textColor||'#000000',
        strokeColor:obj.strokeColor||(type==='thought'?'#444444':'#000000'),
        shape:obj.shape||'oval',
        borderStyle:obj.borderStyle||'solid'
      };
    });
    placeBubbles(panel,newBubbles);
    panel.bubbles.push(...newBubbles);
  });

  const panelKeys=Object.keys(groups);
  if(panelKeys.length>0){
    HistoryLog.add('json-import','Imported '+totalBubbles+' bubble(s) to '+panelKeys.length+' panel(s)');
    renderAll();
    const firstPi=parseInt(panelKeys[0]);
    if(allPanels[firstPi])selPanel(allPanels[firstPi].id);
  }
  err.style.display='none';
}

// ── ROW OPS ──
function mergeRow(){
  if(!selPID)return;
  const{row}=findRow(selPID);if(!row)return;
  if(row.type==='double'||row.type==='group'){alert('Already merged/grouped. Split first.');return;}
  const ri=rows.indexOf(row);
  if(ri>=rows.length-1){alert('No next panel.');return;}
  const next=rows[ri+1];
  if(next.type==='double'||next.type==='group'){alert('Next is already a merged/grouped row.');return;}
  const p1=row.panels[0],p2=next.panels[0];
  const h=Math.round((p1.height+p2.height)/2);
  p1.height=h;p2.height=h;
  rows.splice(ri,2,{id:++RC,type:'double',panels:[p1,p2]});
  HistoryLog.add('panel-moved','Merged panels into double row');
  renderAll();selPanel(p1.id);
}

function splitRow(){
  if(!selPID)return;
  const{row}=findRow(selPID);
  if(!row||(row.type!=='double'&&row.type!=='group')){alert('Not a merged/grouped row.');return;}
  const ri=rows.indexOf(row);
  const newRows=row.panels.map(p=>({id:++RC,type:'single',panels:[p]}));
  rows.splice(ri,1,...newRows);
  HistoryLog.add('group-ungrouped','Split row into '+newRows.length+' panels');
  renderAll();selPanel(row.panels[0].id);
}

function swapRow(){
  if(!selPID)return;
  const{row}=findRow(selPID);
  if(!row||(row.type!=='double'&&row.type!=='group')){alert('Select a panel inside a merged/grouped row.');return;}
  row.panels=[row.panels[1],...row.panels.slice(2),row.panels[0]];
  renderAll();showPC();
}

function delPanel(id,e){
  e&&e.stopPropagation();
  const{row}=findRow(id);if(!row)return;
  const ri=rows.indexOf(row);
  if(row.type==='double'||row.type==='group'){
    const rem=row.panels.filter(p=>p.id!==id);
    if(rem.length===0){rows.splice(ri,1);}
    else if(rem.length===1){rows.splice(ri,1,{id:++RC,type:'single',panels:rem});}
    else{
      // Reduce group
      row.panels=rem;
      // Update layout if needed
      if(row.type==='group'){
        const ldef=GROUP_LAYOUTS[row.layout];
        if(!ldef||rem.length<2){row.type='single';}
        else if(rem.length!==ldef.count){
          // Find a suitable layout for the remaining count
          const newLayout=Object.entries(GROUP_LAYOUTS).find(([k,v])=>v.count===rem.length);
          if(newLayout)row.layout=newLayout[0];
          else{row.type=rem.length===2?'double':'single';}
        }
      }
    }
  }else{rows.splice(ri,1);}
  HistoryLog.add('panel-deleted','Panel '+id+' deleted');
  if(selPID===id){selPID=null;selBID=null;document.getElementById('pc').style.display='none';}
  renderAll();
}

function delBubble(bid,pid){
  const p=getPanel(pid);if(!p)return;
  p.bubbles=p.bubbles.filter(b=>b.id!==bid);
  if(selBID===bid){selBID=null;document.getElementById('be').style.display='none';}
  HistoryLog.add('bubble-deleted','Bubble deleted from panel '+pid);
  renderAll();showPC();
}
function delSelBubble(){if(selBID&&selPID)delBubble(selBID,selPID);}

function addBubble(type){
  if(!selPID)return;
  const p=getPanel(selPID);
  const panelW=getExpectedPanelWidth(selPID);
  const panelH=p.height;
  const b={id:++BC,type,text:type==='sfx'?'BOOM!':type==='thought'?'...':'Hello!',
    xPct:60/panelW*100,yPct:40/panelH*100,wPct:160/panelW*100,hPct:80/panelH*100,
    fontSize:type==='sfx'?22:13,
    tail:type==='sfx'?'none':'bottom-left',
    fillColor:type==='sfx'?'#ffee00':'#ffffff',
    textColor:'#000000',strokeColor:type==='thought'?'#444444':'#000000',
    shape:'oval',borderStyle:'solid'};
  p.bubbles.push(b);
  HistoryLog.add('bubble-created',type+' bubble added to panel '+selPID);
  renderAll();selBubble(b.id);showPC();
}

function moveRow(rowId,dir,e){
  e&&e.stopPropagation();
  const i=rows.findIndex(r=>r.id===rowId);if(i<0)return;
  const ni=i+dir;if(ni<0||ni>=rows.length)return;
  [rows[i],rows[ni]]=[rows[ni],rows[i]];
  HistoryLog.add('panel-moved','Row moved '+(dir>0?'down':'up'));
  renderAll();
}

// ── GROUP OPERATIONS ──
function createGroup(){
  if(!selPID)return;
  const{row}=findRow(selPID);if(!row)return;
  if(row.type!=='single'){alert('Select a single panel to start grouping.');return;}
  const ri=rows.indexOf(row);
  // Collect consecutive single rows (2-4)
  const panelsToGroup=[row.panels[0]];
  let endIdx=ri;
  for(let i=ri+1;i<rows.length&&panelsToGroup.length<4;i++){
    if(rows[i].type!=='single')break;
    panelsToGroup.push(rows[i].panels[0]);
    endIdx=i;
  }
  if(panelsToGroup.length<2){alert('Need at least 2 consecutive single panels to group.');return;}
  // Show layout picker
  const count=panelsToGroup.length;
  const layouts=Object.entries(GROUP_LAYOUTS).filter(([k,v])=>v.count===count);
  if(layouts.length===0){alert('No layouts available for '+count+' panels.');return;}
  const layoutKey=layouts[0][0]; // Default to first layout
  showGroupLayoutPicker(panelsToGroup,ri,endIdx,layouts);
}

function showGroupLayoutPicker(panels,startIdx,endIdx,layouts){
  const layoutKey=prompt('Choose layout:\\n'+layouts.map(([k,v],i)=>(i+1)+'. '+v.label).join('\\n')+'\\nEnter number:');
  if(!layoutKey)return;
  const idx=parseInt(layoutKey)-1;
  if(isNaN(idx)||idx<0||idx>=layouts.length)return;
  const chosen=layouts[idx][0];
  applyGroup(panels,startIdx,endIdx,chosen);
}

function applyGroup(panels,startIdx,endIdx,layoutKey){
  const h=Math.round(panels.reduce((s,p)=>s+p.height,0)/panels.length);
  panels.forEach(p=>{p.height=h;});
  rows.splice(startIdx,endIdx-startIdx+1,{id:++RC,type:'group',layout:layoutKey,panels:panels});
  HistoryLog.add('group-created','Group created with '+panels.length+' panels ('+layoutKey+')');
  renderAll();selPanel(panels[0].id);
}

function ungroupRow(rowId){
  const ri=rows.findIndex(r=>r.id===rowId);
  if(ri<0)return;
  const row=rows[ri];
  if(row.type!=='group')return;
  const newRows=row.panels.map(p=>({id:++RC,type:'single',panels:[p]}));
  rows.splice(ri,1,...newRows);
  HistoryLog.add('group-ungrouped','Group ungrouped into '+newRows.length+' panels');
  renderAll();
  if(row.panels.length>0)selPanel(row.panels[0].id);
}

function changeGroupLayout(){
  if(!selPID)return;
  const{row}=findRow(selPID);
  if(!row||row.type!=='group')return;
  const count=row.panels.length;
  const layouts=Object.entries(GROUP_LAYOUTS).filter(([k,v])=>v.count===count);
  if(layouts.length<=1)return;
  const cur=layouts.findIndex(([k])=>k===row.layout);
  const next=(cur+1)%layouts.length;
  row.layout=layouts[next][0];
  renderAll();showPC();
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
      rows:rows.map(r=>{
        const rObj={id:r.id,type:r.type,panels:r.panels.map(p=>({
          id:p.id,src:p.src,height:p.height,ox:p.ox,oy:p.oy,scale:p.scale,
          bubbles:p.bubbles.map(b=>{
            // Save full bubble state with percentage coords
            const bs={id:b.id,type:b.type,text:b.text,
              xPct:b.xPct,yPct:b.yPct,wPct:b.wPct,hPct:b.hPct,
              fontSize:b.fontSize,tail:b.tail,
              fillColor:b.fillColor,textColor:b.textColor,strokeColor:b.strokeColor,
              shape:b.shape||'oval',borderStyle:b.borderStyle||'solid'};
            return bs;
          }),
          overlays:(p.overlays||[]).map(o=>({id:o.id,file:o.file,opacity:o.opacity!==undefined?o.opacity:0.5}))
        }))};
        if(r.type==='group')rObj.layout=r.layout;
        return rObj;
      }),
      selPID,selBID,PC,RC,BC
    };
    localStorage.setItem('mangaEditorState',JSON.stringify(state));
    autoSaveTs=Date.now();
    updateAutoSaveDisplay();
    HistoryLog.add('auto-save','State saved');
  }catch(e){
    const el=document.getElementById('autosave-status');
    if(el){el.textContent='Auto-save failed';el.className='';}
  }
}

function updateAutoSaveDisplay(){
  const el=document.getElementById('autosave-status');
  if(!el)return;
  if(!autoSaveTs){el.textContent='Auto-save active';el.className='';return;}
  const secs=Math.round((Date.now()-autoSaveTs)/1000);
  if(secs<60)el.textContent='Auto-saved '+secs+'s ago';
  else el.textContent='Auto-saved '+Math.round(secs/60)+'m ago';
  el.className='saved';
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
    // Ensure overlays array and bubble defaults on all panels
    rows.forEach(r=>{
      r.panels.forEach(p=>{
        if(!p.overlays)p.overlays=[];
        p.bubbles.forEach(b=>{
          // Migrate old absolute px coords to percentages if needed
          if(b.x!==undefined&&b.xPct===undefined){
            const pw=800;// fallback
            const ph=p.height||450;
            b.xPct=(b.x/pw)*100;
            b.yPct=(b.y/ph)*100;
            b.wPct=((b.w||160)/pw)*100;
            b.hPct=((b.h||80)/ph)*100;
          }
          if(!b.shape)b.shape='oval';
          if(!b.borderStyle)b.borderStyle='solid';
        });
      });
    });
    autoSaveTs=Date.now();
    return true;
  }catch(e){return false;}
}

function clearAll(){
  if(!confirm('Clear all panels and reset the editor?'))return;
  rows=[];selPID=null;selBID=null;PC=0;RC=0;BC=0;
  localStorage.removeItem('mangaEditorState');
  document.getElementById('pc').style.display='none';
  renderAll();
  autoSaveTs=null;
  const el=document.getElementById('autosave-status');
  if(el){el.textContent='Cleared';el.className='';}
}

function startAutoSave(){
  if(autoSaveTimer)clearInterval(autoSaveTimer);
  autoSaveTimer=setInterval(autoSave,10000);
  // Update "Xs ago" display every second
  if(autoSaveTick)clearInterval(autoSaveTick);
  autoSaveTick=setInterval(updateAutoSaveDisplay,1000);
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
  const overlayFiles=new Set();
  allP.forEach(p=>(p.overlays||[]).forEach(o=>overlayFiles.add(o.file)));
  await Promise.all([...overlayFiles].map(f=>loadImg(f)));

  let curY=0;
  for(let ri=0;ri<rows.length;ri++){
    if(ri>0)curY+=GAP;
    const row=rows[ri];
    const rowH=Math.max(...row.panels.map(p=>p.height));
    if(row.type==='group'){
      const ldef=GROUP_LAYOUTS[row.layout];
      if(ldef){
        const cols=ldef.cols.split(' ');
        const totalFr=cols.reduce((s,c)=>s+parseFloat(c),0);
        const rowsSpec=ldef.rows.split(' ');
        const totalRowFr=rowsSpec.reduce((s,r)=>s+parseFloat(r),0);
        row.panels.forEach((p,pi)=>{
          if(pi>=ldef.positions.length)return;
          const pos=ldef.positions[pi];
          const colPart=pos.col.split(' / ')[0];
          const colIdx=parseInt(colPart)-1;
          const colFr=parseFloat(cols[Math.min(colIdx,cols.length-1)]);
          const pw=Math.round((PAGE_W-GAP*(cols.length-1))*colFr/totalFr);
          let px=0;
          for(let c=0;c<colIdx;c++)px+=Math.round((PAGE_W-GAP*(cols.length-1))*parseFloat(cols[c])/totalFr)+GAP;
          drawPanel(ctx,p,px,curY,pw,rowH,imgCache);
        });
      }
    }else if(row.type==='double'){
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
        ctx.globalAlpha=ov.opacity!==undefined?ov.opacity:0.5;
        ctx.drawImage(ovImg,px,py,pw,ph);
        ctx.globalAlpha=1.0;
      }
    }
  }

  ctx.strokeStyle='#000';ctx.lineWidth=3;
  ctx.strokeRect(px,py,pw,ph);

  ctx.restore();

  // Draw bubbles using percentage coordinates
  p.bubbles.forEach(b=>{
    // Compute pixel positions from percentages for export
    b._px=(b.xPct||0)*pw/100;
    b._py=(b.yPct||0)*ph/100;
    b._pw=(b.wPct||20)*pw/100;
    b._ph=(b.hPct||18)*ph/100;
    ctx.save();
    ctx.beginPath();ctx.rect(px,py,pw,ph);ctx.clip();
    BubbleShapes.drawOnCanvas(ctx,b,px,py);
    ctx.restore();
  });
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
  // Initialize history log
  const histPanel=document.getElementById('history-panel');
  if(histPanel)HistoryLog.init(histPanel);
  startAutoSave();
});
