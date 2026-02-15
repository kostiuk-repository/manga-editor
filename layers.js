// ── ASSET LAYER MANAGEMENT WITH Z-ORDER SYSTEM ──
var Layers=(function(){

  // Initialize layers array from existing bubbles and overlays
  function initializeLayers(panel) {
    if (!panel.layers || panel.layers.length === 0) {
      panel.layers = [];
      
      // Add image layer (always first, zIndex 0)
      panel.layers.push({
        id: 'img-' + panel.id,
        kind: 'image',
        zIndex: 0
      });
      
      // Add existing overlays
      if (panel.overlays && panel.overlays.length > 0) {
        panel.overlays.forEach((ov, idx) => {
          panel.layers.push({
            id: ov.id,
            kind: 'overlay',
            file: ov.file,
            opacity: ov.opacity,
            blendMode: ov.blendMode || 'normal',
            zIndex: idx + 1
          });
        });
      }
      
      // Add existing bubbles
      if (panel.bubbles && panel.bubbles.length > 0) {
        const baseZ = (panel.overlays || []).length + 1;
        panel.bubbles.forEach((b, idx) => {
          panel.layers.push({
            id: b.id,
            kind: 'bubble',
            bubbleData: b,
            zIndex: baseZ + idx
          });
        });
      }
    }
    
    // Sort layers by zIndex
    panel.layers.sort((a, b) => a.zIndex - b.zIndex);
  }

  // Sync views - regenerate bubbles and overlays arrays from layers
  function syncViews(panel) {
    if (!panel.layers) return;
    
    panel.overlays = panel.layers
      .filter(l => l.kind === 'overlay')
      .map(l => ({
        id: l.id,
        file: l.file,
        opacity: l.opacity,
        blendMode: l.blendMode
      }));
    
    panel.bubbles = panel.layers
      .filter(l => l.kind === 'bubble')
      .map(l => l.bubbleData);
  }

  function addOverlay(panel,file){
    initializeLayers(panel);
    
    const maxZ = Math.max(...panel.layers.map(l => l.zIndex), 0);
    const newLayer = {
      id: Date.now(),
      kind: 'overlay',
      file: file,
      opacity: 0.5,
      blendMode: 'normal',
      zIndex: maxZ + 1
    };
    
    panel.layers.push(newLayer);
    syncViews(panel);
  }

  function removeOverlay(panel,ovId){
    if(!panel||!panel.layers)return;
    panel.layers = panel.layers.filter(l => !(l.kind === 'overlay' && l.id === ovId));
    syncViews(panel);
  }

  function reorderOverlay(panel,fromIdx,toIdx){
    if(!panel||!panel.overlays)return;
    if(fromIdx<0||fromIdx>=panel.overlays.length)return;
    if(toIdx<0||toIdx>=panel.overlays.length)return;
    var moved=panel.overlays.splice(fromIdx,1)[0];
    panel.overlays.splice(toIdx,0,moved);
    
    // Update layers to match new overlay order
    const overlayLayers = panel.layers.filter(l => l.kind === 'overlay');
    const otherLayers = panel.layers.filter(l => l.kind !== 'overlay');
    
    panel.layers = otherLayers;
    panel.overlays.forEach((ov, idx) => {
      const layer = overlayLayers.find(l => l.id === ov.id);
      if (layer) {
        layer.zIndex = idx + 1; // Keep overlays between image (0) and bubbles
        panel.layers.push(layer);
      }
    });
    
    panel.layers.sort((a, b) => a.zIndex - b.zIndex);
  }

  function setOpacity(panel,ovId,opacity){
    if(!panel||!panel.layers)return;
    const layer = panel.layers.find(l => l.kind === 'overlay' && l.id === ovId);
    if(layer) {
      layer.opacity = Math.max(0,Math.min(1,opacity));
      syncViews(panel);
    }
  }
  
  function setLayerZ(panel, layerId, newZ) {
    if (!panel || !panel.layers) return;
    const layer = panel.layers.find(l => l.id === layerId);
    if (!layer) return;
    
    // Don't allow moving the image layer
    if (layer.kind === 'image') return;
    
    layer.zIndex = newZ;
    panel.layers.sort((a, b) => a.zIndex - b.zIndex);
    syncViews(panel);
  }
  
  function moveLayerUp(panel, layerId) {
    if (!panel || !panel.layers) return;
    const idx = panel.layers.findIndex(l => l.id === layerId);
    if (idx < 0 || idx >= panel.layers.length - 1) return;
    
    const layer = panel.layers[idx];
    const nextLayer = panel.layers[idx + 1];
    
    // Swap zIndex values
    const temp = layer.zIndex;
    layer.zIndex = nextLayer.zIndex;
    nextLayer.zIndex = temp;
    
    panel.layers.sort((a, b) => a.zIndex - b.zIndex);
    syncViews(panel);
  }
  
  function moveLayerDown(panel, layerId) {
    if (!panel || !panel.layers) return;
    const idx = panel.layers.findIndex(l => l.id === layerId);
    if (idx <= 1) return; // Don't go below image layer
    
    const layer = panel.layers[idx];
    const prevLayer = panel.layers[idx - 1];
    
    // Swap zIndex values
    const temp = layer.zIndex;
    layer.zIndex = prevLayer.zIndex;
    prevLayer.zIndex = temp;
    
    panel.layers.sort((a, b) => a.zIndex - b.zIndex);
    syncViews(panel);
  }

  function renderOverlays(panelEl,panel,onRemove){
    if(!panel.layers) initializeLayers(panel);
    
    // Render only overlay layers in zIndex order
    panel.layers
      .filter(l => l.kind === 'overlay')
      .forEach(function(layer){
        var layerEl=document.createElement('div');
        layerEl.className='overlay-layer';
        layerEl.style.zIndex = layer.zIndex;
        var ovImg=document.createElement('img');
        ovImg.src=layer.file;
        ovImg.style.opacity=layer.opacity!==undefined?layer.opacity:0.5;
        layerEl.appendChild(ovImg);
        var del=document.createElement('div');
        del.className='overlay-del';del.textContent='\u2715';
        del.onclick=function(e){e.stopPropagation();onRemove(panel.id,layer.id);};
        layerEl.appendChild(del);
        panelEl.appendChild(layerEl);
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
    initializeLayers: initializeLayers,
    syncViews: syncViews,
    addOverlay:addOverlay,
    removeOverlay:removeOverlay,
    reorderOverlay:reorderOverlay,
    setOpacity:setOpacity,
    setLayerZ: setLayerZ,
    moveLayerUp: moveLayerUp,
    moveLayerDown: moveLayerDown,
    renderOverlays:renderOverlays,
    renderOverlayList:renderOverlayList
  };
})();
