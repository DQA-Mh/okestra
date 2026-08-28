import './style.css'
import { AudioEngine } from './audio/AudioEngine'
import { Tracker } from './hand/Tracker'
import { Baton } from './conduct/Baton'
import { Score } from './conduct/Score'

type Beat = { time:number, dir:number, x?:number, y?:number, cue?:string }

const menu = document.getElementById('menu')!
const app = document.getElementById('app')!
const canvas = document.getElementById('c') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!
const scoreEl = document.getElementById('score')!
const comboEl = document.getElementById('combo')!
const accEl = document.getElementById('acc')!
const fill = document.getElementById('audienceFill') as HTMLElement
const feedback = document.getElementById('feedback')!
const startBtn = document.getElementById('startBtn') as HTMLButtonElement
const camBtn = document.getElementById('camBtn') as HTMLButtonElement
const video = document.getElementById('camVideo') as HTMLVideoElement
const camCanvas = document.getElementById('camCanvas') as HTMLCanvasElement
const calib = document.getElementById('calib')!
const frame = document.getElementById('frame')!
const result = document.getElementById('result')!
const rankEl = document.getElementById('rank')!
const rScore = document.getElementById('rScore')!
const rStats = document.getElementById('rStats')!
const retry = document.getElementById('retry') as HTMLButtonElement
const tempoRing = document.getElementById('tempoRing')!
const menuBtn = document.getElementById('menuBtn') as HTMLButtonElement | null
const backMenu = document.getElementById('backMenu') as HTMLButtonElement | null

const audio = new AudioEngine()
const tracker = new Tracker(video, camCanvas)
const baton = new Baton()
const score = new Score()

let beats: Beat[] = []
let notes: { x:number,y:number,time:number,dir:number,cue:string, active:boolean }[] = []
let next = 0
let travel = 1.4
let playing = false
let handR = { x:0.5,y:0.5, vx:0, vy:0, swinging:false, dir:0 }
let handL = { x:0.5,y:0.5, vx:0, vy:0, swinging:false, dir:0 }
let calibHold = 0
let raf = 0

// Opera hall parallax
const far = document.getElementById('far')!
const mid = document.getElementById('mid')!
const near = document.getElementById('near')!
const light = document.getElementById('light')!
let targetPan = 0
function parallax(v:number){
  far.style.transform = `translateX(${v*12}px)`
  mid.style.transform = `translateX(${v*28}px)`
  near.style.transform = `translateX(${v*40}px)`
  canvas.style.transform = `translateX(${v*14}px)`
  light.style.transform = `translateX(calc(-50% + ${v*30}px))`
}

tracker.onHands = (r,l)=>{
  handR=r; handL=l
  baton.update(r, audio.time)
  if(playing && r.swinging && Math.abs(r.vy) > 1){
    tryHit(r.x, r.y, r.dir, {x:r.vx,y:r.vy})
  }
}
baton.onDownbeat = ()=>{
  tempoRing.classList.remove('pulse'); void tempoRing.offsetWidth; tempoRing.classList.add('pulse')
}

score.onHit = (r,s,c)=>{
  scoreEl.textContent = `Score ${s}`
  comboEl.textContent = c>1 ? `Combo x${c}` : ''
  accEl.textContent = `Acc ${score.acc.toFixed(1)}%`
  // audience light
  fill.style.width = `${score.audience}%`
  // feedback
  feedback.textContent = r
  feedback.style.color = r==='Perfect'?'#facc15': r==='Good'?'#22c55e':'#ef4444'
  feedback.style.opacity='1'
  feedback.style.transform='translate(-50%,-50%) scale(1.15)'
  setTimeout(()=>{ feedback.style.opacity='0'; feedback.style.transform='translate(-50%,-50%) scale(1)' }, 350)
}
score.onAud = v=> fill.style.width = `${v}%`

function spawn(){
  const t = audio.time
  while(next < beats.length && beats[next].time - travel <= t){
    const b = beats[next]
    notes.push({ x:b.x!, y:b.y!, time:b.time, dir:b.dir, cue:b.cue||'', active:true })
    next++
  }
  // miss
  for(const n of notes) if(n.active && t > n.time + 0.25){ n.active=false; score.hit('Miss') }
  notes = notes.filter(n=>n.active)
}

function tryHit(x:number,y:number, dir:number, _vel:{x:number,y:number}){
  const t = audio.time
  let best:any=null, bestDiff=Infinity
  const W=canvas.width, H=canvas.height
  for(const n of notes){
    if(!n.active) continue
    const diff=Math.abs(t-n.time)
    if(diff>0.25) continue
    const px=n.x*W, py=(1-n.y)*H, hx=x*W, hy=(1-y)*H
    const dist=Math.hypot(px-hx, py-hy)
    if(dist>90) continue
    if(diff<bestDiff){ best=n; bestDiff=diff }
  }
  if(!best){
    // fallback time only (Space)
    for(const n of notes){ if(!n.active) continue; const d=Math.abs(t-n.time); if(d<bestDiff){ best=n; bestDiff=d } }
    if(!best) return null
  }
  const match = best.dir===dir
  let res: 'Perfect'|'Good'|null = null
  if(bestDiff<=0.08 && match) res='Perfect'
  else if(bestDiff<=0.18) res='Good'
  else return null
  if(!match && res==='Perfect') res='Good'
  best.active=false
  score.hit(res)
  return { res, diff:bestDiff }
}

function draw(){
  const W=canvas.width, H=canvas.height
  ctx.clearRect(0,0,W,H)
  // subtle grid
  ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=1
  for(let x=0;x<W;x+=80){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke() }
  for(let y=0;y<H;y+=80){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke() }
  const t=audio.time
  for(const n of notes){
    const p=Math.min(1,Math.max(0,(t - (n.time - travel))/travel))
    const pulse=0.75 + p*0.45 + Math.sin(t*7)*0.04*(p>0.6?1:0)
    const px=n.x*W, py=(1-n.y)*H
    const r=34*pulse
    const colors=['#ef4444','#22c55e','#06b6d4','#facc15']
    const col=colors[n.dir]
    ctx.globalAlpha=0.16 + p*0.18
    ctx.beginPath(); ctx.arc(px,py,r+12,0,Math.PI*2); ctx.strokeStyle=col; ctx.lineWidth=3; ctx.stroke()
    ctx.globalAlpha=1
    ctx.beginPath(); ctx.arc(px,py,r,0,Math.PI*2); ctx.fillStyle=col; ctx.fill(); ctx.strokeStyle='#ffffffcc'; ctx.lineWidth=2; ctx.stroke()
    // cue text
    ctx.fillStyle='#0a0e1a'; ctx.font='700 10px system-ui'; ctx.textAlign='center'; ctx.fillText(n.cue, px, py+4)
    // arrow
    ctx.save(); ctx.translate(px,py); ctx.rotate(n.dir*Math.PI/2); ctx.fillStyle='#0a0e1a'; ctx.beginPath(); ctx.moveTo(0,-10); ctx.lineTo(-7,7); ctx.lineTo(7,7); ctx.closePath(); ctx.fill(); ctx.restore()
    if(n.time > t) { ctx.fillStyle='#fff'; ctx.font='11px system-ui'; ctx.fillText((n.time - t).toFixed(2)+'s', px, py + r + 16) }
  }
  // hands
  const hxR=handR.x*W, hyR=(1-handR.y)*H
  const hxL=handL.x*W, hyL=(1-handL.y)*H
  // left dynamics line
  ctx.strokeStyle='rgba(212,179,106,0.5)'; ctx.beginPath(); ctx.moveTo(hxL,0); ctx.lineTo(hxL,H); ctx.stroke()
  // baton
  ctx.beginPath(); ctx.arc(hxR,hyR,11,0,Math.PI*2); ctx.fillStyle='#fff'; ctx.fill(); ctx.strokeStyle='#facc15'; ctx.lineWidth=2; ctx.stroke()
  ctx.beginPath(); ctx.arc(hxL,hyL,8,0,Math.PI*2); ctx.fillStyle='rgba(212,179,106,0.9)'; ctx.fill()
  // dynamics label
  const dyn = handL.y > 0.65 ? 'forte' : handL.y < 0.35 ? 'piano' : 'mezzo'
  ctx.fillStyle='#d4b36a'; ctx.font='11px system-ui'; ctx.fillText(dyn, hxL+12, hyL-12)
  ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.font='12px system-ui'; ctx.fillText(`t=${t.toFixed(2)}s`, 12, 20)
}

function loop(){
  if(playing){
    spawn(); draw()
    if(next>=beats.length && notes.length===0) end()
    else raf=requestAnimationFrame(loop)
  } else {
    // calib
    const m=(tracker as any).getMouse?.()
    const holding = m?.down || (handR.x>0.33 && handR.x<0.67)
    if(holding){ calibHold+=1/60; const p=Math.min(1,calibHold/1.5); (document.getElementById('calibTxt') as HTMLElement).textContent=`Đang nhận diện... ${Math.floor(p*100)}%`; frame.style.borderColor=`rgb(${255*(1-p)},${255*p},120)`; if(p>=1) calib.classList.add('hidden') }
    else calibHold=Math.max(0, calibHold-1/30)
    draw()
    raf=requestAnimationFrame(loop)
  }
}

async function start(){
  await audio.play()
  next=0; notes=[]; score.reset()
  scoreEl.textContent='Score 0'; comboEl.textContent=''; accEl.textContent='Acc 0%'; fill.style.width='50%'
  calib.classList.add('hidden')
  playing=true
  startBtn.textContent='Đang diễn…'
  startBtn.disabled=true
  console.log('[Okestra] start')
}

function end(){
  playing=false; cancelAnimationFrame(raf)
  result.classList.remove('hidden')
  rankEl.textContent=score.rank
  rankEl.style.color= score.rank==='S'?'#facc15': score.rank==='A'?'#22c55e': score.rank==='B'?'#06b6d4':'#ef4444'
  rScore.textContent=`Score ${score.score} • Max Combo ${score.maxCombo}`
  rStats.textContent=`Perfect ${score.perfect} Good ${score.good} Miss ${score.miss} • Acc ${score.acc.toFixed(1)}%`
}

// MENU — Phase 1 đẹp
function showMenu(){ menu.classList.remove('hidden'); app.classList.add('hidden') }
function showGame(){ menu.classList.add('hidden'); app.classList.remove('hidden') }
// Curtain menu auto open
setTimeout(()=>{ document.getElementById('menuCurtainL')?.classList.add('open'); document.getElementById('menuCurtainR')?.classList.add('open') }, 300)
document.querySelectorAll('.menuBtn').forEach(b=>{
  b.addEventListener('click', ()=>{
    const act=(b as HTMLElement).dataset.action
    if(act==='start'){ showGame(); calib.classList.remove('hidden'); }
    else if(act==='songs'){ document.getElementById('modalSongs')?.classList.remove('hidden') }
    else if(act==='tutorial'){ document.getElementById('modalTutorial')?.classList.remove('hidden') }
    else if(act==='batons'){ document.getElementById('modalBatons')?.classList.remove('hidden') }
    else if(act==='settings'){ document.getElementById('modalSettings')?.classList.remove('hidden') }
  })
})
document.querySelectorAll('.closeModal').forEach(b=> b.addEventListener('click', ()=>{
  (b.closest('.modal') as HTMLElement).classList.add('hidden')
}))
document.querySelectorAll('.songCard').forEach(c=> c.addEventListener('click', ()=>{
  document.getElementById('modalSongs')?.classList.add('hidden'); showGame(); calib.classList.remove('hidden')
}))
document.getElementById('vol')?.addEventListener('input', e=>{ const _v=parseFloat((e.target as HTMLInputElement).value); void _v })
document.getElementById('diff')?.addEventListener('input', e=>{
  const v=parseFloat((e.target as HTMLInputElement).value)
  const lab=document.getElementById('diffVal')!
  if(v<0.33) lab.textContent='Easy'; else if(v<0.66) lab.textContent='Normal'; else lab.textContent='Hard'
  void (0.12 - v*0.07)
  travel = 1.4
})
menuBtn?.addEventListener('click', ()=>{ showMenu(); playing=false; cancelAnimationFrame(raf) })
backMenu?.addEventListener('click', ()=>{ result.classList.add('hidden'); showMenu() })

// events game
window.addEventListener('keydown', e=>{
  if(e.code==='Space'){ e.preventDefault(); if(!playing && calib.classList.contains('hidden')) start(); else { const r=tryHit(handR.x,handR.y,handR.dir,{x:0,y:1}); if(r) feedback.textContent=r.res }}
  if(e.code==='ArrowUp'){ const r=tryHit(handR.x,handR.y,1,{x:0,y:1}); if(r) feedback.textContent=r.res }
  if(e.code==='ArrowDown'){ const r=tryHit(handR.x,handR.y,0,{x:0,y:-1}); if(r) feedback.textContent=r.res }
  if(e.code==='ArrowLeft'){ const r=tryHit(handR.x,handR.y,2,{x:-1,y:0}); if(r) feedback.textContent=r.res }
  if(e.code==='ArrowRight'){ const r=tryHit(handR.x,handR.y,3,{x:1,y:0}); if(r) feedback.textContent=r.res }
  if(e.code==='KeyA') { targetPan=Math.max(-1,targetPan-0.22); parallax(targetPan) }
  if(e.code==='KeyD') { targetPan=Math.min(1,targetPan+0.22); parallax(targetPan) }
})
let dragging=false, sx=0, sp=0
canvas.addEventListener('mousedown', e=>{ dragging=true; sx=e.clientX; sp=targetPan })
window.addEventListener('mousemove', e=>{ if(!dragging) return; const dx=(e.clientX-sx)/innerWidth; targetPan=Math.max(-1,Math.min(1,sp+dx*2)); parallax(targetPan) })
window.addEventListener('mouseup', ()=>dragging=false)
canvas.addEventListener('click', ()=>{ if(!playing) return; const r=tryHit(handR.x,handR.y,handR.dir,{x:0,y:1}); if(r) feedback.textContent=r.res })

startBtn.addEventListener('click', ()=>{ calib.classList.add('hidden'); start() })
camBtn.addEventListener('click', async()=>{
  try{
    const s=await navigator.mediaDevices.getUserMedia({video:{width:320,height:240}})
    video.srcObject=s; await video.play(); await tracker.start(); camBtn.textContent='Camera ON'; camBtn.disabled=true; calibHold=0
  }catch(e){ alert('Không mở camera: '+e+'\nDùng chuột giữ + kéo để chơi.') }
})
retry.addEventListener('click', ()=>{
  result.classList.add('hidden'); calib.classList.remove('hidden'); calibHold=0; startBtn.disabled=false; startBtn.textContent='Bắt đầu'; score.reset(); loadBeatsInternal().then(()=>loop())
})

// init
async function loadBeatsInternal(){
  try{
    const res=await fetch('/beatmaps/okestra_beatmap.json')
    beats=await res.json()
    beats.forEach(b=>{ if(b.x===undefined){ b.x=Math.random()*0.7+0.15; b.y=Math.random()*0.55+0.25; b.cue=['Strings','Brass','Winds','Perc'][b.dir%4] }})
    beats.sort((a,b)=>a.time-b.time)
  }catch{ beats=Array.from({length:32},(_,i)=>({ time:2+i*0.55, dir:i%4, x:Math.random()*0.7+0.15, y:Math.random()*0.55+0.25, cue:['Strings','Brass','Winds','Perc'][i%4] })) }
}
setTimeout(()=>{ document.getElementById('curtainL')?.classList.add('open'); document.getElementById('curtainR')?.classList.add('open') }, 600)
loadBeatsInternal().then(()=>loop())
