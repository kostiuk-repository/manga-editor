// ── EVENT HISTORY LOG ──
var HistoryLog=(function(){
  const STORAGE_KEY='mangaEditorHistory';
  let events=[];
  let panelEl=null;

  function load(){
    try{events=JSON.parse(localStorage.getItem(STORAGE_KEY))||[];}
    catch(e){events=[];}
  }

  function save(){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(events));}
    catch(e){/* quota exceeded */}
  }

  function add(type,details){
    events.push({ts:Date.now(),type:type,details:details||''});
    // Limit to 500 events to prevent localStorage quota issues
    if(events.length>500)events=events.slice(-500);
    save();
    render();
  }

  function clear(){
    events=[];
    save();
    render();
  }

  function exportTxt(){
    const lines=events.map(e=>{
      const d=new Date(e.ts);
      return '['+d.toLocaleString()+'] '+e.type+': '+e.details;
    });
    const blob=new Blob([lines.join('\n')],{type:'text/plain'});
    const a=document.createElement('a');
    a.download='manga-editor-history.txt';
    a.href=URL.createObjectURL(blob);
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  function formatTime(ts){
    const d=new Date(ts);
    return d.toLocaleTimeString();
  }

  function render(){
    if(!panelEl)return;
    const list=panelEl.querySelector('#history-list');
    if(!list)return;
    list.innerHTML='';
    const shown=events.slice().reverse().slice(0,100);
    if(shown.length===0){
      list.innerHTML='<div style="font-size:10px;color:#555;padding:4px">No events yet.</div>';
      return;
    }
    shown.forEach(e=>{
      const d=document.createElement('div');
      d.className='history-item';
      d.innerHTML='<span class="history-time">'+formatTime(e.ts)+'</span> '+
        '<span class="history-type">'+e.type+'</span> '+
        '<span class="history-detail">'+e.details+'</span>';
      list.appendChild(d);
    });
  }

  function init(el){
    panelEl=el;
    load();
    render();
  }

  return{init:init,add:add,clear:clear,exportTxt:exportTxt,render:render,load:load};
})();
