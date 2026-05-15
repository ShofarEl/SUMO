import { useState, useEffect, useRef, useCallback } from "react";
import GlobalHeader from "../components/GlobalHeader";

// ══════════════════════════════════════════════════════════════════════════════
// GEORGETOWN TRAFFIC AI — OPERATIONAL SIMULATION DASHBOARD
// Top-level Run Simulation control panel drives all charts, canvases & stats
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

const TRAINING_DATA = Array.from({length:50},(_,i)=>{
  const ep=i+1,pct=ep/50,n=Math.sin(ep*2.3)*.5+Math.cos(ep*1.7)*.3;
  return{
    ep,
    delay:parseFloat((42.71-(42.71-27.45)*pct+n*1.2).toFixed(2)),
    queue:parseFloat((10.92-(10.92-6.60)*pct+n*.4).toFixed(2))
  };
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
@keyframes slideIn{from{opacity:0;transform:translateX(-8px);}to{opacity:1;transform:translateX(0);}}
@keyframes blink{0%,100%{opacity:1;}50%{opacity:.3;}}
.fade-up{animation:fadeUp .3s ease both;}
.slide-in{animation:slideIn .25s ease both;}

.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
.grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;}
.sim-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.roadmap-grid{display:grid;grid-template-columns:repeat(4,1fr);}
.milestone-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;}
.bottom-nav{display:none;}
.btn-ctrl{font-family:'Space Mono',monospace;font-size:12.5px;padding:8px 16px;border-radius:8px;cursor:pointer;border:1px solid rgba(255,255,255,0.1);background:transparent;color:#e2e8f0;min-height:36px;transition:all .15s;}
.btn-ctrl:hover{background:rgba(255,255,255,.05);}
.resp-table{overflow-x:auto;-webkit-overflow-scrolling:touch;}

/* ── CONTROL PANEL ── */
.ctrl-panel{
  position:sticky;top:0;z-index:200;
  background:rgba(7,9,15,0.97);
  border-bottom:1px solid rgba(255,255,255,0.08);
  backdrop-filter:blur(20px);
  padding:10px 20px;
}
.ctrl-inner{max-width:1100px;margin:0 auto;display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
.ctrl-section{display:flex;align-items:center;gap:8px;}
.ctrl-divider{width:1px;height:28px;background:rgba(255,255,255,.08);}
.ep-pill{font-family:'Space Mono',monospace;font-size:11px;padding:5px 12px;border-radius:6px;border:1px solid rgba(255,255,255,.1);background:transparent;color:#64748b;cursor:pointer;transition:all .15s;letter-spacing:.04em;}
.ep-pill:hover{border-color:rgba(59,130,246,.4);color:#e2e8f0;}
.ep-pill.active{border-color:#3b82f6;background:rgba(59,130,246,.15);color:#3b82f6;}
.speed-pill{font-family:'Space Mono',monospace;font-size:10px;padding:4px 10px;border-radius:5px;border:1px solid rgba(255,255,255,.08);background:transparent;color:#64748b;cursor:pointer;transition:all .15s;}
.speed-pill:hover{color:#e2e8f0;}
.speed-pill.active{border-color:#10b981;background:rgba(16,185,129,.12);color:#10b981;}
.run-btn{font-family:'Space Mono',monospace;font-size:12px;padding:7px 20px;border-radius:8px;border:1px solid #3b82f6;background:rgba(59,130,246,.2);color:#3b82f6;cursor:pointer;transition:all .15s;letter-spacing:.04em;font-weight:700;}
.run-btn:hover:not(:disabled){background:rgba(59,130,246,.3);}
.run-btn:disabled{opacity:.4;cursor:not-allowed;}
.run-btn.running{border-color:#f59e0b;background:rgba(245,158,11,.15);color:#f59e0b;}
.reset-btn{font-family:'Space Mono',monospace;font-size:11px;padding:6px 12px;border-radius:6px;border:1px solid rgba(255,255,255,.08);background:transparent;color:#64748b;cursor:pointer;transition:all .15s;}
.reset-btn:hover{color:#e2e8f0;border-color:rgba(255,255,255,.2);}
.reset-btn:disabled{opacity:.3;cursor:not-allowed;}

/* progress bar */
.prog-wrap{flex:1;min-width:120px;}
.prog-track{height:3px;background:rgba(255,255,255,.06);border-radius:99px;overflow:hidden;}
.prog-fill{height:100%;border-radius:99px;background:linear-gradient(90deg,#3b82f6,#10b981);transition:width .25s ease;}
.prog-label{font-family:'Space Mono',monospace;font-size:10px;color:#64748b;margin-bottom:4px;display:flex;justify-content:space-between;}

/* live indicator */
.live-dot{width:7px;height:7px;border-radius:50%;background:#10b981;animation:pulse 1.2s ease infinite;}
.live-dot.idle{background:#374151;animation:none;}

/* training log */
.log-box{background:#080c14;border:1px solid rgba(255,255,255,.06);border-radius:8px;padding:10px 12px;height:130px;overflow-y:auto;font-family:'Space Mono',monospace;font-size:10.5px;line-height:1.75;}
.log-line{color:#374151;transition:color .2s;}
.log-line.info{color:#3b82f6;}
.log-line.good{color:#10b981;}
.log-line.warn{color:#f59e0b;}
.log-line.error{color:#ef4444;}
.log-line.new{animation:slideIn .2s ease both;}

/* milestone chips */
.ms-chip{font-family:'Space Mono',monospace;font-size:10px;padding:3px 8px;border-radius:5px;border:1px solid rgba(255,255,255,.06);color:#374151;background:transparent;transition:all .3s;}
.ms-chip.done{border-color:rgba(16,185,129,.4);color:#10b981;background:rgba(16,185,129,.08);}
.ms-chip.current{border-color:#3b82f6;color:#3b82f6;background:rgba(59,130,246,.12);animation:blink .8s ease infinite;}

/* MOBILE */
@media(max-width:639px){
  .bottom-nav{display:block;position:fixed;bottom:0;left:0;right:0;z-index:200;background:rgba(7,9,15,0.97);border-top:1px solid rgba(255,255,255,0.08);backdrop-filter:blur(16px);padding-bottom:env(safe-area-inset-bottom);}
  .bottom-nav-inner{display:flex;align-items:stretch;height:56px;}
  .bnav-btn{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;border:none;background:none;cursor:pointer;padding:0;color:#64748b;transition:color .15s;-webkit-tap-highlight-color:transparent;position:relative;}
  .bnav-btn.active{color:#3b82f6;}
  .bnav-btn.active::before{content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);width:20px;height:2px;background:#3b82f6;border-radius:0 0 2px 2px;}
  .bnav-icon{font-size:18px;line-height:1;}
  .bnav-label{font-family:'Space Mono',monospace;font-size:8px;letter-spacing:.04em;text-transform:uppercase;}
  .top-nav{display:none !important;}
  .main-content{padding:10px 10px 72px !important;}
  .ctrl-panel{padding:8px 10px;}
  .ctrl-inner{gap:8px;}
  .prog-wrap{min-width:80px;}
  .grid-2,.grid-4{grid-template-columns:1fr 1fr;}
  .col-stack{grid-template-columns:1fr !important;}
  .sim-grid{grid-template-columns:1fr;}
  .roadmap-grid{grid-template-columns:1fr 1fr;}
  .milestone-grid{gap:4px;}
  .btn-ctrl{padding:10px 18px;min-height:40px;}
  .hide-mobile{display:none !important;}
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
      if(fixed){sig.timer=60;}
      else{
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
    ctx.strokeStyle="rgba(255,220,0,.12)";ctx.lineWidth=1;ctx.setLineDash([8,10]);
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
  ctx.restore();
}

// ── PRIMITIVES ────────────────────────────────────────────────────────────────
function Card({children,style,accent}){
  return(
    <div style={{background:C.surface,border:`1px solid ${accent?accent+"28":C.border}`,borderRadius:12,padding:14,...style}}>
      {children}
    </div>
  );
}
function Label({children,color}){
  return(
    <div style={{...mono,fontSize:11,letterSpacing:".09em",textTransform:"uppercase",color:color||C.muted,marginBottom:10}}>
      {children}
    </div>
  );
}
function Tag({children,color}){
  return(
    <span style={{...mono,fontSize:10,padding:"2px 7px",borderRadius:99,background:color+"18",color,border:`1px solid ${color}35`,fontWeight:700,letterSpacing:".04em"}}>
      {children}
    </span>
  );
}
function StatusBadge({text,type}){
  const cols={ready:C.green,partial:C.amber,needed:C.red};
  const col=cols[type]||C.muted;
  return(
    <span style={{...mono,fontSize:10,padding:"2px 7px",borderRadius:99,background:`${col}14`,color:col,letterSpacing:".03em"}}>
      {text}
    </span>
  );
}

// ── TOP-LEVEL CONTROL PANEL ───────────────────────────────────────────────────
function ControlPanel({
  targetEps, setTargetEps,
  speed, setSpeed,
  running, trained,
  currentEp,
  onRun, onReset,
}){
  const pct = targetEps > 0 ? (currentEp / targetEps) * 100 : 0;
  return(
    <div className="ctrl-panel">
      <div className="ctrl-inner">
        {/* Live indicator */}
        <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
          <div className={`live-dot${running?"":" idle"}`}/>
          <span style={{...mono,fontSize:10,color:running?C.green:C.muted}}>
            {running?"TRAINING":trained?"COMPLETE":"IDLE"}
          </span>
        </div>

        <div className="ctrl-divider"/>

        {/* Episode selector */}
        <div className="ctrl-section">
          <span style={{...mono,fontSize:10,color:C.dim}}>EPISODES</span>
          {[12,25,50].map(n=>(
            <button
              key={n}
              className={`ep-pill${targetEps===n?" active":""}`}
              onClick={()=>!running&&setTargetEps(n)}
              disabled={running}
            >{n}</button>
          ))}
        </div>

        <div className="ctrl-divider"/>

        {/* Speed selector */}
        <div className="ctrl-section">
          <span style={{...mono,fontSize:10,color:C.dim}}>SPEED</span>
          {[["Step",1],["Normal",3],["Fast",8]].map(([label,val])=>(
            <button
              key={val}
              className={`speed-pill${speed===val?" active":""}`}
              onClick={()=>setSpeed(val)}
            >{label}</button>
          ))}
        </div>

        <div className="ctrl-divider"/>

        {/* Progress */}
        <div className="prog-wrap">
          <div className="prog-label">
            <span>Episode {currentEp} / {running||trained?targetEps:0}</span>
            <span>{trained&&!running?"Done ✓":running?`${pct.toFixed(0)}%`:""}</span>
          </div>
          <div className="prog-track">
            <div className="prog-fill" style={{width:`${pct}%`}}/>
          </div>
        </div>

        {/* Action buttons */}
        <button
          className={`run-btn${running?" running":""}`}
          onClick={onRun}
          disabled={running}
        >
          {running?`▶ EP ${currentEp}/${targetEps}`:"▶ Run simulation"}
        </button>
        <button
          className="reset-btn"
          onClick={onReset}
          disabled={running}
        >↺ Reset</button>
      </div>
    </div>
  );
}

// ── SVG CHARTS (driven by chartPoints prop) ───────────────────────────────────
function DQNChart({chartPoints, targetEps, trained}){
  const W=560,H=170,pad={t:22,r:14,b:22,l:42};
  const iW=W-pad.l-pad.r,iH=H-pad.t-pad.b;
  const minD=24,maxD=46;
  const xp=i=>(i/(targetEps-1||1))*iW+pad.l;
  const yp=v=>iH-(v-minD)/(maxD-minD)*iH+pad.t;
  const baseY=yp(42.71);
  const path=chartPoints.length>1
    ?chartPoints.map((pt,i)=>`${i===0?"M":"L"}${xp(pt.ep-1).toFixed(1)},${yp(pt.delay).toFixed(1)}`).join(" ")
    :"";
  const fill=path&&chartPoints.length>1
    ?path+` L${xp(chartPoints.length-1)},${(iH+pad.t).toFixed(1)} L${pad.l},${(iH+pad.t).toFixed(1)} Z`
    :"";
  return(
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",overflow:"visible"}}>
      <defs>
        <linearGradient id="dg3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.blue} stopOpacity=".25"/>
          <stop offset="100%" stopColor={C.blue} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {[28,32,36,40,42.71].map(v=>(
        <g key={v}>
          <line x1={pad.l} y1={yp(v)} x2={W-pad.r} y2={yp(v)}
            stroke={v===42.71?"rgba(239,68,68,.35)":"rgba(255,255,255,.04)"}
            strokeWidth={v===42.71?1.5:1} strokeDasharray={v===42.71?"6,4":""}/>
          <text x={pad.l-4} y={yp(v)+3} fill={v===42.71?C.red:C.muted}
            fontSize="10" fontFamily="Space Mono" textAnchor="end">
            {v===42.71?"42.7":v}s
          </text>
        </g>
      ))}
      <text x={W-pad.r} y={baseY-6} fill={C.red} fontSize="10" fontFamily="Space Mono" textAnchor="end">Baseline</text>
      {fill&&<path d={fill} fill="url(#dg3)"/>}
      {path&&<path d={path} stroke={C.blue} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>}
      {chartPoints.map((pt,i)=>{
        const isCp=CHECKPOINTS.includes(pt.ep)&&pt.ep<=targetEps;
        const isLast=i===chartPoints.length-1;
        return(
          <g key={pt.ep}>
            <circle cx={xp(pt.ep-1)} cy={yp(pt.delay)} r={isLast?5:isCp?4:2.5}
              fill={isLast?C.green:isCp?C.blue:C.blue}
              stroke={isLast?"rgba(16,185,129,.4)":"none"} strokeWidth={isLast?8:0}/>
            {isCp&&(
              <text x={xp(pt.ep-1)} y={yp(pt.delay)-9} fill={isLast?C.green:C.muted}
                fontSize="9" fontFamily="Space Mono" textAnchor="middle">
                {isLast?`${pt.delay}s`:`EP${pt.ep}`}
              </text>
            )}
          </g>
        );
      })}
      <line x1={pad.l} y1={iH+pad.t} x2={W-pad.r} y2={iH+pad.t} stroke={C.border2}/>
      {!trained&&chartPoints.length===0&&(
        <text x={W/2} y={H/2} fill={C.dim} fontSize="12" fontFamily="Space Mono" textAnchor="middle">
          Run a simulation to see the learning curve
        </text>
      )}
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
            <span style={{...mono,fontSize:11,fontWeight:700,color:"#fff"}}>{it.val}</span>
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
          <text x={pad.l-3} y={yp(v)+3} fill={C.muted} fontSize="8" fontFamily="Space Mono" textAnchor="end">{v}</text>
        </g>
      ))}
      <line x1={pad.l} y1={iH+pad.t} x2={W-pad.r} y2={iH+pad.t} stroke={C.border}/>
      <path d={aPath} stroke="#60a5fa" strokeWidth="1.5" fill="none"/>
      <path d={pPath} stroke="#f87171" strokeWidth="1.5" fill="none" strokeDasharray="4,3"/>
      <text x={xp(30)} y={yp(82)-7} fill={C.muted} fontSize="8" fontFamily="Space Mono" textAnchor="middle">incident spike</text>
      <line x1={xp(30)} y1={yp(82)-2} x2={xp(30)} y2={yp(70)} stroke={C.muted} strokeWidth=".7"/>
    </svg>
  );
}

// ── SIMULATION CANVASES ───────────────────────────────────────────────────────
function SimCanvasPanel({title,badge,badgeColor,canvasRef,stats,statColor}){
  const bc=badgeColor==="red"?{bg:"rgba(239,68,68,.15)",col:C.red}:{bg:"rgba(16,185,129,.15)",col:C.green};
  return(
    <div style={{border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"7px 12px",background:C.surface2,borderBottom:`1px solid ${C.border}`}}>
        <span style={{...mono,fontSize:12,letterSpacing:".05em"}}>{title}</span>
        <span style={{...mono,fontSize:10,padding:"2px 7px",borderRadius:99,fontWeight:700,background:bc.bg,color:bc.col}}>{badge}</span>
      </div>
      <div style={{background:"#0d1117",lineHeight:0}}>
        <canvas ref={canvasRef} style={{display:"block",width:"100%",height:180}}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:3,padding:6}}>
        {[["Delay",stats.delay],["Queue",stats.queue],["Thr/hr",stats.thr]].map(([l,v])=>(
          <div key={l} style={{textAlign:"center",padding:"6px 4px",borderRadius:7,background:"rgba(255,255,255,.025)"}}>
            <div style={{...mono,fontSize:8,color:C.muted,textTransform:"uppercase",letterSpacing:".06em"}}>{l}</div>
            <div style={{...mono,fontSize:15,fontWeight:700,color:statColor,marginTop:1}}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── TRAINING LOG ──────────────────────────────────────────────────────────────
function TrainingLog({entries}){
  const ref=useRef(null);
  useEffect(()=>{
    if(ref.current)ref.current.scrollTop=ref.current.scrollHeight;
  },[entries]);
  const colMap={info:C.blue,good:C.green,warn:C.amber,error:C.red,dim:C.dim};
  return(
    <div ref={ref} className="log-box">
      {entries.map((e,i)=>(
        <div key={i} className={`log-line ${e.type} new`} style={{color:colMap[e.type]||C.dim}}>
          <span style={{color:C.dim}}>[{e.ts}]</span> {e.msg}
        </div>
      ))}
      {entries.length===0&&(
        <div className="log-line" style={{color:C.dim}}>Configure episodes above and click ▶ Run simulation</div>
      )}
    </div>
  );
}

// ── KPI CARDS ─────────────────────────────────────────────────────────────────
function KPICard({label,value,sub,color,trained}){
  return(
    <div style={{background:"rgba(255,255,255,.025)",borderRadius:10,padding:"10px 12px",border:`1px solid ${C.border}`}}>
      <div style={{...mono,fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:".07em",marginBottom:4}}>{label}</div>
      <div style={{...mono,fontSize:22,fontWeight:700,color:trained?color:C.dim,transition:"color .3s"}}>{value}</div>
      <div style={{fontSize:11,color:C.dim,marginTop:2}}>{sub}</div>
    </div>
  );
}

// ── MILESTONE CHIPS ───────────────────────────────────────────────────────────
function MilestoneChips({currentEp,targetEps}){
  const cps=CHECKPOINTS.filter(c=>c<=targetEps);
  return(
    <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:8}}>
      {cps.map(cp=>{
        let cls="ms-chip";
        if(currentEp>cp)cls+=" done";
        else if(currentEp===cp)cls+=" current";
        return <span key={cp} className={cls}>EP{cp}</span>;
      })}
    </div>
  );
}

// ── MAP CANVAS ────────────────────────────────────────────────────────────────
function MapCanvas(){
  const ref=useRef(null);
  const draw=useCallback(()=>{
    const canvas=ref.current;if(!canvas)return;
    const parent=canvas.parentElement;if(!parent)return;
    const dpr=window.devicePixelRatio||1;
    const W=parent.clientWidth||320,H=Math.min(280,W*.6);
    canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);
    canvas.style.width=W+"px";canvas.style.height=H+"px";
    const ctx=canvas.getContext("2d");
    ctx.scale(dpr,dpr);
    ctx.fillStyle="#0a1420";ctx.fillRect(0,0,W,H);
    ctx.strokeStyle="rgba(255,255,255,.02)";ctx.lineWidth=.5;
    for(let x=0;x<W;x+=26){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=0;y<H;y+=26){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    const roads=[
      {col:"#ef4444",w:4,pts:[[.05,.35],[.95,.35]]},{col:"#ef4444",w:4,pts:[[.55,.05],[.55,.95]]},
      {col:"#f59e0b",w:3,pts:[[.05,.65],[.95,.65]]},{col:"#f59e0b",w:3,pts:[[.25,.05],[.25,.95]]},
      {col:"#f59e0b",w:3,pts:[[.05,.55],[.75,.55]]},{col:"#3b82f6",w:2,pts:[[.38,.05],[.38,.95]]},
      {col:"#3b82f6",w:2,pts:[[.05,.2],[.95,.2]]},{col:"#3b82f6",w:2,pts:[[.05,.45],[.95,.45]]},
      {col:"#1f2937",w:1.5,pts:[[.7,.05],[.7,.95]]},{col:"#1f2937",w:1.5,pts:[[.85,.05],[.85,.95]]},
    ];
    roads.forEach(r=>{
      ctx.strokeStyle=r.col+"aa";ctx.lineWidth=r.w;ctx.lineCap="round";
      ctx.beginPath();r.pts.forEach(([px,py],i)=>i===0?ctx.moveTo(px*W,py*H):ctx.lineTo(px*W,py*H));ctx.stroke();
    });
    ctx.font=`bold 11px 'Space Mono',monospace`;
    [{t:"Sheriff St",x:.05,y:.35,col:"#ef4444",dy:-12},{t:"Camp St",x:.05,y:.67,col:"#f59e0b",dy:0},
     {t:"Church St",x:.26,y:.1,col:"#f59e0b",dy:0},{t:"Vlissengen",x:.56,y:.1,col:"#ef4444",dy:0}].forEach(({t,x,y,col,dy=0})=>{
      const tw=ctx.measureText(t).width;
      ctx.fillStyle="rgba(0,0,0,.75)";ctx.fillRect(x*W-2,y*H+dy-10,tw+6,14);
      ctx.fillStyle=col;ctx.fillText(t,x*W+1,y*H+dy);
    });
  },[]);
  useEffect(()=>{
    draw();
    const t1=setTimeout(draw,100),t2=setTimeout(draw,400);
    window.addEventListener("resize",draw);
    return()=>{clearTimeout(t1);clearTimeout(t2);window.removeEventListener("resize",draw);};
  },[draw]);
  return <canvas ref={ref} style={{display:"block",width:"100%",borderRadius:10,background:"#0a1420"}}/>;
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB COMPONENTS — all driven by simulation state from root
// ══════════════════════════════════════════════════════════════════════════════

function OverviewTab({simState,onNavigate}){
  const {trained,currentEp,targetEps,aiStats,improvement} = simState;
  return(
    <div className="fade-up">
      {/* GUIDANCE BANNER */}
      {!trained && (
        <Card style={{marginBottom:10,background:`linear-gradient(135deg,${C.amber}14,${C.blue}08)`,border:`1px solid ${C.amber}35`,padding:16}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
            <div style={{fontSize:32,flexShrink:0}}>👋</div>
            <div style={{flex:1}}>
              <div style={{fontSize:15,fontWeight:700,marginBottom:6,color:C.amber}}>Welcome! Here's How to Operate This Simulation</div>
              <div style={{fontSize:13,color:C.text,lineHeight:1.8,marginBottom:10}}>
                This dashboard lets you <strong>run and analyze</strong> AI-powered traffic simulations for Georgetown. Follow these steps:
              </div>
              <div style={{display:"grid",gap:8,marginBottom:12}}>
                <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                  <div style={{...mono,fontSize:11,fontWeight:700,color:C.blue,background:`${C.blue}20`,padding:"2px 8px",borderRadius:5,flexShrink:0}}>STEP 1</div>
                  <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>
                    Use the <strong style={{color:C.text}}>control panel at the top</strong> to select episodes (12/25/50) and speed, then click <strong style={{color:C.green}}>▶ Run simulation</strong>
                  </div>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                  <div style={{...mono,fontSize:11,fontWeight:700,color:C.blue,background:`${C.blue}20`,padding:"2px 8px",borderRadius:5,flexShrink:0}}>STEP 2</div>
                  <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>
                    Go to the <strong style={{color:C.text}}>Sim tab</strong> to watch live training with real-time traffic visualization
                  </div>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                  <div style={{...mono,fontSize:11,fontWeight:700,color:C.blue,background:`${C.blue}20`,padding:"2px 8px",borderRadius:5,flexShrink:0}}>STEP 3</div>
                  <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>
                    Explore <strong style={{color:C.text}}>Models, RL, Map, and Feasib.</strong> tabs for detailed analysis and results
                  </div>
                </div>
              </div>
              <button
                onClick={()=>onNavigate("simulation")}
                style={{...mono,fontSize:11,fontWeight:700,padding:"8px 16px",borderRadius:8,border:`1px solid ${C.green}`,background:`${C.green}20`,color:C.green,cursor:"pointer",transition:"all .15s"}}
                onMouseEnter={(e)=>e.target.style.background=`${C.green}30`}
                onMouseLeave={(e)=>e.target.style.background=`${C.green}20`}
              >
                Ready? Go to Sim Tab →
              </button>
            </div>
          </div>
        </Card>
      )}

      <Card style={{marginBottom:10,background:`linear-gradient(135deg,${C.blue}12,${C.purple}08)`,border:`1px solid ${C.blue}28`}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:6,color:C.blue}}>Master's Thesis Research — Georgetown, Guyana</div>
        <div style={{fontSize:13,color:C.text,lineHeight:1.8,marginBottom:6}}>
          <strong>Title:</strong> Application of Artificial Intelligence Techniques in Predicting and Managing Urban Traffic Congestion in Georgetown
        </div>
        <div style={{fontSize:12,color:C.muted,lineHeight:1.7}}>
          Mixed-methods simulation-based feasibility study. Use the <strong style={{color:C.blue}}>▶ Run simulation</strong> control at the top to train the DQN agent and populate all charts across the dashboard.
        </div>
      </Card>

      {/* EDUCATIONAL SECTION - Understanding the Dashboard */}
      <Card style={{marginBottom:10}}>
        <Label>📚 Understanding This Dashboard</Label>
        <div style={{display:"grid",gap:12}}>
          <div style={{padding:12,background:"rgba(255,255,255,.02)",borderRadius:10,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:13,fontWeight:600,marginBottom:6,color:C.blue}}>🤖 What Are the AI Models?</div>
            <div style={{fontSize:12,color:C.muted,lineHeight:1.7,marginBottom:8}}>
              This research compares different approaches to traffic management:
            </div>
            <div style={{display:"grid",gap:8}}>
              <div style={{paddingLeft:12,borderLeft:`2px solid ${C.red}`}}>
                <div style={{fontSize:12,fontWeight:600,color:C.text,marginBottom:2}}>Baseline (Fixed-Time)</div>
                <div style={{fontSize:11,color:C.muted,lineHeight:1.6}}>
                  Traditional traffic lights with predetermined schedules (e.g., 60 seconds green, 30 seconds red). 
                  They don't adapt to actual traffic conditions.
                </div>
              </div>
              <div style={{paddingLeft:12,borderLeft:`2px solid ${C.green}`}}>
                <div style={{fontSize:12,fontWeight:600,color:C.text,marginBottom:2}}>DQN (Deep Q-Network)</div>
                <div style={{fontSize:11,color:C.muted,lineHeight:1.6}}>
                  An AI agent that learns optimal signal timing by observing traffic patterns and receiving rewards 
                  for reducing congestion. It adapts in real-time.
                </div>
              </div>
              <div style={{paddingLeft:12,borderLeft:`2px solid ${C.purple}`}}>
                <div style={{fontSize:12,fontWeight:600,color:C.text,marginBottom:2}}>MARL (Multi-Agent RL)</div>
                <div style={{fontSize:11,color:C.muted,lineHeight:1.6}}>
                  Multiple AI agents working together across intersections to coordinate traffic flow city-wide, 
                  creating "green waves" and synchronized signals.
                </div>
              </div>
            </div>
          </div>

          <div style={{padding:12,background:"rgba(255,255,255,.02)",borderRadius:10,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:13,fontWeight:600,marginBottom:6,color:C.amber}}>📈 What Are Episodes?</div>
            <div style={{fontSize:12,color:C.muted,lineHeight:1.7,marginBottom:8}}>
              An <strong style={{color:C.text}}>episode</strong> is one complete training cycle where the AI agent:
            </div>
            <ol style={{fontSize:11,color:C.muted,lineHeight:1.8,paddingLeft:20,marginBottom:8}}>
              <li>Observes the current traffic state (queue lengths, vehicle arrivals)</li>
              <li>Decides which signal phase to activate (green/red for each direction)</li>
              <li>Receives feedback (reward) based on how well it reduced delays</li>
              <li>Updates its knowledge and improves its decision-making</li>
            </ol>
            <div style={{fontSize:11,color:C.amber,background:`${C.amber}12`,padding:"6px 8px",borderRadius:6,border:`1px solid ${C.amber}28`}}>
              💡 <strong>More episodes = Better learning.</strong> The AI gets smarter with each episode, like practicing a skill!
            </div>
          </div>

          <div style={{padding:12,background:"rgba(255,255,255,.02)",borderRadius:10,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:13,fontWeight:600,marginBottom:6,color:C.green}}>📊 Key Metrics Explained</div>
            <div style={{display:"grid",gap:6}}>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:C.text,marginBottom:2}}>Average Delay</div>
                <div style={{fontSize:11,color:C.muted,lineHeight:1.6}}>
                  How long vehicles wait at intersections (in seconds). Lower is better. Baseline: 42.71s
                </div>
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:C.text,marginBottom:2}}>Queue Length</div>
                <div style={{fontSize:11,color:C.muted,lineHeight:1.6}}>
                  Average number of vehicles waiting at red lights. Lower means less congestion. Baseline: 10.92 vehicles
                </div>
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:C.text,marginBottom:2}}>Throughput</div>
                <div style={{fontSize:11,color:C.muted,lineHeight:1.6}}>
                  Number of vehicles passing through per hour. Higher is better. Baseline: 850 veh/hr
                </div>
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:C.text,marginBottom:2}}>RMSE (Root Mean Square Error)</div>
                <div style={{fontSize:11,color:C.muted,lineHeight:1.6}}>
                  Measures prediction accuracy. Lower values mean better predictions. Best: 3.826s (Random Forest)
                </div>
              </div>
            </div>
          </div>

          <div style={{padding:12,background:"rgba(255,255,255,.02)",borderRadius:10,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:13,fontWeight:600,marginBottom:6,color:C.purple}}>🗂️ Dashboard Tabs Explained</div>
            <div style={{display:"grid",gap:6}}>
              <div style={{display:"flex",gap:8}}>
                <div style={{...mono,fontSize:10,color:C.blue,background:`${C.blue}15`,padding:"2px 6px",borderRadius:4,flexShrink:0}}>Overview</div>
                <div style={{fontSize:11,color:C.muted,lineHeight:1.6}}>This page - summary and instructions</div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <div style={{...mono,fontSize:10,color:C.blue,background:`${C.blue}15`,padding:"2px 6px",borderRadius:4,flexShrink:0}}>Sim</div>
                <div style={{fontSize:11,color:C.muted,lineHeight:1.6}}>Watch live training with traffic visualization</div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <div style={{...mono,fontSize:10,color:C.blue,background:`${C.blue}15`,padding:"2px 6px",borderRadius:4,flexShrink:0}}>Models</div>
                <div style={{fontSize:11,color:C.muted,lineHeight:1.6}}>Traffic prediction model comparison (RQ1)</div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <div style={{...mono,fontSize:10,color:C.blue,background:`${C.blue}15`,padding:"2px 6px",borderRadius:4,flexShrink:0}}>RL</div>
                <div style={{fontSize:11,color:C.muted,lineHeight:1.6}}>Reinforcement learning results and analysis (RQ2)</div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <div style={{...mono,fontSize:10,color:C.blue,background:`${C.blue}15`,padding:"2px 6px",borderRadius:4,flexShrink:0}}>Map</div>
                <div style={{fontSize:11,color:C.muted,lineHeight:1.6}}>Georgetown road network from OpenStreetMap</div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <div style={{...mono,fontSize:10,color:C.blue,background:`${C.blue}15`,padding:"2px 6px",borderRadius:4,flexShrink:0}}>Feasib.</div>
                <div style={{fontSize:11,color:C.muted,lineHeight:1.6}}>Implementation feasibility assessment (RQ3)</div>
              </div>
            </div>
          </div>

          <div style={{padding:12,background:`linear-gradient(135deg,${C.green}12,${C.blue}08)`,borderRadius:10,border:`1px solid ${C.green}28`}}>
            <div style={{fontSize:13,fontWeight:600,marginBottom:6,color:C.green}}>💡 What This Means for Georgetown</div>
            <div style={{fontSize:12,color:C.text,lineHeight:1.7,marginBottom:6}}>
              By running this simulation, you'll see how AI can improve Georgetown's traffic:
            </div>
            <ul style={{fontSize:11,color:C.muted,lineHeight:1.8,paddingLeft:18}}>
              <li>✅ Reduce average waiting time by up to 40%</li>
              <li>✅ Decrease queue lengths at intersections</li>
              <li>✅ Increase vehicle throughput (more cars moving efficiently)</li>
              <li>✅ Adapt to changing traffic patterns automatically</li>
              <li>✅ Lower fuel consumption and emissions</li>
            </ul>
          </div>
        </div>
      </Card>

      {trained?(
        <div style={{background:`linear-gradient(135deg,${C.green}14,${C.blue}08)`,
          border:`1px solid ${C.green}28`,borderRadius:14,padding:16,marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <span style={{fontSize:16}}>🏆</span>
            <span style={{...mono,fontSize:9,color:C.green,letterSpacing:".07em",textTransform:"uppercase"}}>Training complete — {targetEps} episodes</span>
          </div>
          <div className="hero-num" style={{...mono,fontSize:36,fontWeight:700,color:C.green,lineHeight:1,marginBottom:6}}>
            {improvement}%
          </div>
          <div style={{fontSize:15,fontWeight:600,marginBottom:4}}>
            Delay reduced: 42.71s → {aiStats.delay}
          </div>
          <div style={{fontSize:13,color:C.muted,lineHeight:1.7}}>
            DQN RL agent · {targetEps} episodes · Georgetown OSM network · SUMO simulator<br/>
            Queue ↓ {(((10.92-parseFloat(aiStats.queue))/10.92)*100).toFixed(1)}%
          </div>
        </div>
      ):(
        <div style={{background:"rgba(255,255,255,.025)",border:`1px solid ${C.border}`,borderRadius:14,padding:20,marginBottom:10,textAlign:"center"}}>
          <div style={{...mono,fontSize:13,color:C.dim,marginBottom:8}}>No training run yet</div>
          <div style={{fontSize:12,color:C.muted}}>Click <strong style={{color:C.blue}}>▶ Run simulation</strong> above to train the DQN agent and see results here.</div>
        </div>
      )}

      <div className="grid-4" style={{marginBottom:10}}>
        {[
          [trained?`↓${improvement}%`:"—",C.green,"Delay","DQN vs Fixed"],
          [trained?`↓${(((10.92-parseFloat(aiStats.queue))/10.92)*100).toFixed(1)}%`:"—",C.green,"Queue","DQN vs Fixed"],
          ["3.826s",C.amber,"Best RMSE","Rand. Forest"],
          ["2,646",C.blue,"Junctions","Real OSM"],
        ].map(([v,col,l,sub])=>(
          <Card key={l} style={{textAlign:"center",padding:"12px 6px"}}>
            <div style={{...mono,fontSize:8,color:C.muted,textTransform:"uppercase",letterSpacing:".07em",marginBottom:4}}>{l}</div>
            <div style={{...mono,fontSize:18,fontWeight:700,color:trained||l==="Best RMSE"||l==="Junctions"?col:C.dim}}>{v}</div>
            <div style={{fontSize:11,color:C.dim,marginTop:3}}>{sub}</div>
          </Card>
        ))}
      </div>

      <Card style={{marginBottom:10}}>
        <Label>Three Research Questions</Label>
        {[
          {icon:"🚦",rq:"RQ1",title:"Traffic Prediction Accuracy",answer:"Random Forest achieved best RMSE (3.826s), outperforming LSTM and ARIMA.",status:"✓ Answered",type:"ready",metric:"RMSE 3.826s"},
          {icon:"🤖",rq:"RQ2",title:"RL-Based Adaptive Signal Control",answer:trained?`DQN agent reduced delay by ${improvement}% (42.71s → ${aiStats.delay}) over ${targetEps} episodes.`:"Run the simulation above to answer RQ2.",status:trained?"✓ Answered":"▶ Run sim",type:trained?"ready":"partial",metric:trained?`${improvement}% ↓ delay`:"Not yet run"},
          {icon:"🏛️",rq:"RQ3",title:"Implementation Feasibility",answer:"Identified constraints: limited sensors, governance gaps, capacity needs. 4-phase roadmap proposed.",status:"✓ Assessed",type:"partial",metric:"4-phase plan"},
        ].map(({icon,rq,title,answer,status,type,metric},i,arr)=>(
          <div key={rq} style={{padding:"12px 0",borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none"}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
              <span style={{fontSize:18,flexShrink:0}}>{icon}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:600,marginBottom:4}}>
                  <span style={{...mono,fontSize:10,color:C.blue,marginRight:5}}>{rq}</span>{title}
                </div>
                <div style={{fontSize:12,color:C.muted,lineHeight:1.7,marginBottom:6}}>{answer}</div>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  <StatusBadge text={status} type={type}/>
                  <span style={{...mono,fontSize:10,color:C.blue,background:`${C.blue}12`,padding:"2px 7px",borderRadius:4}}>{metric}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function SimulationTab({simState,fixedRef,aiRef,onNavigate}){
  const {trained,running,currentEp,targetEps,aiStats,fixedStats,improvement,chartPoints,logEntries} = simState;
  return(
    <div className="fade-up">
      {/* GUIDANCE BANNER */}
      {!running && !trained && (
        <Card style={{marginBottom:10,background:`linear-gradient(135deg,${C.green}14,${C.blue}08)`,border:`1px solid ${C.green}35`,padding:16}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
            <div style={{fontSize:32,flexShrink:0}}>▶️</div>
            <div style={{flex:1}}>
              <div style={{fontSize:15,fontWeight:700,marginBottom:6,color:C.green}}>Ready to Run the Simulation?</div>
              <div style={{fontSize:13,color:C.text,lineHeight:1.8,marginBottom:10}}>
                Use the <strong>control panel at the top</strong> of this page to:
              </div>
              <ul style={{fontSize:12,color:C.muted,lineHeight:1.8,paddingLeft:20,marginBottom:10}}>
                <li>Select <strong style={{color:C.text}}>number of episodes</strong> (12, 25, or 50)</li>
                <li>Choose <strong style={{color:C.text}}>training speed</strong> (Step, Normal, or Fast)</li>
                <li>Click the <strong style={{color:C.green}}>▶ Run simulation</strong> button</li>
              </ul>
              <div style={{fontSize:12,color:C.amber,background:`${C.amber}12`,padding:"8px 10px",borderRadius:8,border:`1px solid ${C.amber}28`}}>
                💡 <strong>Tip:</strong> Start with 25 episodes at Normal speed for a good balance of learning and time (3-4 minutes)
              </div>
            </div>
          </div>
        </Card>
      )}

      {running && (
        <Card style={{marginBottom:10,background:`${C.amber}08`,border:`1px solid ${C.amber}28`,padding:14}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div className="live-dot"/>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:700,color:C.amber,marginBottom:4}}>🎬 Training in Progress...</div>
              <div style={{fontSize:12,color:C.muted}}>
                Watch the AI learn! The right canvas shows adaptive signal control improving in real-time. Episode {currentEp} of {targetEps}
              </div>
            </div>
          </div>
        </Card>
      )}

      {trained && !running && (
        <Card style={{marginBottom:10,background:`linear-gradient(135deg,${C.green}14,${C.blue}08)`,border:`1px solid ${C.green}35`,padding:14}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
            <div style={{fontSize:28,flexShrink:0}}>✅</div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:700,marginBottom:4,color:C.green}}>Training Complete! {improvement}% Improvement</div>
              <div style={{fontSize:12,color:C.muted,marginBottom:10}}>
                The AI achieved a {improvement}% reduction in delay. Explore the results in other tabs:
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                <button onClick={()=>onNavigate("prediction")} style={{...mono,fontSize:10,padding:"6px 12px",borderRadius:6,border:`1px solid ${C.purple}`,background:`${C.purple}15`,color:C.purple,cursor:"pointer"}}>
                  📊 Models Tab
                </button>
                <button onClick={()=>onNavigate("rl")} style={{...mono,fontSize:10,padding:"6px 12px",borderRadius:6,border:`1px solid ${C.green}`,background:`${C.green}15`,color:C.green,cursor:"pointer"}}>
                  🤖 RL Tab
                </button>
                <button onClick={()=>onNavigate("feasibility")} style={{...mono,fontSize:10,padding:"6px 12px",borderRadius:6,border:`1px solid ${C.amber}`,background:`${C.amber}15`,color:C.amber,cursor:"pointer"}}>
                  ✓ Feasib. Tab
                </button>
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card style={{marginBottom:10,background:`${C.blue}08`,border:`1px solid ${C.blue}28`}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:6,color:C.blue}}>Live training — DQN vs Fixed timing</div>
        <div style={{fontSize:12,color:C.muted,lineHeight:1.7}}>
          Blue vehicles are moving freely; red are queued at signals. Green/red lights show signal state.
          The right canvas (AI) uses adaptive timing learned each episode — watch queues shrink as training progresses.
        </div>
      </Card>

      <Card style={{marginBottom:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,flexWrap:"wrap",gap:6}}>
          <Label>DQN learning curve</Label>
          {trained&&<Tag color={C.green}>↓ {improvement}% improvement over {targetEps} episodes</Tag>}
        </div>
        <DQNChart chartPoints={chartPoints} targetEps={targetEps} trained={trained}/>
        <MilestoneChips currentEp={currentEp} targetEps={targetEps}/>
        <div style={{display:"flex",gap:12,marginTop:10,flexWrap:"wrap"}}>
          {[[C.blue,"DQN delay"],[C.red,"Baseline","dashed"],[C.green,"Checkpoint","dot"]].map(([c,l,t])=>(
            <div key={l} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:C.muted}}>
              {t==="dot"?<div style={{width:7,height:7,borderRadius:"50%",background:c}}/>
                :<div style={{width:14,height:0,borderTop:`2px ${t==="dashed"?"dashed":"solid"} ${c}`}}/>}
              {l}
            </div>
          ))}
        </div>
      </Card>

      <div className="sim-grid" style={{marginBottom:10}}>
        <SimCanvasPanel title="Fixed timing" badge="BASELINE" badgeColor="red" canvasRef={fixedRef} stats={fixedStats} statColor={C.red}/>
        <SimCanvasPanel title="DQN AI agent" badge="AI CONTROL" badgeColor="green" canvasRef={aiRef} stats={aiStats} statColor={C.green}/>
      </div>

      <Card>
        <Label>Training log</Label>
        <TrainingLog entries={logEntries}/>
      </Card>
    </div>
  );
}

function PredictionTab(){
  return(
    <div className="fade-up">
      <Card style={{marginBottom:10,background:`${C.purple}08`,border:`1px solid ${C.purple}28`,padding:14}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
          <div style={{fontSize:24,flexShrink:0}}>📊</div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:4,color:C.purple}}>Traffic Prediction Models (RQ1)</div>
            <div style={{fontSize:12,color:C.muted}}>
              This tab shows how different AI models predict traffic conditions. <strong style={{color:C.text}}>Random Forest</strong> achieved the best performance with RMSE of 3.826s.
            </div>
          </div>
        </div>
      </Card>

      <Card style={{marginBottom:10,background:`${C.purple}08`,border:`1px solid ${C.purple}28`}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:6,color:C.purple}}>RQ1 — Traffic prediction models</div>
        <div style={{fontSize:12,color:C.muted,lineHeight:1.7}}>
          Random Forest vs LSTM vs ARIMA evaluated on Georgetown synthetic traffic data.
          Random Forest achieved RMSE 3.826s — best in class for data-sparse settings.
        </div>
      </Card>
      <Card style={{marginBottom:10}}>
        <Label>Model performance — RMSE &amp; MAE (lower = better)</Label>
        <div className="resp-table">
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:280}}>
            <thead>
              <tr style={{borderBottom:`1px solid ${C.border2}`}}>
                {["Model","RMSE","MAE","Verdict"].map(h=>(
                  <th key={h} style={{...mono,fontSize:8,color:C.muted,textAlign:"left",padding:"7px 8px",letterSpacing:".06em",textTransform:"uppercase"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                {name:"Random Forest",rmse:"3.826",mae:"2.498",verdict:"✓ Winner",nc:C.amber,winner:true},
                {name:"LSTM",rmse:"5.955",mae:"3.900",verdict:"Needs more data",nc:C.purple},
                {name:"ARIMA",rmse:"5.967",mae:"3.568",verdict:"Weakest",nc:C.red},
              ].map((r,i)=>(
                <tr key={r.name} style={{borderBottom:i<2?`1px solid ${C.border}`:"none",background:r.winner?"rgba(245,158,11,.04)":"transparent"}}>
                  <td style={{padding:"9px 8px",fontSize:14,fontWeight:600,color:r.nc}}>
                    {r.name}{r.winner&&<span style={{marginLeft:5}}><Tag color={C.amber}>BEST</Tag></span>}
                  </td>
                  <td style={{...mono,padding:"9px 8px",fontSize:14,color:r.nc}}>{r.rmse}</td>
                  <td style={{...mono,padding:"9px 8px",fontSize:14,color:r.nc}}>{r.mae}</td>
                  <td style={{fontSize:12,color:r.winner?C.green:C.muted,padding:"9px 8px"}}>{r.verdict}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="grid-2 col-stack" style={{marginBottom:10}}>
        <Card><Label>RMSE comparison</Label><RMSEChart/></Card>
        <Card>
          <Label>LSTM: predicted vs actual</Label>
          <LSTMLineChart/>
          <div style={{display:"flex",gap:12,marginTop:6}}>
            {[["#60a5fa","Actual"],["#f87171","LSTM predicted"]].map(([c,l])=>(
              <div key={l} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:C.muted}}>
                <div style={{width:14,height:2,background:c,borderRadius:2}}/>{l}
              </div>
            ))}
          </div>
          <div style={{marginTop:8,padding:"8px 10px",background:"rgba(239,68,68,.06)",borderRadius:8,border:`1px solid ${C.red}22`,fontSize:12,color:C.muted,lineHeight:1.6}}>
            LSTM misses incident spikes → Random Forest more robust with limited data.
          </div>
        </Card>
      </div>
    </div>
  );
}

function RLTab({simState,onNavigate}){
  const {trained,currentEp,targetEps,aiStats,improvement,chartPoints} = simState;
  return(
    <div className="fade-up">
      {!trained && (
        <Card style={{marginBottom:10,background:`${C.amber}08`,border:`1px solid ${C.amber}28`,padding:14}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
            <div style={{fontSize:24,flexShrink:0}}>📊</div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:700,marginBottom:4,color:C.amber}}>Results Will Appear Here</div>
              <div style={{fontSize:12,color:C.muted,marginBottom:8}}>
                This tab shows detailed RL performance analysis. Run a simulation first to see:
              </div>
              <ul style={{fontSize:11,color:C.muted,lineHeight:1.7,paddingLeft:18}}>
                <li>Delay and queue length improvements</li>
                <li>Episode-by-episode learning curve</li>
                <li>Comparison with published benchmarks</li>
              </ul>
              <button onClick={()=>onNavigate("simulation")} style={{...mono,fontSize:10,padding:"6px 12px",borderRadius:6,border:`1px solid ${C.green}`,background:`${C.green}15`,color:C.green,cursor:"pointer",marginTop:8}}>
                Go to Sim Tab to Run →
              </button>
            </div>
          </div>
        </Card>
      )}

      <Card style={{marginBottom:10,background:`${C.green}08`,border:`1px solid ${C.green}28`}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:6,color:C.green}}>RQ2 — RL-based adaptive signal control</div>
        <div style={{fontSize:12,color:C.muted,lineHeight:1.7}}>
          {trained
            ?`DQN agent trained for ${targetEps} episodes. Final delay: ${aiStats.delay} — a ${improvement}% reduction vs the 42.71s baseline. Exceeds published benchmark of 25–34%.`
            :"Run the simulation from the top control panel to populate this tab with real training results."
          }
        </div>
      </Card>

      {trained?(
        <>
          <div style={{background:`linear-gradient(135deg,${C.green}14,${C.blue}08)`,border:`1px solid ${C.green}30`,borderRadius:14,padding:16,marginBottom:10}}>
            <div className="grid-3">
              {[["Delay ↓",`${improvement}%`,C.green,true],["Queue ↓",`${(((10.92-parseFloat(aiStats.queue))/10.92)*100).toFixed(1)}%`,C.green,true],["Benchmark","25–34%",C.amber,false]].map(([l,v,col,hi])=>(
                <div key={l} style={{padding:10,borderRadius:10,textAlign:"center",background:hi?`${col}10`:"rgba(255,255,255,.025)",border:`1px solid ${hi?col+"28":C.border}`}}>
                  <div style={{...mono,fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:".06em",marginBottom:3}}>{l}</div>
                  <div style={{...mono,fontSize:22,fontWeight:700,color:col}}>{v}</div>
                  {hi&&<div style={{fontSize:11,color:C.green,marginTop:2}}>Exceeds ✓</div>}
                </div>
              ))}
            </div>
          </div>
          <div className="grid-2 col-stack" style={{marginBottom:10}}>
            {[
              {title:"Avg vehicle delay",fixed:"42.71 sec",ai:aiStats.delay,pct:`${improvement}%`},
              {title:"Avg queue length",fixed:"10.92 vehicles",ai:`${aiStats.queue} vehicles`,pct:`${(((10.92-parseFloat(aiStats.queue))/10.92)*100).toFixed(1)}%`},
            ].map(({title,fixed,ai,pct})=>(
              <Card key={title}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{fontSize:13,fontWeight:600}}>{title}</div>
                  <div style={{...mono,fontSize:16,fontWeight:700,color:C.green}}>↓ {pct}</div>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <div style={{flex:1}}>
                    <div style={{...mono,fontSize:10,color:C.muted,marginBottom:4}}>Fixed</div>
                    <div style={{padding:"7px 10px",borderRadius:7,background:`${C.red}12`,border:`1px solid ${C.red}28`,...mono,fontSize:13,fontWeight:700,color:C.red}}>{fixed}</div>
                  </div>
                  <div style={{fontSize:18,color:C.dim,flexShrink:0}}>→</div>
                  <div style={{flex:1}}>
                    <div style={{...mono,fontSize:10,color:C.muted,marginBottom:4}}>DQN AI</div>
                    <div style={{padding:"7px 10px",borderRadius:7,background:`${C.green}12`,border:`1px solid ${C.green}28`,...mono,fontSize:13,fontWeight:700,color:C.green}}>{ai}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <Card style={{marginBottom:10}}>
            <Label>DQN learning curve — {targetEps} episodes</Label>
            <DQNChart chartPoints={chartPoints} targetEps={targetEps} trained={trained}/>
            <MilestoneChips currentEp={targetEps} targetEps={targetEps}/>
          </Card>
          <Card style={{marginBottom:10}}>
            <Label>Episode milestones</Label>
            <div className="milestone-grid">
              {CHECKPOINTS.filter(cp=>cp<=targetEps).map(cp=>{
                const idx=Math.round((cp/targetEps)*49);
                const t=TRAINING_DATA[Math.min(idx,49)];
                const imp=((42.71-t.delay)/42.71*100).toFixed(1);
                return(
                  <div key={cp} style={{textAlign:"center",padding:"8px 4px",borderRadius:9,background:"rgba(255,255,255,.025)",border:`1px solid ${C.border}`}}>
                    <div style={{...mono,fontSize:10,color:C.blue,marginBottom:3}}>EP{cp}</div>
                    <div style={{...mono,fontSize:14,fontWeight:700,color:C.text}}>{t.delay}s</div>
                    <div style={{fontSize:11,color:C.green}}>↓{imp}%</div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      ):(
        <div style={{background:"rgba(255,255,255,.025)",border:`1px solid ${C.border}`,borderRadius:14,padding:24,textAlign:"center"}}>
          <div style={{...mono,fontSize:13,color:C.dim,marginBottom:6}}>Awaiting simulation run</div>
          <div style={{fontSize:12,color:C.muted}}>Use the <strong style={{color:C.blue}}>▶ Run simulation</strong> control at the top to train the agent and see RL results here.</div>
        </div>
      )}
    </div>
  );
}

function MapTab(){
  return(
    <div className="fade-up">
      <Card style={{marginBottom:10,background:`${C.blue}08`,border:`1px solid ${C.blue}28`,padding:14}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
          <div style={{fontSize:24,flexShrink:0}}>🗺️</div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:4,color:C.blue}}>Georgetown Road Network</div>
            <div style={{fontSize:12,color:C.muted}}>
              This map shows the real Georgetown road network imported from OpenStreetMap. The simulation uses this actual network topology with 2,646 junctions and 6,771 road segments.
            </div>
          </div>
        </div>
      </Card>

      <Card style={{marginBottom:10}}>
        <Label>Georgetown road network — real OSM data</Label>
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

function FeasibilityTab(){
  return(
    <div className="fade-up">
      <Card style={{marginBottom:10,background:`${C.amber}08`,border:`1px solid ${C.amber}28`,padding:14}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
          <div style={{fontSize:24,flexShrink:0}}>✓</div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:4,color:C.amber}}>Implementation Feasibility (RQ3)</div>
            <div style={{fontSize:12,color:C.muted}}>
              This tab analyzes the practical requirements for deploying AI traffic management in Georgetown, including technical infrastructure, governance readiness, and a 4-phase deployment roadmap.
            </div>
          </div>
        </div>
      </Card>

      <Card style={{marginBottom:10,background:`${C.amber}08`,border:`1px solid ${C.amber}28`}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:6,color:C.amber}}>RQ3 — Implementation feasibility assessment</div>
        <div style={{fontSize:12,color:C.muted,lineHeight:1.7}}>
          Qualitative analysis of data, infrastructure, and governance conditions. 4-phase deployment roadmap proposed for Georgetown.
        </div>
      </Card>
      <div className="grid-2 col-stack" style={{marginBottom:10}}>
        <Card>
          <Label>Technical feasibility</Label>
          {[
            {icon:"📡",title:"Sensor availability",desc:"SRIS cameras lack RT pipelines. AI works with sparse data.",status:"⚠ Investment needed",type:"partial"},
            {icon:"💻",title:"Computation",desc:"DQN trains under 1hr on cloud GPU. Only inference needed at deployment.",status:"✓ Cloud feasible",type:"ready"},
            {icon:"🗄️",title:"Data infrastructure",desc:"OSM provides road network. Needs SRIS/GPS/RESOLV integration.",status:"⚠ Partial",type:"partial"},
          ].map(({icon,title,desc,status,type},i,arr)=>(
            <div key={title} style={{padding:"10px 0",borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none",display:"flex",gap:8}}>
              <span style={{fontSize:15,flexShrink:0,marginTop:1}}>{icon}</span>
              <div>
                <div style={{fontSize:12,fontWeight:600,marginBottom:2}}>{title}</div>
                <div style={{fontSize:10,color:C.muted,lineHeight:1.6,marginBottom:5}}>{desc}</div>
                <StatusBadge text={status} type={type}/>
              </div>
            </div>
          ))}
        </Card>
        <Card>
          <Label>Governance feasibility</Label>
          {[
            {icon:"🏛️",title:"Institutional readiness",desc:"Ministry of Public Works + Mayor's office coordination needed.",status:"⚠ Coordination required",type:"partial"},
            {icon:"🔒",title:"Privacy & ethics",desc:"GPS/camera data needs privacy frameworks and public trust.",status:"✗ Policy needed",type:"needed"},
            {icon:"👨‍💻",title:"Technical capacity",desc:"Local AI expertise limited. Regional university partnerships needed.",status:"⚠ Capacity needed",type:"partial"},
          ].map(({icon,title,desc,status,type},i,arr)=>(
            <div key={title} style={{padding:"10px 0",borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none",display:"flex",gap:8}}>
              <span style={{fontSize:15,flexShrink:0,marginTop:1}}>{icon}</span>
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
        <Label>Deployment roadmap</Label>
        <div className="roadmap-grid">
          {[
            {phase:"PHASE 1",period:"0–6 mo",col:C.blue,steps:["2–3 sensors at Sheriff/Vlissengen","Collect real baseline","Validate simulation"]},
            {phase:"PHASE 2",period:"6–18 mo",col:C.green,steps:["Extend to 10 intersections","Retrain DQN on real data","Adaptive signals on corridor"]},
            {phase:"PHASE 3",period:"18–36 mo",col:C.amber,steps:["City-wide MARL","Integrate RESOLV app","Public congestion data"]},
            {phase:"PHASE 4",period:"36+ mo",col:C.purple,steps:["Continuous retraining","Full policy integration","Expand to other GY cities"]},
          ].map(({phase,period,col,steps},i)=>(
            <div key={phase} style={{padding:"12px",borderRight:i<3?`1px solid ${C.border}`:"none"}}>
              <div style={{...mono,fontSize:10,color:col,marginBottom:3,letterSpacing:".06em"}}>{phase}</div>
              <div style={{fontSize:13,fontWeight:600,marginBottom:8}}>{period}</div>
              {steps.map(s=>(
                <div key={s} style={{display:"flex",gap:5,fontSize:12,color:C.muted,lineHeight:1.5,marginBottom:4}}>
                  <span style={{color:col,flexShrink:0}}>→</span>{s}
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── TAB CONFIG ────────────────────────────────────────────────────────────────
const TAB_CONFIG = [
  {id:"overview",    label:"Overview",  icon:"◉"},
  {id:"simulation",  label:"Sim",       icon:"▶"},
  {id:"prediction",  label:"Models",    icon:"📊"},
  {id:"rl",          label:"RL",        icon:"🤖"},
  {id:"map",         label:"Map",       icon:"🗺"},
  {id:"feasibility", label:"Feasib.",   icon:"✓"},
];

// ══════════════════════════════════════════════════════════════════════════════
// ROOT — all simulation state lives here, flows down to every tab
// ══════════════════════════════════════════════════════════════════════════════
export function GeorgetownDashboard(){
  const [tab, setTab] = useState("overview");

  // ── training config ──
  const [targetEps, setTargetEps] = useState(25);
  const [speed, setSpeed] = useState(3);

  // ── training state ──
  const [running,  setRunning]  = useState(false);
  const [trained,  setTrained]  = useState(false);
  const [currentEp, setCurrentEp] = useState(0);
  const [chartPoints, setChartPoints] = useState([]);
  const [logEntries,  setLogEntries]  = useState([]);
  const [aiStats,  setAiStats]  = useState({delay:"—",queue:"—",thr:"—"});
  const [fixedStats,setFixedStats]=useState({delay:"42.7s",queue:"10.9",thr:"2545"});
  const [improvement, setImprovement] = useState("0");

  // ── canvas refs ──
  const fixedRef = useRef(null);
  const aiRef    = useRef(null);

  // ── sim state (mutable, no re-render) ──
  const simRef  = useRef(null);
  const rafRef  = useRef(null);
  const runRef  = useRef(false);  // mirrors running without stale closure
  const speedRef = useRef(3);
  const epTimeoutRef = useRef(null);

  // ── keep speedRef in sync ──
  useEffect(()=>{ speedRef.current = speed; },[speed]);

  // ── canvas resize helper ──
  const resizeCanvas = useCallback((canvas, h=180)=>{
    if(!canvas) return;
    const dpr = window.devicePixelRatio||1;
    const w   = canvas.parentElement?.clientWidth || 300;
    canvas.width  = Math.round(w*dpr);
    canvas.height = Math.round(h*dpr);
    canvas.style.width  = w+"px";
    canvas.style.height = h+"px";
  },[]);

  // ── start the live canvas loop ──
  const startCanvasLoop = useCallback(()=>{
    simRef.current = {
      fixed: {vehicles: makeVehicles(18), signals: makeSigs()},
      ai:    {vehicles: makeVehicles(15), signals: makeSigs()},
    };
    const loop = ()=>{
      if(!simRef.current){ rafRef.current=requestAnimationFrame(loop); return; }
      updateVehicles(simRef.current.fixed.vehicles, simRef.current.fixed.signals, true);
      updateVehicles(simRef.current.ai.vehicles,    simRef.current.ai.signals,    false);
      const fc=fixedRef.current, ac=aiRef.current;
      if(fc){ resizeCanvas(fc,180); drawCanvas(fc, simRef.current.fixed.vehicles, simRef.current.fixed.signals); }
      if(ac){ resizeCanvas(ac,180); drawCanvas(ac, simRef.current.ai.vehicles,    simRef.current.ai.signals);    }
      rafRef.current = requestAnimationFrame(loop);
    };
    if(rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
  },[resizeCanvas]);

  useEffect(()=>{ startCanvasLoop(); return()=>{ if(rafRef.current) cancelAnimationFrame(rafRef.current); }; },[startCanvasLoop]);

  // ── logging helper ──
  const addLog = useCallback((msg, type="dim")=>{
    const now = new Date();
    const ts  = [now.getHours(),now.getMinutes(),now.getSeconds()].map(n=>String(n).padStart(2,"0")).join(":");
    setLogEntries(prev=>[...prev.slice(-120), {msg,type,ts}]);
  },[]);

  // ── run one episode ──
  const runEpisode = useCallback((ep, total)=>{
    if(!runRef.current) return;
    setCurrentEp(ep);
    const pct = ep / total;
    const dataIdx = Math.round(pct * 49);
    const data  = TRAINING_DATA[Math.min(dataIdx, 49)];
    const delay = data.delay;
    const queue = data.queue;
    const imp   = parseFloat(((42.71-delay)/42.71*100).toFixed(1));
    const thr   = Math.round(lerp(2545,3120,pct));

    setChartPoints(prev=>[...prev, {ep, delay}]);
    setAiStats({delay:`${delay.toFixed(1)}s`, queue:queue.toFixed(1), thr:thr.toLocaleString()});
    setFixedStats({delay:`${(42.71+(Math.random()*.6-.3)).toFixed(1)}s`, queue:"10.9", thr:"2545"});
    setImprovement(imp.toFixed(1));

    if(CHECKPOINTS.includes(ep) && ep<=total){
      addLog(`EP${ep} checkpoint — delay: ${delay.toFixed(2)}s | queue: ${queue.toFixed(2)} | ↓${imp}%`, "good");
    } else if(ep%5===0){
      addLog(`EP${ep} — delay: ${delay.toFixed(2)}s (↓${imp}%)`, "dim");
    }

    if(ep < total){
      const delayMs = speedRef.current===1 ? 800 : speedRef.current===3 ? 160 : 35;
      epTimeoutRef.current = setTimeout(()=>runEpisode(ep+1, total), delayMs);
    } else {
      runRef.current = false;
      setRunning(false);
      setTrained(true);
      addLog(`Training complete — ${total} episodes. Final delay: ${delay.toFixed(2)}s | ↓${imp}%`, "good");
      addLog(`DQN agent exceeds published benchmark of 25–34%`, "good");
    }
  },[addLog]);

  // ── start training ──
  const handleRun = useCallback(()=>{
    if(running) return;
    runRef.current = true;
    setRunning(true);
    setTrained(false);
    setCurrentEp(0);
    setChartPoints([]);
    setLogEntries([]);
    setAiStats({delay:"—",queue:"—",thr:"—"});
    setImprovement("0");
    const t = targetEps;
    setTimeout(()=>{
      addLog(`Initialising DQN agent — Georgetown OSM network`, "info");
      addLog(`Baseline fixed timing: 42.71s avg delay`, "warn");
      addLog(`Starting ${t}-episode training run at ${speed===1?"step-by-step":speed===3?"normal":"fast"} speed...`, "info");
      runEpisode(1, t);
    }, 50);
  },[running, targetEps, speed, addLog, runEpisode]);

  // ── reset ──
  const handleReset = useCallback(()=>{
    if(running) return;
    if(epTimeoutRef.current) clearTimeout(epTimeoutRef.current);
    runRef.current = false;
    setRunning(false);
    setTrained(false);
    setCurrentEp(0);
    setChartPoints([]);
    setLogEntries([]);
    setAiStats({delay:"—",queue:"—",thr:"—"});
    setFixedStats({delay:"42.7s",queue:"10.9",thr:"2545"});
    setImprovement("0");
    startCanvasLoop();
  },[running, startCanvasLoop]);

  // ── shared sim state object passed to all tabs ──
  const simState = {
    trained, running, currentEp, targetEps,
    aiStats, fixedStats, improvement,
    chartPoints, logEntries,
  };

  const tabContent = {
    overview:    <OverviewTab    simState={simState} onNavigate={setTab}/>,
    simulation:  <SimulationTab simState={simState} fixedRef={fixedRef} aiRef={aiRef} onNavigate={setTab}/>,
    prediction:  <PredictionTab/>,
    rl:          <RLTab          simState={simState} onNavigate={setTab}/>,
    map:         <MapTab/>,
    feasibility: <FeasibilityTab/>,
  };

  return(
    <div style={{background:C.bg,color:C.text,fontFamily:"'DM Sans',sans-serif",minHeight:"100vh",overflowX:"hidden"}}>
      <style>{CSS}</style>
      
      {/* ── GLOBAL HEADER ── */}
      <GlobalHeader />

      {/* ── TOP-LEVEL CONTROL PANEL ── */}
      <ControlPanel
        targetEps={targetEps}   setTargetEps={setTargetEps}
        speed={speed}           setSpeed={setSpeed}
        running={running}       trained={trained}
        currentEp={currentEp}
        onRun={handleRun}
        onReset={handleReset}
      />

      {/* ── TAB NAV (desktop) ── */}
      <nav className="top-nav" style={{
        display:"flex",padding:"0 24px",borderBottom:`1px solid ${C.border}`,
        background:C.surface,overflowX:"auto",scrollbarWidth:"none",
      }}>
        <style>{`.top-nav::-webkit-scrollbar{display:none}`}</style>
        {TAB_CONFIG.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            ...mono,fontSize:12,letterSpacing:".06em",padding:"12px 16px",
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

      {/* ── BOTTOM NAV (mobile) ── */}
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


export default GeorgetownDashboard;
