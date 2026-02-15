// ── ASSET LAYER MANAGEMENT ──
var Layers=(function(){

  function addOverlay(panel,file){
    if(!panel.overlays)panel.overlays=[];
    panel.overlays.push({id:Date.now(),file:file,opacity:0.5});
  }

  function removeOverlay(panel,ovId){
    if(!panel||!panel.overlays)return;
    panel.overlays=panel.overlays.filter(function(o){return o.id!==ovId;});
  }

  function reorderOverlay(panel,fromIdx,toIdx){
    if(!panel||!panel.overlays)return;
    if(fromIdx<0||fromIdx>=panel.overlays.length)return;
    if(toIdx<0||toIdx>=panel.overlays.length)return;
    var moved=panel.overlays.splice(fromIdx,1)[0];
    panel.overlays.splice(toIdx,0,moved);
  }

  function setOpacity(panel,ovId,opacity){
    if(!panel||!panel.overlays)return;
    var ov=panel.overlays.find(function(o){return o.id===ovId;});
    if(ov)ov.opacity=Math.max(0,Math.min(1,opacity));
  }

  function renderOverlays(panelEl,panel,onRemove){
    if(!panel.overlays)return;
    panel.overlays.forEach(function(ov){
      var layer=document.createElement('div');
      layer.className='overlay-layer';
      var ovImg=document.createElement('img');
      ovImg.src=ov.file;
      ovImg.style.opacity=ov.opacity!==undefined?ov.opacity:0.5;
      layer.appendChild(ovImg);
      var del=document.createElement('div');
      del.className='overlay-del';del.textContent='\u2715';
      del.onclick=function(e){e.stopPropagation();onRemove(panel.id,ov.id);};
      layer.appendChild(del);
      panelEl.appendChild(layer);
    });
  }

  function renderOverlayList(container,panel,onRemove,onReorder,onOpacity){
    if(!container)return;
    container.innerHTML='';
    if(!panel||!panel.overlays||panel.overlays.length===0){
      container.innerHTML='<div style="font-size:10px;color:#555">No overlays. Drag assets here.</div>';
      return;
    }
    panel.overlays.forEach(function(ov,idx){
      var d=document.createElement('div');
      d.className='bi';d.style.cursor='grab';d.draggable=true;
      d.style.flexWrap='wrap';
      var name=ov.file.split('/').pop().replace(/\.(png|svg|jpg)$/,'');
      d.innerHTML='<span style="flex:1;color:#ccc">'+((idx+1)+'. '+name)+'</span>';

      // Opacity slider
      var sliderWrap=document.createElement('div');
      sliderWrap.style.cssText='width:100%;display:flex;align-items:center;gap:4px;margin-top:2px';
      var slLabel=document.createElement('span');
      slLabel.style.cssText='font-size:9px;color:#666';slLabel.textContent='Opacity';
      var slider=document.createElement('input');
      slider.type='range';slider.min='0';slider.max='100';
      slider.value=Math.round((ov.opacity!==undefined?ov.opacity:0.5)*100);
      slider.style.cssText='flex:1;height:14px';
      slider.oninput=function(){
        var val=parseInt(slider.value)/100;
        onOpacity(panel.id,ov.id,val);
      };
      sliderWrap.appendChild(slLabel);sliderWrap.appendChild(slider);

      var del=document.createElement('button');
      del.className='db';del.textContent='\u2715';del.style.marginLeft='4px';
      del.onclick=function(e){e.stopPropagation();onRemove(panel.id,ov.id);};
      d.appendChild(del);
      d.appendChild(sliderWrap);

      // Reorder overlays via drag
      d.addEventListener('dragstart',function(e){
        e.dataTransfer.setData('text/overlay-idx',String(idx));
        e.dataTransfer.effectAllowed='move';
      });
      d.addEventListener('dragover',function(e){
        if(e.dataTransfer.types.includes('text/overlay-idx')){
          e.preventDefault();e.dataTransfer.dropEffect='move';
          d.style.borderColor='#0ff';
        }
      });
      d.addEventListener('dragleave',function(){d.style.borderColor='#333';});
      d.addEventListener('drop',function(e){
        d.style.borderColor='#333';
        var fromIdx=parseInt(e.dataTransfer.getData('text/overlay-idx'));
        if(isNaN(fromIdx)||fromIdx===idx)return;
        onReorder(panel.id,fromIdx,idx);
      });

      container.appendChild(d);
    });
  }

  return{
    addOverlay:addOverlay,
    removeOverlay:removeOverlay,
    reorderOverlay:reorderOverlay,
    setOpacity:setOpacity,
    renderOverlays:renderOverlays,
    renderOverlayList:renderOverlayList
  };
})();
