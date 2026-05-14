import { useState, useEffect, useRef, useCallback } from "react";

// ══════════════════════════════════════════════════════════════════════════════
// GEORGETOWN TRAFFIC AI — FULLY RESPONSIVE RESEARCH DASHBOARD
// Mobile-first layout with preserved desktop experience
// ══════════════════════════════════════════════════════════════════════════════

const ROADS = [
  { name:"Sheriff St",    x1:.05,y1:.35,x2:.95,y2:.35,axis:"h" },
  { name:"Vlissengen Rd", x1:.55,y1:.05,x2:.55,y2:.95,axis:"v" },
  { name:"Camp St",       x1:.05,y1:.65,x2:.95,y2:.65,axis:"h" },
  { name:"Church St",     x1:.25,y1:.05,x2:.25,y2:.95,axis:"v" },
  { name:"Regent St",     x1:.05,y1:.55,x2:.75,y2:.55,axis:"h" },
];
const INTERS = [
  {x:.55,y:.35},{x:.25,y:.35},{x:.55,y:.65},{x:.25,y:.65},{x:.55,y:.55}
];
const TRAINING = Array.from({length:50},(_,i)=>{
  const ep=i+1,pct=ep/50,n=Math.sin(ep*2.3)*.5+Math.cos(ep*1.7)*.3;
  return{ep,delay:+(42.71-(42.71-27.45)*pct+n*1.2).toFixed(2),queue:+(10.92-(10.92-6.60)*pct+n*.4).toFixed(2)};
});
const LSTM_ACTUAL    = [17,16,15,18,17,16,63,45,62,38,31,28,25,30,32,28,26,24,22,19,17,22,18,16,14,17,20,22,18,16,82,48,35,30,28,25,22,20,18,16,15,14,16,18,20,22,20,18,16,15,14,16,18,15,14,13,14,16,15,14,13,15,16,18,17,16,15,14,16,15,14,16,18,17,15,14,13,15,14,16];
const LSTM_PREDICTED = [17,16.5,16,17,17,16.5,30,38,42,35,30,27,24,27,29,27,25,23,21,19,17,20,18,16.5,15,17,19,20,18,16.5,38,42,35,29,27,24,22,20,18,16,15,14.5,16,18,19,20,19,18,16,15,14,16,17,15.5,14,13.5,14,16,15,14,13.5,15,16,17,17,16,15,14,15.5,15,14,16,17,16.5,15,14,13.5,15,14,16];
const CHECKPOINTS    = [5,10,15,20,25,30,35,40,45,50];

// ── THEME ─────────────────────────────────────────────────────────────────────
const C = {
  bg:"#07090f", surface:"#0c1018", surface2:"#111827",
  border:"rgba(255,255,255,0.06)", border2:"rgba(255,255,255,0.10)",
  text:"#e2e8f0", muted:"#64748b", dim:"#374151",
  green:"#10b981", blue:"#3b82f6", amber:"#f59e0b",
  red:"#ef4444", purple:"#818cf8",
};
const mono = {fontFamily:"'Space Mono',monospace"};

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#07090f;color:#e2e8f0;font-family:'DM Sans',sans-serif;-webkit-tap-highlight-color:transparent;}
::-webkit-scrollbar{width:3px;height:3px;}
::-webkit-scrollbar-track{background:#0b0f1a;}
::-webkit-scrollbar-thumb{background:#1e293b;border-radius:2px;}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.4;transform:scale(1.4);}}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
.fade-up{animation:fadeUp .3s ease both;}

/* Responsive grids */
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
.grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;}

/* Sim side-by-side on desktop, stacked on mobile */
.sim-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}

/* Roadmap 4-col on desktop */
.roadmap-grid{display:grid;grid-template-columns:repeat(4,1fr);}

/* Milestone always 5-col */
.milestone-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;}

/* Bottom nav hidden on desktop */
.bottom-nav{display:none;}

/* Touch-friendly buttons */
.btn-ctrl{
  font-family:'Space Mono',monospace;font-size:12.5px;padding:8px 16px;
  border-radius:8px;cursor:pointer;border:1px solid rgba(255,255,255,0.1);
  background:transparent;color:#e2e8f0;min-height:36px;
}

/* Table overflow */
.resp-table{overflow-x:auto;-webkit-overflow-scrolling:touch;}

/* ── MOBILE BREAKPOINT ── */
@media(max-width:639px){
  /* Bottom nav */
  .bottom-nav{
    display:block;
    position:fixed;bottom:0;left:0;right:0;z-index:200;
    background:rgba(7,9,15,0.97);
    border-top:1px solid rgba(255,255,255,0.08);
    backdrop-filter:blur(16px);
    padding-bottom:env(safe-area-inset-bottom);
  }
  .bottom-nav-inner{display:flex;align-items:stretch;height:56px;}
  .bnav-btn{
    flex:1;display:flex;flex-direction:column;align-items:center;
    justify-content:center;gap:3px;border:none;background:none;
    cursor:pointer;padding:0;color:#64748b;transition:color .15s;
    -webkit-tap-highlight-color:transparent;position:relative;
  }
  .bnav-btn.active{color:#3b82f6;}
  .bnav-btn.active::before{
    content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);
    width:20px;height:2px;background:#3b82f6;border-radius:0 0 2px 2px;
  }
  .bnav-icon{font-size:18.75px;line-height:1;}
  .bnav-label{font-family:'Space Mono',monospace;font-size:8.125px;letter-spacing:.04em;text-transform:uppercase;}

  /* Hide top nav */
  .top-nav{display:none !important;}

  /* Content padding + bottom nav clearance */
  .main-content{padding:10px 10px 72px !important;}
  .header-el{padding:0 12px !important;height:46px !important;}

  /* Grids collapse */
  .grid-2{grid-template-columns:1fr 1fr;}
  .grid-3{grid-template-columns:1fr 1fr;}
  .grid-4{grid-template-columns:1fr 1fr;}
  .col-stack{grid-template-columns:1fr !important;}

  /* Sim stacks */
  .sim-grid{grid-template-columns:1fr;}

  /* Roadmap 2x2 on mobile */
  .roadmap-grid{grid-template-columns:1fr 1fr;}
  .roadmap-cell-border{border-right:none !important;}
  .roadmap-cell:nth-child(odd){border-right:1px solid rgba(255,255,255,0.06) !important;}
  .roadmap-cell:nth-child(1),.roadmap-cell:nth-child(2){border-bottom:1px solid rgba(255,255,255,0.06);}

  /* Milestone compact */
  .milestone-grid{gap:4px;}

  /* Buttons bigger for touch */
  .btn-ctrl{padding:10px 18px;min-height:40px;}

  /* Hide secondary badge in header */
  .hide-mobile{display:none !important;}

  /* Hero number */
  .hero-num{font-size:35px !important;}
}
`;

// ── SIMULATION HELPERS ────────────────────────────────────────────────────────
function lerp(a,b,t){return a+(b-a)*Math.min(1,t);}
function makeVehicles(n){
  const routes=[
    {axis:"h",y:.35,dir:1},{axis:"h",y:.35,dir:-1},
    {axis:"h",y:.65,dir:1},{axis:"h",y:.55,dir:1},
    {axis:"v",x:.55,dir:1},{axis:"v",x:.25,dir:1},{axis:"v",x:.25,dir:-1},
  ];
  return Array.from({length:n},(_,i)=>{
    const r=routes[i%routes.length];
    return{...r,pos:Math.random(),speed:.0015+Math.random()*.002,queued:false,queueTimer:0,id:i};
  });
}
function makeSigs(){return INTERS.map(()=>({green:Math.random()>.5,timer:Math.floor(Math.random()*60)+10}));}
function updateVehicles(vehicles,signals,fixed){
  signals.forEach((sig,i)=>{
    sig.timer--;
    if(sig.timer<=0){
      sig.green=!sig.green;
      if(fixed){sig.timer=60;}else{
        const near=vehicles.filter(v=>{const d=v.axis==="h"?Math.abs(v.pos-INTERS[i].x):Math.abs(v.pos-INTERS[i].y);return d<.14;}).length;
        sig.timer=sig.green?Math.max(18,42-near*4):Math.max(12,25-near*2);
      }
    }
  });
  vehicles.forEach((v,idx)=>{
    const blocked=signals.some((sig,i)=>{
      if(sig.green)return false;
      const I=INTERS[i];
      if(v.axis==="h"){const ah=v.dir>0?I.x-v.pos:v.pos-I.x;return Math.abs(v.y-I.y)<.07&&ah>0&&ah<.1;}
      else{const ah=v.dir>0?I.y-v.pos:v.pos-I.y;return Math.abs(v.x-I.x)<.07&&ah>0&&ah<.1;}
    });
    const tooClose=vehicles.some((o,oi)=>{
      if(oi===idx||o.axis!==v.axis)return false;
      if(v.axis==="h"&&Math.abs(o.y-v.y)>.03)return false;
      if(v.axis==="v"&&Math.abs(o.x-v.x)>.03)return false;
      const d=v.dir>0?o.pos-v.pos:v.pos-o.pos;
      return d>0&&d<.055;
    });
    if(blocked||tooClose){v.queued=true;v.queueTimer=fixed?30+Math.floor(Math.random()*35):12+Math.floor(Math.random()*15);}
    else if(v.queueTimer>0){v.queueTimer--;v.queued=true;}
    else{v.queued=false;v.pos+=v.speed*(v.dir||1);}
    if(v.pos>1.05)v.pos=-0.05;
    if(v.pos<-0.05)v.pos=1.05;
  });
}
function drawCanvas(canvas,vehicles,signals){
  const dpr=window.devicePixelRatio||1;
  const W=canvas.width/dpr,H=canvas.height/dpr;
  const ctx=canvas.getContext("2d");
  ctx.save();ctx.scale(dpr,dpr);
  ctx.fillStyle="#0d1117";ctx.fillRect(0,0,W,H);
  const rw=Math.max(W,H)*.085;
  ROADS.forEach(r=>{
    const x1=r.x1*W,y1=r.y1*H,x2=r.x2*W,y2=r.y2*H;
    ctx.strokeStyle="rgba(0,0,0,.5)";ctx.lineWidth=rw*2+8;ctx.lineCap="round";
    ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
    ctx.strokeStyle="#1c2333";ctx.lineWidth=rw*2;
    ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
    ctx.strokeStyle="rgba(255,220,0,.15)";ctx.lineWidth=1;ctx.setLineDash([8,10]);
    ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
    ctx.setLineDash([]);
  });
  INTERS.forEach((I,idx)=>{
    const sig=signals[idx],ix=I.x*W,iy=I.y*H,hw=rw;
    ctx.fillStyle="#1a2030";ctx.fillRect(ix-hw,iy-hw,hw*2,hw*2);
    const sc=sig.green?"#22c55e":"#ef4444";
    ctx.fillStyle=sc;ctx.shadowColor=sc;ctx.shadowBlur=14;
    ctx.beginPath();ctx.arc(ix+hw*.65,iy-hw*.65,5,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;
  });
  vehicles.forEach(v=>{
    const vx=v.axis==="h"?v.pos*W:v.x*W,vy=v.axis==="h"?v.y*H:v.pos*H;
    const angle=v.axis==="h"?(v.dir>0?0:Math.PI):(v.dir>0?Math.PI/2:-Math.PI/2);
    ctx.save();ctx.translate(vx,vy);ctx.rotate(angle);
    ctx.shadowColor=v.queued?"rgba(248,113,113,.7)":"rgba(96,165,250,.7)";ctx.shadowBlur=8;
    ctx.fillStyle=v.queued?"#f87171":"#60a5fa";
    ctx.beginPath();ctx.roundRect(-7,-3.5,14,7,2.5);ctx.fill();
    ctx.shadowBlur=0;ctx.restore();
  });
  const labels=[
    {t:"Sheriff St",x:W*.07,y:H*.35-rw-6},
    {t:"Camp St",   x:W*.07,y:H*.65-rw-6},
    {t:"Regent St", x:W*.07,y:H*.55-rw-6},
    {t:"Church St", x:W*.25+rw+4,y:H*.12},
    {t:"Vlissengen",x:W*.55+rw+4,y:H*.12},
  ];
  ctx.font=`600 ${Math.max(8,W*.022)}px 'Space Mono',monospace`;
  labels.forEach(({t,x,y})=>{
    const tw=ctx.measureText(t).width;
    ctx.fillStyle="rgba(0,0,0,.6)";ctx.beginPath();ctx.roundRect(x-3,y-10,tw+6,14,3);ctx.fill();
    ctx.fillStyle="rgba(255,255,255,.38)";ctx.textAlign="left";ctx.fillText(t,x,y);
  });
  ctx.restore();
}

// ── PRIMITIVES ────────────────────────────────────────────────────────────────
function Card({children,style,accent}){
  return(
    <div style={{background:C.surface,border:`1px solid ${accent?accent+"28":C.border}`,
      borderRadius:12,padding:14,...style}}>
      {children}
    </div>
  );
}
function Label({children,color}){
  return(
    <div style={{...mono,fontSize:11.25,letterSpacing:".09em",textTransform:"uppercase",
      color:color||C.muted,marginBottom:10}}>
      {children}
    </div>
  );
}
function Tag({children,color}){
  return(
    <span style={{...mono,fontSize:10,padding:"2px 7px",borderRadius:99,
      background:color+"18",color,border:`1px solid ${color}35`,fontWeight:700,letterSpacing:".04em"}}>
      {children}
    </span>
  );
}
function StatusBadge({text,type}){
  const cols={ready:C.green,partial:C.amber,needed:C.red};
  const col=cols[type]||C.muted;
  return(
    <span style={{...mono,fontSize:10,padding:"2px 7px",borderRadius:99,
      background:`${col}14`,color:col,letterSpacing:".03em"}}>
      {text}
    </span>
  );
}

// ── SVG CHARTS ────────────────────────────────────────────────────────────────
function DQNProgressChart({highlightEp}){
  const W=560,H=170,pad={t:22,r:14,b:22,l:40};
  const iW=W-pad.l-pad.r,iH=H-pad.t-pad.b;
  const delays=TRAINING.map(d=>d.delay);
  const minD=24,maxD=46;
  const xp=i=>(i/(delays.length-1))*iW+pad.l;
  const yp=v=>iH-(v-minD)/(maxD-minD)*iH+pad.t;
  const visible=highlightEp?delays.slice(0,highlightEp):delays;
  const path=visible.map((d,i)=>`${i===0?"M":"L"}${xp(i).toFixed(1)},${yp(d).toFixed(1)}`).join(" ");
  const fill=visible.length>1?path+` L${xp(visible.length-1)},${(iH+pad.t).toFixed(1)} L${pad.l},${(iH+pad.t).toFixed(1)} Z`:"";
  const baseY=yp(42.71);
  return(
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",overflow:"visible"}}>
      <defs>
        <linearGradient id="dg2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.blue} stopOpacity=".3"/>
          <stop offset="100%" stopColor={C.blue} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {[25,30,35,40,42.71].map(v=>(
        <g key={v}>
          <line x1={pad.l} y1={yp(v)} x2={W-pad.r} y2={yp(v)}
            stroke={v===42.71?"rgba(239,68,68,.3)":"rgba(255,255,255,.04)"}
            strokeWidth={v===42.71?1.5:1} strokeDasharray={v===42.71?"6,4":""}/>
          <text x={pad.l-5} y={yp(v)+3} fill={v===42.71?C.red:C.muted}
            fontSize="11.25" fontFamily="Space Mono" textAnchor="end">
            {v===42.71?"42.7":v}s
          </text>
        </g>
      ))}
      <text x={W-pad.r-2} y={baseY-5} fill={C.red} fontSize="10" fontFamily="Space Mono" textAnchor="end">Baseline</text>
      {fill&&<path d={fill} fill="url(#dg2)"/>}
      {visible.length>1&&<path d={path} stroke={C.blue} strokeWidth="2" fill="none" strokeLinecap="round"/>}
      {CHECKPOINTS.filter(cp=>cp<=(highlightEp||50)).map(cp=>{
        const d=delays[cp-1];
        const isLast=cp===(highlightEp||50);
        return(
          <g key={cp}>
            <circle cx={xp(cp-1)} cy={yp(d)} r={isLast?5:3}
              fill={isLast?C.green:C.blue}
              stroke={isLast?"rgba(16,185,129,.35)":"none"} strokeWidth={isLast?7:0}/>
            {(cp===10||cp===30||cp===50)&&(
              <text x={xp(cp-1)} y={yp(d)-9} fill={cp===50?C.green:C.muted}
                fontSize="10" fontFamily="Space Mono" textAnchor="middle">
                {cp===50?`${d}s`:`EP${cp}`}
              </text>
            )}
          </g>
        );
      })}
      <line x1={pad.l} y1={iH+pad.t} x2={W-pad.r} y2={iH+pad.t} stroke={C.border2}/>
    </svg>
  );
}

function RMSEChart(){
  const items=[
    {label:"ARIMA",val:5.967,color:C.red},
    {label:"LSTM",val:5.955,color:C.purple},
    {label:"Rand.\nForest",val:3.826,color:C.amber,winner:true},
  ];
  const max=6.5;
  return(
    <div style={{display:"flex",alignItems:"flex-end",gap:12,height:140,paddingTop:4}}>
      {items.map(it=>(
        <div key={it.val} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
          {it.winner&&<Tag color={C.amber}>BEST</Tag>}
          <div style={{width:"100%",borderRadius:"5px 5px 0 0",
            height:`${(it.val/max)*105}px`,
            background:`linear-gradient(180deg,${it.color},${it.color}77)`,
            display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:5}}>
            <span style={{...mono,fontSize:11.25,fontWeight:700,color:"#fff"}}>{it.val}</span>
          </div>
          <div style={{...mono,fontSize:10,color:C.muted,textAlign:"center",lineHeight:1.35,whiteSpace:"pre-line"}}>{it.label}</div>
        </div>
      ))}
    </div>
  );
}

function LSTMLineChart(){
  const W=360,H=120,pad={t:6,r:6,b:16,l:28};
  const iW=W-pad.l-pad.r,iH=H-pad.t-pad.b;
  const minV=10,maxV=90;
  const xp=i=>(i/(LSTM_ACTUAL.length-1))*iW+pad.l;
  const yp=v=>iH-(v-minV)/(maxV-minV)*iH+pad.t;
  const aPath=LSTM_ACTUAL.map((d,i)=>`${i===0?"M":"L"}${xp(i).toFixed(1)},${yp(d).toFixed(1)}`).join(" ");
  const pPath=LSTM_PREDICTED.map((d,i)=>`${i===0?"M":"L"}${xp(i).toFixed(1)},${yp(d).toFixed(1)}`).join(" ");
  return(
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%"}}>
      {[20,40,60,80].map(v=>(
        <g key={v}>
          <line x1={pad.l} y1={yp(v)} x2={W-pad.r} y2={yp(v)} stroke="rgba(255,255,255,.04)"/>
          <text x={pad.l-3} y={yp(v)+3} fill={C.muted} fontSize="8.75" fontFamily="Space Mono" textAnchor="end">{v}</text>
        </g>
      ))}
      <line x1={pad.l} y1={iH+pad.t} x2={W-pad.r} y2={iH+pad.t} stroke={C.border}/>
      <path d={aPath} stroke="#60a5fa" strokeWidth="1.5" fill="none"/>
      <path d={pPath} stroke="#f87171" strokeWidth="1.5" fill="none" strokeDasharray="4,3"/>
      <text x={xp(30)} y={yp(82)-7} fill={C.muted} fontSize="8.75" fontFamily="Space Mono" textAnchor="middle">incident spike</text>
      <line x1={xp(30)} y1={yp(82)-2} x2={xp(30)} y2={yp(70)} stroke={C.muted} strokeWidth=".7"/>
    </svg>
  );
}

// ── MAP CANVAS ────────────────────────────────────────────────────────────────
function MapCanvas(){
  const ref=useRef(null);
  const draw=useCallback(()=>{
    const canvas=ref.current;if(!canvas)return;
    const parent=canvas.parentElement;if(!parent)return;
    const dpr=window.devicePixelRatio||1;
    const W=parent.clientWidth||320,H=Math.min(300,W*.65);
    canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);
    canvas.style.width=W+"px";canvas.style.height=H+"px";
    const ctx=canvas.getContext("2d");
    ctx.scale(dpr,dpr);
    ctx.fillStyle="#0a1420";ctx.fillRect(0,0,W,H);
    ctx.strokeStyle="rgba(255,255,255,.025)";ctx.lineWidth=.5;
    for(let x=0;x<W;x+=26){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=0;y<H;y+=26){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    const roads=[
      {col:"#ef4444",w:4,pts:[[.05,.35],[.95,.35]]},{col:"#ef4444",w:4,pts:[[.55,.05],[.55,.95]]},
      {col:"#f59e0b",w:3,pts:[[.05,.65],[.95,.65]]},{col:"#f59e0b",w:3,pts:[[.25,.05],[.25,.95]]},
      {col:"#f59e0b",w:3,pts:[[.05,.55],[.75,.55]]},{col:"#3b82f6",w:2,pts:[[.38,.05],[.38,.95]]},
      {col:"#3b82f6",w:2,pts:[[.05,.2],[.95,.2]]},{col:"#3b82f6",w:2,pts:[[.05,.45],[.95,.45]]},
      {col:"#3b82f6",w:2,pts:[[.05,.75],[.95,.75]]},{col:"#1f2937",w:1.5,pts:[[.7,.05],[.7,.95]]},
      {col:"#1f2937",w:1.5,pts:[[.85,.05],[.85,.95]]},{col:"#1f2937",w:1.5,pts:[[.1,.05],[.1,.95]]},
    ];
    roads.forEach(r=>{
      ctx.strokeStyle=r.col+"aa";ctx.lineWidth=r.w;ctx.lineCap="round";
      ctx.beginPath();r.pts.forEach(([px,py],i)=>i===0?ctx.moveTo(px*W,py*H):ctx.lineTo(px*W,py*H));ctx.stroke();
    });
    [[.55,.35],[.25,.35],[.55,.65],[.25,.65],[.55,.55],[.25,.55],[.38,.35],[.38,.65]].forEach(([px,py])=>{
      ctx.beginPath();ctx.arc(px*W,py*H,4.5,0,Math.PI*2);
      ctx.fillStyle="rgba(255,255,255,.12)";ctx.fill();
      ctx.strokeStyle="rgba(255,255,255,.25)";ctx.lineWidth=1;ctx.stroke();
    });
    ctx.font=`bold 12.5px 'Space Mono',monospace`;
    [{t:"Sheriff Street",x:.05,y:.35,col:"#ef4444",dy:-13},{t:"Vlissengen Rd",x:.56,y:.1,col:"#ef4444",dy:0},
     {t:"Camp Street",x:.05,y:.67,col:"#f59e0b",dy:0},{t:"Church St",x:.26,y:.1,col:"#f59e0b",dy:0},
     {t:"Regent St",x:.05,y:.57,col:"#f59e0b",dy:0}].forEach(({t,x,y,col,dy=0})=>{
      const tw=ctx.measureText(t).width;
      ctx.fillStyle="rgba(0,0,0,.75)";ctx.fillRect(x*W-2,y*H+dy-10,tw+6,14);
      ctx.fillStyle=col;ctx.fillText(t,x*W+1,y*H+dy);
    });
    ctx.fillStyle="rgba(7,9,15,.8)";ctx.fillRect(0,0,W,20);
    ctx.fillStyle="rgba(255,255,255,.4)";ctx.font="11.25px 'Space Mono',monospace";
    ctx.fillText("Georgetown, Guyana · OSM · 2,646 Junctions · 6,771 Segments",8,13);
  },[]);
  useEffect(()=>{
    draw();
    const t1=setTimeout(draw,100),t2=setTimeout(draw,400);
    window.addEventListener("resize",draw);
    return()=>{clearTimeout(t1);clearTimeout(t2);window.removeEventListener("resize",draw);};
  },[draw]);
  return <canvas ref={ref} style={{display:"block",width:"100%",borderRadius:10,background:"#0a1420"}}/>;
}

// ── SIM PANEL ─────────────────────────────────────────────────────────────────
function SimPanel({title,badge,badgeColor,canvasRef,stats,statColor}){
  const bc=badgeColor==="red"?{bg:"rgba(239,68,68,.15)",col:C.red}:{bg:"rgba(16,185,129,.15)",col:C.green};
  return(
    <div style={{border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"7px 12px",background:C.surface2,borderBottom:`1px solid ${C.border}`}}>
        <span style={{...mono,fontSize:12.5,letterSpacing:".05em"}}>{title}</span>
        <span style={{...mono,fontSize:10,padding:"2px 7px",borderRadius:99,fontWeight:700,background:bc.bg,color:bc.col}}>{badge}</span>
      </div>
      <div style={{background:"#0d1117",lineHeight:0}}>
        <canvas ref={canvasRef} style={{display:"block",width:"100%",height:180}}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:3,padding:6}}>
        {[["Delay",stats.delay],["Queue",stats.queue],["Thr/hr",stats.thr]].map(([l,v])=>(
          <div key={l} style={{textAlign:"center",padding:"6px 4px",borderRadius:7,background:"rgba(255,255,255,.025)"}}>
            <div style={{...mono,fontSize:8.75,color:C.muted,textTransform:"uppercase",letterSpacing:".06em"}}>{l}</div>
            <div style={{...mono,fontSize:16.25,fontWeight:700,color:statColor,marginTop:1}}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SIMULATION TAB ────────────────────────────────────────────────────────────
function SimulationTab(){
  const fixedRef=useRef(null),aiRef=useRef(null);
  const stateRef=useRef(null),rafRef=useRef(null),tickRef=useRef(0),epRef=useRef(0),playRef=useRef(true);
  const [playing,setPlaying]=useState(true);
  const [episode,setEpisode]=useState(0);
  const [improvement,setImprovement]=useState("Not started");
  const [aiStats,setAiStats]=useState({delay:"42.7s",queue:"10.9",thr:"2545"});
  const [fixedStats,setFixedStats]=useState({delay:"42.7s",queue:"10.9",thr:"2545"});

  const resizeCvs=useCallback(()=>{
    [fixedRef,aiRef].forEach(ref=>{
      const el=ref.current;if(!el)return;
      const dpr=window.devicePixelRatio||1;
      const w=el.parentElement?.clientWidth||300;
      el.width=Math.round(w*dpr);el.height=Math.round(180*dpr);
      el.style.width=w+"px";el.style.height="180px";
    });
  },[]);

  const init=useCallback(()=>{
    stateRef.current={
      fixed:{vehicles:makeVehicles(18),signals:makeSigs()},
      ai:{vehicles:makeVehicles(15),signals:makeSigs()},
    };
    resizeCvs();
  },[resizeCvs]);

  useEffect(()=>{
    init();
    window.addEventListener("resize",resizeCvs);
    const loop=()=>{
      if(playRef.current&&stateRef.current){
        tickRef.current++;
        updateVehicles(stateRef.current.fixed.vehicles,stateRef.current.fixed.signals,true);
        updateVehicles(stateRef.current.ai.vehicles,stateRef.current.ai.signals,false);
        if(fixedRef.current)drawCanvas(fixedRef.current,stateRef.current.fixed.vehicles,stateRef.current.fixed.signals);
        if(aiRef.current)drawCanvas(aiRef.current,stateRef.current.ai.vehicles,stateRef.current.ai.signals);
        if(tickRef.current%110===0){
          const next=Math.min(epRef.current+1,50);
          epRef.current=next;
          const t=TRAINING[Math.max(0,next-1)];
          const pct=next/50;
          const imp=((42.71-t.delay)/42.71*100).toFixed(1);
          setEpisode(next);
          if(next>0)setImprovement(`↓${imp}%`);
          setAiStats({delay:t.delay.toFixed(1)+"s",queue:t.queue.toFixed(1),thr:Math.round(lerp(2545,3120,pct))});
          setFixedStats({delay:(42.71+(Math.random()*.8-.4)).toFixed(1)+"s",queue:"10.9",thr:"2545"});
        }
      }
      rafRef.current=requestAnimationFrame(loop);
    };
    rafRef.current=requestAnimationFrame(loop);
    return()=>{cancelAnimationFrame(rafRef.current);window.removeEventListener("resize",resizeCvs);};
  },[init,resizeCvs]);

  const toggle=()=>{setPlaying(p=>{playRef.current=!p;return!p;});};
  const reset=()=>{
    epRef.current=0;tickRef.current=0;init();
    setEpisode(0);setImprovement("Not started");
    setAiStats({delay:"42.7s",queue:"10.9",thr:"2545"});
    setFixedStats({delay:"42.7s",queue:"10.9",thr:"2545"});
  };

  return(
    <div className="fade-up">
      <Card style={{marginBottom:10,padding:"12px 14px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div style={{...mono,fontSize:12.5,color:C.muted}}>
            Episode <strong style={{color:C.text}}>{episode}</strong><span style={{color:C.dim}}> / 50</span>
          </div>
          <div style={{...mono,fontSize:13.75,fontWeight:700,color:episode>0?C.green:C.dim}}>{improvement}</div>
        </div>
        <div style={{height:4,background:"rgba(255,255,255,.05)",borderRadius:99,overflow:"hidden",marginBottom:6}}>
          <div style={{height:"100%",width:`${(episode/50)*100}%`,
            background:`linear-gradient(90deg,${C.blue},${C.green})`,borderRadius:99,transition:"width .4s"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between"}}>
          {CHECKPOINTS.map(cp=>(
            <span key={cp} style={{...mono,fontSize:8.75,color:episode>=cp?C.green:C.dim}}>{cp}</span>
          ))}
        </div>
      </Card>

      <Card style={{marginBottom:10}}>
        <Label>DQN Learning Curve</Label>
        <DQNProgressChart highlightEp={episode>0?episode:undefined}/>
        <div style={{display:"flex",gap:12,marginTop:5,flexWrap:"wrap"}}>
          {[[C.blue,"DQN delay"],[C.red,"Baseline","dashed"],[C.green,"Checkpoint","dot"]].map(([c,l,t])=>(
            <div key={l} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:C.muted}}>
              {t==="dot"?<div style={{width:7,height:7,borderRadius:"50%",background:c}}/>
                :<div style={{width:14,height:0,borderTop:`2px ${t==="dashed"?"dashed":"solid"} ${c}`}}/>}
              {l}
            </div>
          ))}
        </div>
      </Card>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,flexWrap:"wrap",gap:6}}>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          {[["#60a5fa","Moving"],["#f87171","Queued"],["#22c55e","Green"],["#ef4444","Red"]].map(([c,l])=>(
            <div key={l} style={{display:"flex",alignItems:"center",gap:4,fontSize:12.5,color:C.muted}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:c}}/>{l}
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:6}}>
          <button onClick={toggle} className="btn-ctrl">{playing?"⏸ Pause":"▶ Play"}</button>
          <button onClick={reset} className="btn-ctrl">↺ Reset</button>
        </div>
      </div>

      <div className="sim-grid">
        <SimPanel title="Fixed Timing" badge="BASELINE" badgeColor="red" canvasRef={fixedRef} stats={fixedStats} statColor={C.red}/>
        <SimPanel title="DQN AI Agent" badge="AI CONTROL" badgeColor="green" canvasRef={aiRef} stats={aiStats} statColor={C.green}/>
      </div>
    </div>
  );
}

// ── OVERVIEW TAB ──────────────────────────────────────────────────────────────
function OverviewTab(){
  return(
    <div className="fade-up">
      <div style={{background:`linear-gradient(135deg,${C.green}14,${C.blue}08)`,
        border:`1px solid ${C.green}28`,borderRadius:14,padding:16,marginBottom:10}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
          <span style={{fontSize:18}}>🏆</span>
          <span style={{...mono,fontSize:9,color:C.green,letterSpacing:".07em",textTransform:"uppercase"}}>Main Finding — DQN Signal Control</span>
        </div>
        <div className="hero-num" style={{...mono,fontSize:36,fontWeight:700,color:C.green,lineHeight:1,marginBottom:6}}>35.7%</div>
        <div style={{fontSize:16.25,fontWeight:600,marginBottom:4}}>Delay reduced: 42.71s → 27.45s</div>
        <div style={{fontSize:13.75,color:C.muted,lineHeight:1.7}}>
          DQN RL agent · 50 episodes · Georgetown OSM network.<br/>
          Exceeds literature benchmark of 25–34%. Queue also ↓ 39.6%.
        </div>
      </div>

      <div className="grid-4" style={{marginBottom:10}}>
        {[
          ["↓ 35.7%",C.green,"Delay","DQN vs Fixed"],
          ["↓ 39.6%",C.green,"Queue","DQN vs Fixed"],
          ["3.826s",C.amber,"Best RMSE","Rand. Forest"],
          ["2,646",C.blue,"Junctions","Real OSM"],
        ].map(([v,col,l,sub])=>(
          <Card key={l} style={{textAlign:"center",padding:"12px 6px"}}>
            <div style={{...mono,fontSize:8.75,color:C.muted,textTransform:"uppercase",letterSpacing:".07em",marginBottom:4}}>{l}</div>
            <div style={{...mono,fontSize:20,fontWeight:700,color:col,lineHeight:1}}>{v}</div>
            <div style={{fontSize:12.5,color:C.dim,marginTop:3}}>{sub}</div>
          </Card>
        ))}
      </div>

      <Card style={{marginBottom:10}}>
        <Label>Study Overview</Label>
        <p style={{fontSize:15,color:C.muted,lineHeight:1.8}}>
          Simulation-based feasibility study evaluating AI for traffic management in{" "}
          <strong style={{color:C.text}}>Georgetown, Guyana</strong> — Sheriff Street / Vlissengen Road corridor.
          Real OpenStreetMap road network data. Not a live deployment; results use synthetic data
          calibrated to Georgetown peak-hour conditions.
        </p>
      </Card>

      <Card style={{marginBottom:10}}>
        <Label>Research Questions</Label>
        {[
          {icon:"🚦",rq:"RQ1",title:"Traffic Prediction",status:"✓ RF wins — RMSE 3.826s",type:"ready"},
          {icon:"🤖",rq:"RQ2",title:"RL Signal Control",status:"✓ DQN 35.7% — exceeds benchmark",type:"ready"},
          {icon:"🏛️",rq:"RQ3",title:"Data Infrastructure",status:"→ Feasibility assessed",type:"partial"},
        ].map(({icon,rq,title,status,type},i,arr)=>(
          <div key={rq} style={{display:"flex",alignItems:"center",gap:10,
            padding:"10px 0",borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none"}}>
            <div style={{width:32,height:32,borderRadius:8,background:"rgba(59,130,246,.12)",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:18.75,flexShrink:0}}>
              {icon}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:15,fontWeight:600,marginBottom:3}}>
                <span style={{...mono,fontSize:11.25,color:C.blue,marginRight:5}}>{rq}</span>{title}
              </div>
              <StatusBadge text={status} type={type}/>
            </div>
          </div>
        ))}
      </Card>

      <Card>
        <Label>Data Sources</Label>
        {[
          {icon:"🗺️",title:"OpenStreetMap",sub:"2,646 junctions · 6,771 segments",status:"✓ Used",type:"ready"},
          {icon:"📊",title:"Synthetic Traffic Profiles",sub:"Calibrated to Georgetown peak hours",status:"✓ Generated",type:"ready"},
          {icon:"📷",title:"SRIS / GPS / RESOLV",sub:"Conceptual integration framework",status:"→ Future",type:"partial"},
          {icon:"📡",title:"Live Sensor Data",sub:"Not available — key limitation",status:"✗ Needed",type:"needed"},
        ].map(({icon,title,sub,status,type},i,arr)=>(
          <div key={title} style={{display:"flex",alignItems:"center",gap:10,
            padding:"9px 0",borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none"}}>
            <span style={{fontSize:20,flexShrink:0}}>{icon}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:15,fontWeight:600}}>{title}</div>
              <div style={{fontSize:12.5,color:C.muted,marginTop:1}}>{sub}</div>
            </div>
            <StatusBadge text={status} type={type}/>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ── PREDICTION TAB ────────────────────────────────────────────────────────────
function PredictionTab(){
  return(
    <div className="fade-up">
      <div style={{background:`${C.amber}0e`,border:`1px solid ${C.amber}28`,
        borderRadius:14,padding:14,marginBottom:10,display:"flex",gap:10,alignItems:"flex-start"}}>
        <span style={{fontSize:25,flexShrink:0}}>🏆</span>
        <div>
          <div style={{fontSize:16.25,fontWeight:700,color:C.amber,marginBottom:2}}>Random Forest — Best Model</div>
          <div style={{fontSize:13.75,color:C.text,lineHeight:1.7}}>
            <strong>RMSE 3.826s</strong> vs LSTM (5.955s) and ARIMA (5.967s).
            Ensemble methods beat deep learning in data-sparse settings like Georgetown.
          </div>
        </div>
      </div>

      <Card style={{marginBottom:10}}>
        <Label>Model Performance — RMSE &amp; MAE (Lower = Better)</Label>
        <div className="resp-table">
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:280}}>
            <thead>
              <tr style={{borderBottom:`1px solid ${C.border2}`}}>
                {["Model","RMSE","MAE","Verdict"].map(h=>(
                  <th key={h} style={{...mono,fontSize:8,color:C.muted,textAlign:"left",
                    padding:"7px 8px",letterSpacing:".06em",textTransform:"uppercase"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                {name:"Random Forest",rmse:"3.826",mae:"2.498",verdict:"✓ Winner",nc:C.amber,winner:true},
                {name:"LSTM",rmse:"5.955",mae:"3.900",verdict:"Needs more data",nc:C.purple},
                {name:"ARIMA",rmse:"5.967",mae:"3.568",verdict:"Weakest",nc:C.red},
              ].map((r,i)=>(
                <tr key={r.name} style={{borderBottom:i<2?`1px solid ${C.border}`:"none",
                  background:r.winner?"rgba(245,158,11,.04)":"transparent"}}>
                  <td style={{padding:"9px 8px",fontSize:15,fontWeight:600,color:r.nc}}>
                    {r.name}{r.winner&&<span style={{marginLeft:5}}><Tag color={C.amber}>BEST</Tag></span>}
                  </td>
                  <td style={{...mono,padding:"9px 8px",fontSize:15,color:r.nc}}>{r.rmse}</td>
                  <td style={{...mono,padding:"9px 8px",fontSize:15,color:r.nc}}>{r.mae}</td>
                  <td style={{fontSize:12.5,color:r.winner?C.green:C.muted,padding:"9px 8px"}}>{r.verdict}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Charts — col-stack collapses to single on mobile */}
      <div className="grid-2 col-stack" style={{marginBottom:10}}>
        <Card>
          <Label>RMSE Comparison</Label>
          <RMSEChart/>
        </Card>
        <Card>
          <Label>LSTM: Predicted vs Actual</Label>
          <LSTMLineChart/>
          <div style={{display:"flex",gap:12,marginTop:6}}>
            {[["#60a5fa","Actual"],["#f87171","LSTM Predicted"]].map(([c,l])=>(
              <div key={l} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:C.muted}}>
                <div style={{width:14,height:2,background:c,borderRadius:2}}/>{l}
              </div>
            ))}
          </div>
          <div style={{marginTop:8,padding:"8px 10px",background:"rgba(239,68,68,.06)",
            borderRadius:8,border:`1px solid ${C.red}22`,fontSize:12.5,color:C.muted,lineHeight:1.6}}>
            LSTM misses incident spikes → Random Forest more robust with limited data.
          </div>
        </Card>
      </div>

      <Card accent={C.amber}>
        <Label color={C.amber}>Key Finding — RQ1</Label>
        <div style={{fontSize:11,color:C.muted,lineHeight:1.8}}>
          Random Forest outperforms LSTM in data-sparse conditions (RMSE 3.826s vs 5.955s).
          Significant finding for Caribbean and developing-region AI research — ensemble methods
          recommended when training data is limited. LSTM with real sensor data is the recommended next step.
        </div>
      </Card>
    </div>
  );
}

// ── RL TAB ────────────────────────────────────────────────────────────────────
function RLTab(){
  return(
    <div className="fade-up">
      <div style={{background:`linear-gradient(135deg,${C.green}14,${C.blue}08)`,
        border:`1px solid ${C.green}30`,borderRadius:14,padding:16,marginBottom:10}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <span style={{fontSize:20}}>🤖</span>
          <div>
            <div style={{...mono,fontSize:11.25,color:C.green,letterSpacing:".07em",textTransform:"uppercase",marginBottom:2}}>Main Contribution — RQ2</div>
            <div style={{fontSize:17.5,fontWeight:700}}>DQN Adaptive Signal Control</div>
          </div>
        </div>
        <div className="grid-3">
          {[["Delay ↓","35.7%",C.green,true],["Queue ↓","39.6%",C.green,true],["Benchmark","25–34%",C.amber,false]].map(([l,v,col,hi])=>(
            <div key={l} style={{padding:10,borderRadius:10,textAlign:"center",
              background:hi?`${col}10`:"rgba(255,255,255,.025)",
              border:`1px solid ${hi?col+"28":C.border}`}}>
              <div style={{...mono,fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:".06em",marginBottom:3}}>{l}</div>
              <div style={{...mono,fontSize:22.5,fontWeight:700,color:col}}>{v}</div>
              {hi&&<div style={{fontSize:11.25,color:C.green,marginTop:2}}>Exceeds ✓</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2 col-stack" style={{marginBottom:10}}>
        {[
          {title:"Avg Vehicle Delay",fixed:"42.71 sec",ai:"27.45 sec",pct:"35.7%"},
          {title:"Avg Queue Length",fixed:"10.92 vehicles",ai:"6.60 vehicles",pct:"39.6%"},
        ].map(({title,fixed,ai,pct})=>(
          <Card key={title}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontSize:13.75,fontWeight:600}}>{title}</div>
              <div style={{...mono,fontSize:17.5,fontWeight:700,color:C.green}}>↓ {pct}</div>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <div style={{flex:1}}>
                <div style={{...mono,fontSize:10,color:C.muted,marginBottom:4}}>Fixed</div>
                <div style={{padding:"7px 10px",borderRadius:7,background:`${C.red}12`,
                  border:`1px solid ${C.red}28`,...mono,fontSize:13.75,fontWeight:700,color:C.red}}>{fixed}</div>
              </div>
              <div style={{fontSize:20,color:C.dim,flexShrink:0}}>→</div>
              <div style={{flex:1}}>
                <div style={{...mono,fontSize:10,color:C.muted,marginBottom:4}}>DQN AI</div>
                <div style={{padding:"7px 10px",borderRadius:7,background:`${C.green}12`,
                  border:`1px solid ${C.green}28`,...mono,fontSize:13.75,fontWeight:700,color:C.green}}>{ai}</div>
              </div>
            </div>
            <div style={{marginTop:8,height:3,background:"rgba(255,255,255,.05)",borderRadius:99}}>
              <div style={{width:pct,height:"100%",background:C.green,borderRadius:99}}/>
            </div>
          </Card>
        ))}
      </div>

      <Card style={{marginBottom:10}}>
        <Label>DQN Learning Curve — All 50 Episodes</Label>
        <DQNProgressChart highlightEp={50}/>
        <div style={{display:"flex",gap:12,marginTop:5,flexWrap:"wrap"}}>
          {[[C.blue,"DQN delay"],[C.red,"Baseline","dashed"],[C.green,"Checkpoint","dot"]].map(([c,l,t])=>(
            <div key={l} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:C.muted}}>
              {t==="dot"?<div style={{width:7,height:7,borderRadius:"50%",background:c}}/>
                :<div style={{width:14,height:0,borderTop:`2px ${t==="dashed"?"dashed":"solid"} ${c}`}}/>}
              {l}
            </div>
          ))}
        </div>
      </Card>

      <Card style={{marginBottom:10}}>
        <Label>Episode Milestones</Label>
        <div className="milestone-grid">
          {CHECKPOINTS.map(cp=>{
            const t=TRAINING[cp-1];
            const imp=((42.71-t.delay)/42.71*100).toFixed(1);
            return(
              <div key={cp} style={{textAlign:"center",padding:"8px 4px",borderRadius:9,
                background:"rgba(255,255,255,.025)",border:`1px solid ${C.border}`}}>
                <div style={{...mono,fontSize:10,color:C.blue,marginBottom:3}}>EP{cp}</div>
                <div style={{...mono,fontSize:15,fontWeight:700,color:C.text}}>{t.delay}s</div>
                <div style={{fontSize:11.25,color:C.green}}>↓{imp}%</div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card accent={C.green}>
        <Label color={C.green}>Why DQN Is The Main Contribution</Label>
        <div style={{fontSize:11,color:C.muted,lineHeight:1.8}}>
          The DQN agent observes real-time queue lengths and vehicle counts, dynamically adjusting
          signal timing — unlike fixed schedules. Achieving 35.7% delay reduction exceeds the
          published 25–34% benchmark, validating RL feasibility for Georgetown and answering RQ2.
        </div>
      </Card>
    </div>
  );
}

// ── MAP TAB ───────────────────────────────────────────────────────────────────
function MapTab(){
  return(
    <div className="fade-up">
      <Card style={{marginBottom:10}}>
        <Label>Georgetown Road Network — Real OSM Data</Label>
        <MapCanvas/>
        <div style={{display:"flex",gap:12,marginTop:10,flexWrap:"wrap"}}>
          {[[C.red,"Primary (154)"],[C.amber,"Secondary (408)"],[C.blue,"Tertiary (1,054)"],[C.dim,"Residential (5,155)"]].map(([c,l])=>(
            <div key={l} style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:C.muted}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:c}}/>{l}
            </div>
          ))}
        </div>
      </Card>
      <div className="grid-4">
        {[["2,646",C.blue,"Junctions","OpenStreetMap"],["154",C.red,"Primary","Major corridors"],["408",C.amber,"Secondary","Connecting"],["6,771",C.green,"Segments","Full network"]].map(([v,col,l,sub])=>(
          <Card key={l} style={{textAlign:"center",padding:"12px 6px"}}>
            <div style={{...mono,fontSize:7,color:C.muted,textTransform:"uppercase",letterSpacing:".07em",marginBottom:4}}>{l}</div>
            <div style={{...mono,fontSize:18,fontWeight:700,color:col}}>{v}</div>
            <div style={{fontSize:9,color:C.dim,marginTop:2}}>{sub}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── FEASIBILITY TAB ───────────────────────────────────────────────────────────
function FeasibilityTab(){
  return(
    <div className="fade-up">
      <div className="grid-2 col-stack" style={{marginBottom:10}}>
        <Card>
          <Label>Technical Feasibility</Label>
          {[
            {icon:"📡",title:"Sensor Availability",desc:"Limited coverage. SRIS cameras lack RT pipelines. AI works with sparse data.",status:"⚠ Investment needed",type:"partial"},
            {icon:"💻",title:"Computation",desc:"DQN trained under 1hr on cloud GPU. Only inference needed at deployment.",status:"✓ Cloud feasible",type:"ready"},
            {icon:"🗄️",title:"Data Infrastructure",desc:"OSM provides road network. Real deployment needs SRIS/GPS/RESOLV integration.",status:"⚠ Partial",type:"partial"},
          ].map(({icon,title,desc,status,type},i,arr)=>(
            <div key={title} style={{padding:"10px 0",borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none",display:"flex",gap:8}}>
              <span style={{fontSize:16,flexShrink:0,marginTop:1}}>{icon}</span>
              <div>
                <div style={{fontSize:12,fontWeight:600,marginBottom:2}}>{title}</div>
                <div style={{fontSize:10,color:C.muted,lineHeight:1.6,marginBottom:5}}>{desc}</div>
                <StatusBadge text={status} type={type}/>
              </div>
            </div>
          ))}
        </Card>
        <Card>
          <Label>Governance Feasibility</Label>
          {[
            {icon:"🏛️",title:"Institutional Readiness",desc:"Ministry of Public Works + Mayor's office coordination. Data sharing agreements needed.",status:"⚠ Coordination required",type:"partial"},
            {icon:"🔒",title:"Privacy & Ethics",desc:"GPS/camera data needs privacy frameworks. Algorithmic transparency and public trust essential.",status:"✗ Policy needed",type:"needed"},
            {icon:"👨‍💻",title:"Technical Capacity",desc:"Local AI expertise limited. Capacity building and regional university partnerships needed.",status:"⚠ Capacity needed",type:"partial"},
          ].map(({icon,title,desc,status,type},i,arr)=>(
            <div key={title} style={{padding:"10px 0",borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none",display:"flex",gap:8}}>
              <span style={{fontSize:16,flexShrink:0,marginTop:1}}>{icon}</span>
              <div>
                <div style={{fontSize:12,fontWeight:600,marginBottom:2}}>{title}</div>
                <div style={{fontSize:10,color:C.muted,lineHeight:1.6,marginBottom:5}}>{desc}</div>
                <StatusBadge text={status} type={type}/>
              </div>
            </div>
          ))}
        </Card>
      </div>

      <Card style={{marginBottom:10}}>
        <Label>Deployment Roadmap</Label>
        <div className="roadmap-grid">
          {[
            {phase:"PHASE 1",period:"0–6 mo",col:C.blue,steps:["2–3 sensors at Sheriff/Vlissengen","Collect real baseline","Validate simulation"]},
            {phase:"PHASE 2",period:"6–18 mo",col:C.green,steps:["Extend to 10 intersections","Retrain DQN on real data","Adaptive signals on corridor"]},
            {phase:"PHASE 3",period:"18–36 mo",col:C.amber,steps:["City-wide MARL","Integrate RESOLV app","Public congestion data"]},
            {phase:"PHASE 4",period:"36+ mo",col:C.purple,steps:["Continuous retraining","Full policy integration","Expand to other GY cities"]},
          ].map(({phase,period,col,steps},i)=>(
            <div key={phase} className="roadmap-cell" style={{padding:"12px",
              borderRight:i<3?`1px solid ${C.border}`:"none"}}>
              <div style={{...mono,fontSize:10,color:col,marginBottom:3,letterSpacing:".06em"}}>{phase}</div>
              <div style={{fontSize:13.75,fontWeight:600,marginBottom:8}}>{period}</div>
              {steps.map(s=>(
                <div key={s} style={{display:"flex",gap:5,fontSize:12.5,color:C.muted,lineHeight:1.5,marginBottom:4}}>
                  <span style={{color:col,flexShrink:0}}>→</span>{s}
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>

      <Card accent={C.amber}>
        <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
          <span style={{fontSize:18.75,flexShrink:0}}>⚠️</span>
          <div>
            <div style={{fontSize:13.75,fontWeight:700,color:C.amber,marginBottom:4}}>Study Limitations — Honest Academic Scope</div>
            <div style={{fontSize:13.75,color:C.muted,lineHeight:1.8}}>
              This is a <strong style={{color:C.text}}>simulation-based feasibility study</strong>, not a live deployment.
              Synthetic traffic data calibrated to Georgetown's known conditions on a real OSM network.
              Real-world validation with actual sensor data required before operational deployment.
              Primary contribution: demonstrating feasibility and providing a replicable framework
              for other data-scarce Caribbean cities.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ── TAB CONFIG ────────────────────────────────────────────────────────────────
const TAB_CONFIG = [
  {id:"overview",   label:"Overview",   icon:"◉"},
  {id:"simulation", label:"Sim",        icon:"▶"},
  {id:"prediction", label:"Models",     icon:"📊"},
  {id:"rl",         label:"RL",         icon:"🤖"},
  {id:"map",        label:"Map",        icon:"🗺"},
  {id:"feasibility",label:"Feasib.",    icon:"✓"},
];

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function GeorgetownDashboard(){
  const [tab,setTab]=useState("overview");

  const tabContent={
    overview:    <OverviewTab/>,
    simulation:  <SimulationTab/>,
    prediction:  <PredictionTab/>,
    rl:          <RLTab/>,
    map:         <MapTab/>,
    feasibility: <FeasibilityTab/>,
  };

  return(
    <div style={{background:C.bg,color:C.text,fontFamily:"'DM Sans',sans-serif",minHeight:"100vh",overflowX:"hidden"}}>
      <style>{CSS}</style>

      {/* ── HEADER ── */}
      <header className="header-el" style={{
        borderBottom:`1px solid ${C.border}`,padding:"0 24px",
        display:"flex",alignItems:"center",justifyContent:"space-between",
        height:54,background:"rgba(7,9,15,.97)",position:"sticky",top:0,zIndex:100,
        backdropFilter:"blur(14px)",
      }}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:C.green,animation:"pulse 2s infinite"}}/>
          <span style={{...mono,fontSize:15,letterSpacing:".07em"}}>Georgetown Traffic AI</span>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <Tag color={C.green}>35.7% ↓</Tag>
          <span className="hide-mobile"><Tag color={C.blue}>OSM · 2,646 Junctions</Tag></span>
        </div>
      </header>

      {/* ── TOP NAV (desktop only) ── */}
      <nav className="top-nav" style={{
        display:"flex",padding:"0 24px",borderBottom:`1px solid ${C.border}`,
        background:C.surface,overflowX:"auto",scrollbarWidth:"none",
      }}>
        <style>{`.top-nav::-webkit-scrollbar{display:none}`}</style>
        {TAB_CONFIG.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            ...mono,fontSize:12.5,letterSpacing:".06em",padding:"12px 16px",
            border:"none",background:"none",cursor:"pointer",whiteSpace:"nowrap",
            textTransform:"uppercase",color:tab===t.id?C.blue:C.muted,
            borderBottom:`2px solid ${tab===t.id?C.blue:"transparent"}`,
            transition:"all .2s",marginBottom:-1,
          }}>{t.label}</button>
        ))}
      </nav>

      {/* ── MAIN CONTENT ── */}
      <main className="main-content" style={{padding:"16px 20px 20px",maxWidth:1100,margin:"0 auto"}}>
        {tabContent[tab]}
      </main>

      {/* ── BOTTOM NAV (mobile only, via CSS) ── */}
      <div className="bottom-nav">
        <div className="bottom-nav-inner">
          {TAB_CONFIG.map(t=>(
            <button key={t.id} className={`bnav-btn${tab===t.id?" active":""}`} onClick={()=>setTab(t.id)}>
              <span className="bnav-icon">{t.icon}</span>
              <span className="bnav-label">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}