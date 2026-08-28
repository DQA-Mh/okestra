import './style.css'
import { AudioEngine } from './audio/AudioEngine'
import { Tracker } from './hand/Tracker'
import { Score } from './conduct/Score'
import { HALLS, renderAudience, renderOrchestra, applyHallColors, type HallId } from './scene/Halls'
import { ThreeHall } from './scene/ThreeHall'
import { TilesEngine } from './tiles/TilesEngine'

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
const menuBtn = document.getElementById('menuBtn') as HTMLButtonElement | null
const backMenu = document.getElementById('backMenu') as HTMLButtonElement | null

const audio = new AudioEngine()
const tracker = new Tracker(video, camCanvas)
const score = new Score()
const tiles = new TilesEngine()

let playing = false
let handR = { x:0.5,y:0.5, vx:0, vy:0, swinging:false, dir:0 }
let calibHold = 0
let raf = 0

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
function setHall(id: HallId){
  applyHallColors(id)
  renderAudience(far,id); far.classList.add('has-detailed')
  renderOrchestra(mid,id); mid.classList.add('has-detailed')
  if(menuFar){ renderAudience(menuFar,id); menuFar.classList.add('has-detailed') }
  threeHall?.setHall(id as any)
  document.documentElement.style.setProperty('--accent', HALLS[id].colors.accent)
  document.querySelectorAll('.hallCard').forEach(c=> c.classList.toggle('active', (c as HTMLElement).dataset.hall===id))
}

tracker.onHands = (r,l)=>{
  handR=r
  if(playing && r.swinging){
    const lane = Math.min(3, Math.max(0, Math.floor(r.x * 4)))
    const res = tiles.tap(lane, audio.time)
    if(res.res){
      score.hit(res.res)
      feedback.textContent=res.res
      feedback.style.color=res.res==='Perfect'?'#facc15': res.res==='Good'?'#22c55e':'#ef4444'
      feedback.style.opacity='1'; setTimeout(()=>feedback.style.opacity='0',280)
    }
  }
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
  tiles.canvasH = H
  tiles.draw(ctx, W, H, audio.time)
  const lane = Math.floor(handR.x*4)
  if(handR.swinging || (tracker as any).getMouse?.().down){
    ctx.fillStyle='rgba(212,179,106,0.14)'
    ctx.fillRect(lane * W/4, 0, W/4, H)
  }
  const hxR=handR.x*W, hyR=(1-handR.y)*H
  ctx.beginPath(); ctx.arc(hxR,hyR,9,0,Math.PI*2); ctx.fillStyle='#fff'; ctx.fill(); ctx.strokeStyle='#facc15'; ctx.lineWidth=1.5; ctx.stroke()
  ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.font='12px Inter'; ctx.fillText(`t=${audio.time.toFixed(2)}s • tiles ${tiles.tiles.length}`, 12, 20)
  ctx.fillStyle='rgba(212,179,106,0.9)'; ctx.font='700 12px Inter'; ctx.textAlign='center'
  ctx.fillText(`Magic Tiles • D F J K • Giữ cho HOLD`, W*0.5, H-14)
  ctx.textAlign='left'
}

function loop(){
  if(playing){
    const before = [...tiles.tiles]
    tiles.update(audio.time)
    for(const t of before){ if((t as any).missed && !t.hit && !(t as any)._scored){ (t as any)._scored=true; score.hit('Miss'); feedback.textContent='Miss'; feedback.style.color='#ef4444'; feedback.style.opacity='1'; setTimeout(()=>feedback.style.opacity='0',220) } }
    draw()
    if(tiles.idx>=tiles.beats.length && tiles.tiles.length===0) end()
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
  tiles.idx=0; tiles.tiles=[]
  score.reset()
  scoreEl.textContent='Score 0'; comboEl.textContent=''; accEl.textContent='Acc 0%'; fill.style.width='50%'
  calib.classList.add('hidden')
  playing=true
  startBtn.textContent='Đang chơi…'
  startBtn.disabled=true
  console.log('[Okestra Tiles] start')
}

function end(){
  playing=false; cancelAnimationFrame(raf)
  result.classList.remove('hidden')
  rankEl.textContent=score.rank
  rankEl.style.color= score.rank==='S'?'#facc15': score.rank==='A'?'#22c55e': score.rank==='B'?'#06b6d4':'#ef4444'
  rScore.textContent=`Score ${score.score} • Max Combo ${score.maxCombo}`
  rStats.textContent=`Perfect ${score.perfect} Good ${score.good} Miss ${score.miss} • Acc ${score.acc.toFixed(1)}%`
}

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
  if(v<0.33){ tiles.perfectW=0.10; tiles.goodW=0.18 }
  else if(v<0.66){ tiles.perfectW=0.08; tiles.goodW=0.15 }
  else { tiles.perfectW=0.05; tiles.goodW=0.12 }
})
menuBtn?.addEventListener('click', ()=>{ showMenu(); playing=false; cancelAnimationFrame(raf) })
backMenu?.addEventListener('click', ()=>{ result.classList.add('hidden'); showMenu() })

window.addEventListener('keydown', e=>{
  if(playing){
    const map:Record<string,number>={ KeyD:0, KeyF:1, KeyJ:2, KeyK:3 }
    if(map[e.code]!==undefined){
      const lane=map[e.code]
      const r=tiles.tap(lane, audio.time)
      if(r.res){ score.hit(r.res); feedback.textContent=r.res; feedback.style.color=r.res==='Perfect'?'#facc15': r.res==='Good'?'#22c55e':'#ef4444'; feedback.style.opacity='1'; setTimeout(()=>feedback.style.opacity='0',280) }
      else { feedback.textContent='Miss'; feedback.style.color='#ef4444'; feedback.style.opacity='1'; setTimeout(()=>feedback.style.opacity='0',200) }
      e.preventDefault(); return
    }
  }
  if(e.code==='Space'){ e.preventDefault(); if(!playing && calib.classList.contains('hidden')) start(); else if(playing){ const lane=Math.floor(handR.x*4); const r=tiles.tap(lane, audio.time); if(r.res) score.hit(r.res) } }
  if(e.code==='KeyA') { targetPan=Math.max(-1,targetPan-0.22); parallax(targetPan) }
  if(e.code==='KeyD') { targetPan=Math.min(1,targetPan+0.22); parallax(targetPan) }
})
let dragging=false, sx=0, sp=0
canvas.addEventListener('mousedown', e=>{ dragging=true; sx=e.clientX; sp=targetPan })
window.addEventListener('mousemove', e=>{ if(!dragging) return; const dx=(e.clientX-sx)/innerWidth; targetPan=Math.max(-1,Math.min(1,sp+dx*2)); parallax(targetPan) })
window.addEventListener('mouseup', ()=>dragging=false)
canvas.addEventListener('click', ()=>{ if(!playing) return; const lane=Math.floor(handR.x*4); const r=tiles.tap(lane,audio.time); if(r.res) score.hit(r.res) })

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

async function loadBeats(){
  try{
    const res=await fetch('/beatmaps/okestra_beatmap.json')
    const data=await res.json()
    tiles.load(data)
  }catch{
    const data=Array.from({length:32},(_,i)=>({ time:2+i*0.55, dir:i%4 }))
    tiles.load(data)
  }
}
setTimeout(()=>{ document.getElementById('curtainL')?.classList.add('open'); document.getElementById('curtainR')?.classList.add('open') }, 600)
loadBeats().then(()=>loop())
