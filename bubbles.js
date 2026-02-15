// ── BUBBLE SHAPES & SVG GENERATION ──
const BubbleShapes=(function(){
  const NS='http://www.w3.org/2000/svg';

  // Tail anchor points in % of viewBox (0-100)
  const TAIL_DIRS={
    'bottom-left':   {px:35,py:95, ax:42,ay:82, bx:55,by:85},
    'bottom-right':  {px:65,py:95, ax:58,ay:82, bx:45,by:85},
    'bottom-center': {px:50,py:100,ax:44,ay:82, bx:56,by:82},
    'top-left':      {px:35,py:-10,ax:42,ay:8,  bx:55,by:11},
    'top-right':     {px:65,py:-10,ax:58,ay:8,  bx:45,by:11},
    'top-center':    {px:50,py:-15,ax:44,ay:8,  bx:56,by:8},
    'left':          {px:-15,py:46,ax:4,ay:38,  bx:4,by:54},
    'right':         {px:115,py:46,ax:96,ay:38, bx:96,by:54}
  };

  const THOUGHT_DOTS_DIR={
    'bottom-left':   [[38,90],[30,100],[24,108]],
    'bottom-right':  [[62,90],[70,100],[76,108]],
    'bottom-center': [[50,92],[50,102],[50,110]],
    'top-left':      [[38,2],[30,-8],[24,-16]],
    'top-right':     [[62,2],[70,-8],[76,-16]],
    'top-center':    [[50,-2],[50,-12],[50,-20]],
    'left':          [[2,44],[-9,44],[-18,44]],
    'right':         [[98,44],[109,44],[118,44]],
    'none':          []
  };

  function createSVG(b){
    const svg=document.createElementNS(NS,'svg');
    svg.classList.add('bsvg');
    svg.setAttribute('viewBox','0 0 100 100');
    svg.setAttribute('preserveAspectRatio','none');

    const fill=b.fillColor||(b.type==='sfx'?'#ffee00':'#ffffff');
    const stroke=b.strokeColor||(b.type==='thought'?'#444':'#000');
    const shape=b.shape||'oval';
    const borderStyle=b.borderStyle||'solid';

    const strokeW=borderStyle==='double'?'2':'3';
    const dashArr=getDashArray(borderStyle);

    // Draw main shape
    if(shape==='oval'){
      drawOval(svg,fill,stroke,strokeW,dashArr);
    }else if(shape==='rectangle'){
      drawRect(svg,fill,stroke,strokeW,dashArr,false);
    }else if(shape==='parallelogram'){
      drawRect(svg,fill,stroke,strokeW,dashArr,true);
    }else if(shape==='cloud'){
      drawCloud(svg,fill,stroke,strokeW,dashArr);
    }else if(shape==='spike'){
      drawSpike(svg,fill,stroke,strokeW,dashArr);
    }

    // Draw double border if needed
    if(borderStyle==='double'){
      if(shape==='oval'){
        const inner=document.createElementNS(NS,'ellipse');
        inner.setAttribute('cx','50');inner.setAttribute('cy','46');
        inner.setAttribute('rx','43');inner.setAttribute('ry','36');
        inner.setAttribute('fill','none');inner.setAttribute('stroke',stroke);
        inner.setAttribute('stroke-width','2');
        svg.appendChild(inner);
      }else if(shape==='rectangle'||shape==='parallelogram'){
        const inner=document.createElementNS(NS,'rect');
        inner.setAttribute('x','7');inner.setAttribute('y','7');
        inner.setAttribute('width','86');inner.setAttribute('height','78');
        inner.setAttribute('rx','4');inner.setAttribute('fill','none');
        inner.setAttribute('stroke',stroke);inner.setAttribute('stroke-width','2');
        if(shape==='parallelogram')inner.setAttribute('transform','skewX(-8)');
        svg.appendChild(inner);
      }
    }

    // Draw tail
    if(b.tail!=='none'&&borderStyle!=='none'){
      if(b.type==='thought'||shape==='cloud'){
        drawThoughtTail(svg,b.tail,fill,stroke);
      }else{
        drawTail(svg,b.tail,fill,stroke);
      }
    }else if(b.tail!=='none'&&borderStyle==='none'){
      // Still draw tail but without stroke
      if(b.type==='thought'||shape==='cloud'){
        drawThoughtTail(svg,b.tail,fill,'none');
      }else{
        drawTail(svg,b.tail,fill,'none');
      }
    }

    return svg;
  }

  function getDashArray(style){
    if(style==='dashed')return '6,3';
    if(style==='dotted')return '2,3';
    return 'none';
  }

  function applyStroke(el,stroke,strokeW,dashArr,borderStyle){
    if(borderStyle==='none'){
      el.setAttribute('stroke','none');
      el.setAttribute('stroke-width','0');
    }else{
      el.setAttribute('stroke',stroke);
      el.setAttribute('stroke-width',strokeW);
      if(dashArr!=='none')el.setAttribute('stroke-dasharray',dashArr);
    }
  }

  function drawOval(svg,fill,stroke,strokeW,dashArr){
    const ell=document.createElementNS(NS,'ellipse');
    ell.setAttribute('cx','50');ell.setAttribute('cy','46');
    ell.setAttribute('rx','47');ell.setAttribute('ry','40');
    ell.setAttribute('fill',fill);
    ell.setAttribute('stroke',stroke);ell.setAttribute('stroke-width',strokeW);
    if(dashArr!=='none')ell.setAttribute('stroke-dasharray',dashArr);
    svg.appendChild(ell);
  }

  function drawRect(svg,fill,stroke,strokeW,dashArr,skew){
    const r=document.createElementNS(NS,'rect');
    r.setAttribute('x','3');r.setAttribute('y','3');
    r.setAttribute('width','94');r.setAttribute('height','86');
    r.setAttribute('rx','6');r.setAttribute('fill',fill);
    r.setAttribute('stroke',stroke);r.setAttribute('stroke-width',strokeW);
    if(dashArr!=='none')r.setAttribute('stroke-dasharray',dashArr);
    if(skew)r.setAttribute('transform','skewX(-8)');
    svg.appendChild(r);
  }

  function drawCloud(svg,fill,stroke,strokeW,dashArr){
    const path=document.createElementNS(NS,'path');
    const d='M25,80 C8,80 2,65 8,52 C2,42 8,25 22,22 C25,8 42,2 55,10 '+
            'C62,2 80,2 85,15 C98,18 100,35 92,46 C100,58 95,78 80,80 Z';
    path.setAttribute('d',d);
    path.setAttribute('fill',fill);
    path.setAttribute('stroke',stroke);path.setAttribute('stroke-width',strokeW);
    if(dashArr!=='none')path.setAttribute('stroke-dasharray',dashArr);
    svg.appendChild(path);
  }

  function drawSpike(svg,fill,stroke,strokeW,dashArr){
    const pts=[];
    const cx=50,cy=46,rx=44,ry=38,spikes=14;
    for(let i=0;i<spikes;i++){
      const a=(i/spikes)*Math.PI*2-Math.PI/2;
      const a2=((i+0.5)/spikes)*Math.PI*2-Math.PI/2;
      pts.push((cx+Math.cos(a)*rx).toFixed(1)+','+(cy+Math.sin(a)*ry).toFixed(1));
      const sr=1.25;
      pts.push((cx+Math.cos(a2)*rx*sr).toFixed(1)+','+(cy+Math.sin(a2)*ry*sr).toFixed(1));
    }
    const poly=document.createElementNS(NS,'polygon');
    poly.setAttribute('points',pts.join(' '));
    poly.setAttribute('fill',fill);
    poly.setAttribute('stroke',stroke);poly.setAttribute('stroke-width',strokeW);
    poly.setAttribute('stroke-linejoin','round');
    if(dashArr!=='none')poly.setAttribute('stroke-dasharray',dashArr);
    svg.appendChild(poly);
  }

  function drawTail(svg,tail,fill,stroke){
    const dir=TAIL_DIRS[tail];
    if(!dir)return;
    const poly=document.createElementNS(NS,'polygon');
    poly.setAttribute('points',dir.ax+','+dir.ay+' '+dir.px+','+dir.py+' '+dir.bx+','+dir.by);
    poly.setAttribute('fill',fill);
    if(stroke!=='none'){
      poly.setAttribute('stroke',stroke);poly.setAttribute('stroke-width','3');
      poly.setAttribute('stroke-linejoin','round');
    }
    svg.appendChild(poly);
    // Cover line at junction
    const cover=document.createElementNS(NS,'polygon');
    const mx=(dir.ax+dir.bx)/2, my=(dir.ay+dir.by)/2;
    cover.setAttribute('points',dir.ax+','+dir.ay+' '+dir.bx+','+dir.by+' '+mx+','+my);
    cover.setAttribute('fill',fill);cover.setAttribute('stroke','none');
    svg.appendChild(cover);
  }

  function drawThoughtTail(svg,tail,fill,stroke){
    const dots=THOUGHT_DOTS_DIR[tail]||[];
    dots.forEach(function(d,i){
      const c=document.createElementNS(NS,'circle');
      const r=(4.5-i*1.1).toFixed(1);
      c.setAttribute('cx',d[0]);c.setAttribute('cy',d[1]);c.setAttribute('r',r);
      c.setAttribute('fill',fill);
      if(stroke!=='none'){
        c.setAttribute('stroke',stroke);c.setAttribute('stroke-width','2.5');
        c.setAttribute('stroke-dasharray','4,2');
      }
      svg.appendChild(c);
    });
  }

  // Canvas drawing for export
  function drawOnCanvas(ctx,b,ox,oy){
    var x=ox+b._px,y=oy+b._py,w=b._pw,h=b._ph;
    var fill=b.fillColor||(b.type==='sfx'?'#ffee00':'#ffffff');
    var stroke=b.strokeColor||(b.type==='thought'?'#444':'#000');
    var shape=b.shape||'oval';
    var borderStyle=b.borderStyle||'solid';

    ctx.save();

    var cx=x+w/2,cy=y+h*0.46;
    var rx=w*0.47,ry=h*0.40;

    // Set dash pattern
    if(borderStyle==='dashed')ctx.setLineDash([6,4]);
    else if(borderStyle==='dotted')ctx.setLineDash([2,3]);
    else ctx.setLineDash([]);

    // Draw tail first (behind shape)
    if(b.tail!=='none'){
      if(b.type==='thought'||shape==='cloud'){
        var dots=getThoughtDotsCanvas(b.tail,x,y,w,h);
        dots.forEach(function(d){
          ctx.beginPath();ctx.arc(d[0],d[1],d[2],0,Math.PI*2);
          ctx.fillStyle=fill;ctx.fill();
          if(borderStyle!=='none'){
            ctx.setLineDash([3,2]);ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();
          }
          ctx.setLineDash([]);
        });
      }else{
        var tp=getTailPolyCanvas(b.tail,x,y,w,h);
        if(tp){
          ctx.beginPath();ctx.moveTo(tp[0][0],tp[0][1]);
          tp.forEach(function(pt){ctx.lineTo(pt[0],pt[1]);});
          ctx.closePath();ctx.fillStyle=fill;ctx.fill();
          if(borderStyle!=='none'){
            ctx.strokeStyle=stroke;ctx.lineWidth=2.5;ctx.stroke();
          }
        }
      }
    }

    // Reset dash for shape
    if(borderStyle==='dashed')ctx.setLineDash([6,4]);
    else if(borderStyle==='dotted')ctx.setLineDash([2,3]);
    else ctx.setLineDash([]);

    // Draw shape
    if(shape==='oval'){
      ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);
      ctx.fillStyle=fill;ctx.fill();
      if(borderStyle!=='none'){ctx.strokeStyle=stroke;ctx.lineWidth=2.5;ctx.stroke();}
    }else if(shape==='rectangle'||shape==='parallelogram'){
      ctx.beginPath();
      if(shape==='parallelogram'){
        var sk=w*0.08;
        ctx.moveTo(x+sk+w*0.03,y+h*0.03);
        ctx.lineTo(x+w*0.97,y+h*0.03);
        ctx.lineTo(x+w*0.97-sk,y+h*0.89);
        ctx.lineTo(x+w*0.03,y+h*0.89);
      }else{
        roundRect(ctx,x+w*0.03,y+h*0.03,w*0.94,h*0.86,w*0.04);
      }
      ctx.closePath();ctx.fillStyle=fill;ctx.fill();
      if(borderStyle!=='none'){ctx.strokeStyle=stroke;ctx.lineWidth=2.5;ctx.stroke();}
    }else if(shape==='cloud'){
      drawCloudCanvas(ctx,x,y,w,h,fill,stroke,borderStyle);
    }else if(shape==='spike'){
      drawSpikeCanvas(ctx,cx,cy,rx,ry,fill,stroke,borderStyle);
    }

    // Double border
    if(borderStyle==='double'){
      ctx.setLineDash([]);
      if(shape==='oval'){
        ctx.beginPath();ctx.ellipse(cx,cy,rx*0.92,ry*0.9,0,0,Math.PI*2);
        ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();
      }
    }

    ctx.setLineDash([]);

    // Draw text
    var fs=b.fontSize||13;
    ctx.font='bold '+fs+'px "Comic Neue", "Comic Sans MS", cursive';
    ctx.fillStyle=b.textColor||'#000';
    ctx.textAlign='center';ctx.textBaseline='middle';
    var maxW=w*0.82;
    var lines=wrapTextCanvas(ctx,b.text,maxW);
    var lh=fs*1.3;
    var totalTH=lines.length*lh;
    lines.forEach(function(line,i){
      var ly=cy-totalTH/2+lh*0.5+i*lh;
      ctx.fillText(line,cx,ly);
    });

    ctx.restore();
  }

  function roundRect(ctx,x,y,w,h,r){
    ctx.moveTo(x+r,y);
    ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);
  }

  function drawCloudCanvas(ctx,x,y,w,h,fill,stroke,borderStyle){
    ctx.beginPath();
    // Bumpy cloud outline
    var cx0=x+w*0.5,cy0=y+h*0.46;
    var bumps=12,rr=Math.min(w,h)*0.42;
    for(var i=0;i<=bumps;i++){
      var a=(i/bumps)*Math.PI*2;
      var br=rr*(0.85+0.15*Math.cos(a*3));
      var px=cx0+Math.cos(a)*br*(w/h>1?1.1:0.9);
      var py=cy0+Math.sin(a)*br*(h/w>1?1.1:0.9);
      if(i===0)ctx.moveTo(px,py);
      else{
        var ca=(a-(1/bumps)*Math.PI*2);
        var cpx=cx0+Math.cos(ca+0.5/bumps*Math.PI*2)*(br*1.15)*(w/h>1?1.1:0.9);
        var cpy=cy0+Math.sin(ca+0.5/bumps*Math.PI*2)*(br*1.15)*(h/w>1?1.1:0.9);
        ctx.quadraticCurveTo(cpx,cpy,px,py);
      }
    }
    ctx.closePath();
    ctx.fillStyle=fill;ctx.fill();
    if(borderStyle!=='none'){ctx.strokeStyle=stroke;ctx.lineWidth=2.5;ctx.stroke();}
  }

  function drawSpikeCanvas(ctx,cx,cy,rx,ry,fill,stroke,borderStyle){
    var spikes=14;
    ctx.beginPath();
    for(var i=0;i<spikes;i++){
      var a=(i/spikes)*Math.PI*2-Math.PI/2;
      var a2=((i+0.5)/spikes)*Math.PI*2-Math.PI/2;
      var px=cx+Math.cos(a)*rx;
      var py=cy+Math.sin(a)*ry;
      var sx=cx+Math.cos(a2)*rx*1.25;
      var sy=cy+Math.sin(a2)*ry*1.25;
      if(i===0)ctx.moveTo(px,py);
      else ctx.lineTo(px,py);
      ctx.lineTo(sx,sy);
    }
    ctx.closePath();
    ctx.fillStyle=fill;ctx.fill();
    if(borderStyle!=='none'){
      ctx.strokeStyle=stroke;ctx.lineWidth=2.5;ctx.lineJoin='round';ctx.stroke();
    }
  }

  function getTailPolyCanvas(tail,x,y,w,h){
    var cx=x+w/2,cy=y+h*0.46;
    var rx=w*0.47;
    var pts={
      'bottom-left':   [[cx-w*0.08,cy+h*0.36],[x+w*0.05,y+h*1.12],[cx+w*0.06,cy+h*0.38]],
      'bottom-right':  [[cx+w*0.08,cy+h*0.36],[x+w*0.95,y+h*1.12],[cx-w*0.06,cy+h*0.38]],
      'bottom-center': [[cx-w*0.06,cy+h*0.36],[cx,y+h*1.15],[cx+w*0.06,cy+h*0.36]],
      'top-left':      [[cx-w*0.08,cy-h*0.36],[x+w*0.05,y-h*0.12],[cx+w*0.06,cy-h*0.38]],
      'top-right':     [[cx+w*0.08,cy-h*0.36],[x+w*0.95,y-h*0.12],[cx-w*0.06,cy-h*0.38]],
      'top-center':    [[cx-w*0.06,cy-h*0.36],[cx,y-h*0.15],[cx+w*0.06,cy-h*0.36]],
      'left':          [[cx-rx*0.92,cy-h*0.08],[x-w*0.18,cy],[cx-rx*0.92,cy+h*0.08]],
      'right':         [[cx+rx*0.92,cy-h*0.08],[x+w*1.18,cy],[cx+rx*0.92,cy+h*0.08]]
    };
    return pts[tail]||null;
  }

  function getThoughtDotsCanvas(tail,x,y,w,h){
    var cx=x+w/2,cy=y+h*0.46;
    var sets={
      'bottom-left':   [[cx-w*0.08,cy+h*0.45,4],[cx-w*0.18,cy+h*0.62,3],[cx-w*0.26,cy+h*0.78,2.2]],
      'bottom-right':  [[cx+w*0.08,cy+h*0.45,4],[cx+w*0.18,cy+h*0.62,3],[cx+w*0.26,cy+h*0.78,2.2]],
      'bottom-center': [[cx,cy+h*0.48,4],[cx,cy+h*0.62,3],[cx,cy+h*0.74,2.2]],
      'top-left':      [[cx-w*0.08,cy-h*0.45,4],[cx-w*0.18,cy-h*0.62,3],[cx-w*0.26,cy-h*0.78,2.2]],
      'top-right':     [[cx+w*0.08,cy-h*0.45,4],[cx+w*0.18,cy-h*0.62,3],[cx+w*0.26,cy-h*0.78,2.2]],
      'top-center':    [[cx,cy-h*0.48,4],[cx,cy-h*0.62,3],[cx,cy-h*0.74,2.2]],
      'left':          [[cx-w*0.55,cy,4],[cx-w*0.68,cy,3],[cx-w*0.80,cy,2.2]],
      'right':         [[cx+w*0.55,cy,4],[cx+w*0.68,cy,3],[cx+w*0.80,cy,2.2]],
      'none':[]
    };
    return sets[tail]||sets['bottom-left'];
  }

  function wrapTextCanvas(ctx,text,maxW){
    var words=text.split(' ');
    var lines=[],cur='';
    words.forEach(function(w){
      var test=cur?cur+' '+w:w;
      if(ctx.measureText(test).width>maxW&&cur){lines.push(cur);cur=w;}
      else cur=test;
    });
    if(cur)lines.push(cur);
    return lines.length?lines:[''];
  }

  return{
    createSVG:createSVG,
    drawOnCanvas:drawOnCanvas,
    TAIL_DIRS:TAIL_DIRS,
    THOUGHT_DOTS_DIR:THOUGHT_DOTS_DIR
  };
})();
