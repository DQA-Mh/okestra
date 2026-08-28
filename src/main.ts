import './style.css'
import { AudioEngine } from './audio/AudioEngine'
import { Tracker } from './hand/Tracker'
import { Baton } from './conduct/Baton'
import { Score } from './conduct/Score'
import { HALLS, renderAudience, renderOrchestra, applyHallColors, type HallId } from './scene/Halls'
import { ThreeHall } from './scene/ThreeHall'
import { PatternEngine } from './conduct/PatternEngine'

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
const pattern = new PatternEngine()

let playing = false
let handR = { x:0.5,y:0.5, vx:0, vy:0, swinging:false, dir:0 }
let handL = { x:0.5,y:0.5, vx:0, vy:0, swinging:false, dir:0 }
let calibHold = 0
let raf = 0
let lastBeatTime = 0

// Opera hall 3D + 2D
const far = document.getElementById('far')!
const mid = document.getElementById('mid')!
const near = document.getElementById('near')!
const light = document.getElementById('light')!
const menuFar = document.getElementById('menuFar') as HTMLElement | null
const threeWrap = document.getElementById('threeWrap')!
let threeHall: ThreeHall | null = null
try { threeHall = new ThreeHall(threeWrap); far.style.opacity='0.0'; mid.style.opacity='0.0' } catch(e){ console.warn('[Three] fallback',e) }
let targetPan = 0
function parallax(v:number){
  far.style.transform = `translateX(${v*12}px)`
  mid.style.transform = `translateX(${v*28}px)`
  near.style.transform = `translateX(${v*40}px)`
  canvas.style.transform = `translateX(${v*14}px)`
  light.style.transform = `translateX(calc(-50% + ${v*30}px))`
  if(menuFar) menuFar.style.transform = `translateX(${v*8}px)`
  threeHall?.setPan(v)
}
let currentHall: HallId = 'vienna'
function setHall(id: HallId){
  currentHall=id
  applyHallColors(id)
  renderAudience(far,id); far.classList.add('has-detailed')
  renderOrchestra(mid,id); mid.classList.add('has-detailed')
  if(menuFar){ renderAudience(menuFar,id); menuFar.classList.add('has-detailed') }
  threeHall?.setHall(id as any)
  document.documentElement.style.setProperty('--accent', HALLS[id].colors.accent)
  document.querySelectorAll('.hallCard').forEach(c=> c.classList.toggle('active', (c as HTMLElement).dataset.hall===id))
}

// Maestro: baton downbeat + dynamics tay trái
tracker.onHands = (r,l)=>{
  handR=r; handL=l
  baton.update(r, audio.time)
  if(playing && r.swinging && Math.abs(r.vy) > 0.9){
    const res = pattern.onDownbeat(r.dir, audio.time, {x:r.x, y:r.y})
    if(res.result){
      // dynamics check: tay trái cao/thấp so với expected
      const expectedDyn = res.beat?.dynamics || 'mf'
      const leftH = handL.y // 0..1, cao = 1
      const dynOk = (expectedDyn==='f'&& leftH>0.6) || (expectedDyn==='ff'&& leftH>0.75) || (expectedDyn==='p'&& leftH<0.4) || (expectedDyn==='pp'&& leftH<0.25) || (['mp','mf'].includes(expectedDyn))
      let final = res.result
      if(!dynOk && final==='Perfect') final='Good'
      score.hit(final)
      feedback.textContent = final + (res.beat?.cue?` ${res.beat.cue}`:'')
      feedback.style.color = final==='Perfect'?'#facc15': final==='Good'?'#22c55e':'#ef4444'
      feedback.style.opacity='1'; feedback.style.transform='translate(-50%,-50%) scale(1.15)'
      setTimeout(()=>{ feedback.style.opacity='0'; feedback.style.transform='translate(-50%,-50%) scale(1)' }, 380)
      // pulse tempo ring
      tempoRing.classList.remove('pulse'); void tempoRing.offsetWidth; tempoRing.classList.add('pulse')
      lastBeatTime = audio.time
    } else if(res.result==='Miss'){
      score.hit('Miss')
    }
  }
}
baton.onDownbeat = ()=>{
  // cũng pulse khi downbeat dù không trúng beat (cảm giác chỉ huy)
  tempoRing.classList.remove('pulse'); void tempoRing.offsetWidth; tempoRing.classList.add('pulse')
}

score.onHit = (r,s,c)=>{
  scoreEl.textContent=`Score ${s}`
  comboEl.textContent=c>1?`Combo x${c}`:''
  accEl.textContent=`Acc ${score.acc.toFixed(1)}%`
  fill.style.width=`${score.audience}%`
}
score.onAud = v=> fill.style.width=`${v}%`

function draw(){
  const W=canvas.width, H=canvas.height
  ctx.clearRect(0,0,W,H)
  // grid nhẹ
  ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=1
  for(let x=0;x<W;x+=80){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke() }
  for(let y=0;y<H;y+=80){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke() }
  // Maestro pattern guide (quỹ đạo)
  pattern.drawGuide(ctx, W, H, audio.time)
  // hands
  const hxR=handR.x*W, hyR=(1-handR.y)*H
  const hxL=handL.x*W, hyL=(1-handL.y)*H
  // dynamics line + label
  ctx.strokeStyle='rgba(212,179,106,0.45)'; ctx.beginPath(); ctx.moveTo(hxL,0); ctx.lineTo(hxL,H); ctx.stroke()
  ctx.fillStyle= handL.y>0.65?'#facc15' : handL.y<0.35?'#60a5fa':'#d4b36a'
  ctx.font='700 11px Inter'; ctx.fillText(handL.y>0.65?'FORTE':handL.y<0.35?'PIANO':'MEZZO', hxL+12, hyL-12)
  // baton trail
  ctx.beginPath(); ctx.arc(hxR,hyR,11,0,Math.PI*2); ctx.fillStyle='#fff'; ctx.fill(); ctx.strokeStyle='#facc15'; ctx.lineWidth=2; ctx.stroke()
  // left hand
  ctx.beginPath(); ctx.arc(hxL,hyL,8,0,Math.PI*2); ctx.fillStyle='rgba(212,179,106,0.9)'; ctx.fill()
  // tempo pulse
  const since = audio.time - lastBeatTime
  if(since < 0.22){
    ctx.globalAlpha = 0.25 - since*1
    ctx.beginPath(); ctx.arc(W*0.5,H*0.5, 80 + since*120, 0, Math.PI*2); ctx.strokeStyle='#d4b36a'; ctx.lineWidth=2; ctx.stroke()
    ctx.globalAlpha=1
  }
  ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.font='12px Inter'; ctx.fillText(`t=${audio.time.toFixed(2)}s  BPM${pattern.bpm} ${pattern.timeSig}`, 12, 20)
  // cue hint
  const cur = pattern.currentBeat
  if(cur){
    ctx.fillStyle='rgba(212,179,106,0.9)'; ctx.font='700 13px Inter'; ctx.textAlign='center'
    ctx.fillText(`Cue: ${cur.cue||'-'}  •  Dynamics: ${cur.dynamics} • Beat ${cur.beatInMeasure+1}/${pattern.timeSig==='4/4'?4:3}`, W*0.5, H-18)
    ctx.textAlign='left'
  }
}

function loop(){
  if(playing){
    // check miss do không vung
    const miss = pattern.checkMiss(audio.time)
    if(miss){ score.hit('Miss'); feedback.textContent='Miss'; feedback.style.color='#ef4444'; feedback.style.opacity='1'; setTimeout(()=>feedback.style.opacity='0',300) }
    draw()
    if(pattern.idx >= pattern.beats.length) end()
    else raf=requestAnimationFrame(loop)
  } else {
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
  pattern.idx=0
  score.reset()
  scoreEl.textContent='Score 0'; comboEl.textContent=''; accEl.textContent='Acc 0%'; fill.style.width='50%'
  calib.classList.add('hidden')
  playing=true
  startBtn.textContent='Đang diễn…'
  startBtn.disabled=true
  lastBeatTime=audio.time
  console.log('[Okestra Maestro] start', pattern.timeSig, pattern.bpm)
}

function end(){
  playing=false; cancelAnimationFrame(raf)
  result.classList.remove('hidden')
  rankEl.textContent=score.rank
  rankEl.style.color= score.rank==='S'?'#facc15': score.rank==='A'?'#22c55e': score.rank==='B'?'#06b6d4':'#ef4444'
  rScore.textContent=`Score ${score.score} • Max Combo ${score.maxCombo}`
  rStats.textContent=`Perfect ${score.perfect} Good ${score.good} Miss ${score.miss} • Acc ${score.acc.toFixed(1)}%`
}

// MENU
function showMenu(){ menu.classList.remove('hidden'); app.classList.add('hidden') }
function showGame(){ menu.classList.add('hidden'); app.classList.remove('hidden') }
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
document.querySelectorAll('.closeModal').forEach(b=> b.addEventListener('click', ()=>{ (b.closest('.modal') as HTMLElement).classList.add('hidden') }))
document.querySelectorAll('.songCard').forEach(c=> c.addEventListener('click', ()=>{
  const id=(c as HTMLElement).dataset.id
  // chọn tác phẩm → đổi hall/beatmap tương ứng (demo: beethoven->4/4, strauss->3/4)
  if(id==='strauss'){ pattern.timeSig='3/4'; pattern.bpm=110 } else { pattern.timeSig='4/4'; pattern.bpm=120 }
  document.getElementById('modalSongs')?.classList.add('hidden'); showGame(); calib.classList.remove('hidden')
}))
document.querySelectorAll('.hallCard').forEach(c=>{
  c.addEventListener('click', ()=>{
    const hid=(c as HTMLElement).dataset.hall as HallId
    if(hid) setHall(hid)
  })
})
setHall('vienna')
document.getElementById('vol')?.addEventListener('input', e=>{ const _v=parseFloat((e.target as HTMLInputElement).value); void _v })
document.getElementById('diff')?.addEventListener('input', e=>{
  const v=parseFloat((e.target as HTMLInputElement).value)
  const lab=document.getElementById('diffVal')!
  if(v<0.33) lab.textContent='Easy'; else if(v<0.66) lab.textContent='Normal'; else lab.textContent='Hard'
  // ánh xạ difficulty vào window
  if(v<0.33){ pattern.perfectWindow=0.12; pattern.goodWindow=0.24 }
  else if(v<0.66){ pattern.perfectWindow=0.09; pattern.goodWindow=0.19 }
  else { pattern.perfectWindow=0.06; pattern.goodWindow=0.14 }
})
document.getElementById('menuBtn')?.addEventListener('click', ()=>{ showMenu(); playing=false; cancelAnimationFrame(raf) })
document.getElementById('backMenu')?.addEventListener('click', ()=>{ result.classList.add('hidden'); showMenu() })

// game events: fallback phím
window.addEventListener('keydown', e=>{
  if(e.code==='Space'){ e.preventDefault(); if(!playing && calib.classList.contains('hidden')) start(); else { const r=pattern.onDownbeat(handR.dir, audio.time, {x:handR.x,y:handR.y}); if(r.result){ score.hit(r.result as any); feedback.textContent=r.result! } }}
  if(e.code==='ArrowUp'){ const r=pattern.onDownbeat(1, audio.time, {x:handR.x,y:handR.y}); if(r.result) score.hit(r.result as any) }
  if(e.code==='ArrowDown'){ const r=pattern.onDownbeat(0, audio.time, {x:handR.x,y:handR.y}); if(r.result) score.hit(r.result as any) }
  if(e.code==='ArrowLeft'){ const r=pattern.onDownbeat(2, audio.time, {x:handR.x,y:handR.y}); if(r.result) score.hit(r.result as any) }
  if(e.code==='ArrowRight'){ const r=pattern.onDownbeat(3, audio.time, {x:handR.x,y:handR.y}); if(r.result) score.hit(r.result as any) }
  if(e.code==='KeyA') { targetPan=Math.max(-1,targetPan-0.22); parallax(targetPan) }
  if(e.code==='KeyD') { targetPan=Math.min(1,targetPan+0.22); parallax(targetPan) }
})
let dragging=false, sx=0, sp=0
canvas.addEventListener('mousedown', e=>{ dragging=true; sx=e.clientX; sp=targetPan })
window.addEventListener('mousemove', e=>{ if(!dragging) return; const dx=(e.clientX-sx)/innerWidth; targetPan=Math.max(-1,Math.min(1,sp+dx*2)); parallax(targetPan) })
window.addEventListener('mouseup', ()=>dragging=false)
canvas.addEventListener('click', ()=>{ if(!playing) return; const r=pattern.onDownbeat(handR.dir, audio.time, {x:handR.x,y:handR.y}); if(r.result) score.hit(r.result as any) })

startBtn.addEventListener('click', ()=>{ calib.classList.add('hidden'); start() })
camBtn.addEventListener('click', async()=>{
  try{
    const s=await navigator.mediaDevices.getUserMedia({video:{width:320,height:240}})
    video.srcObject=s; await video.play(); await tracker.start(); camBtn.textContent='Camera ON'; camBtn.disabled=true; calibHold=0
  }catch(e){ alert('Không mở camera: '+e+'\nDùng chuột giữ + kéo để chơi.') }
})
retry.addEventListener('click', ()=>{
  result.classList.add('hidden'); calib.classList.remove('hidden'); calibHold=0; startBtn.disabled=false; startBtn.textContent='Bắt đầu'; score.reset(); loadBeats().then(()=>loop())
})

// init
async function loadBeats(){
  try{
    const res=await fetch('/beatmaps/okestra_beatmap.json')
    const data=await res.json()
    pattern.load(data, '4/4', 120)
  }catch{
    const data=Array.from({length:32},(_,i)=>({ time:2+i*0.55, dir:i%4 }))
    pattern.load(data, '4/4', 120)
  }
}
setTimeout(()=>{ document.getElementById('curtainL')?.classList.add('open'); document.getElementById('curtainR')?.classList.add('open') }, 600)
loadBeats().then(()=>loop())
