// Halls — 5 nhà hát chi tiết từng người (không placeholder)
// Mỗi hall có palette riêng, audience và orchestra vẽ chi tiết bằng DOM+Canvas

export type HallId = 'vienna' | 'paris' | 'modern' | 'baroque' | 'cathedral'

export interface Hall {
  id: HallId
  name: string
  subtitle: string
  colors: { farTop:string, farMid:string, mid:string, near:string, accent:string, light:string }
  audienceRows: number
  musicianGroups: { name:string, icon:string, count:number }[]
}

export const HALLS: Record<HallId, Hall> = {
  vienna: {
    id:'vienna', name:'Vienna Gold Hall', subtitle:'Goldener Saal • Cổ điển • 1840',
    colors:{ farTop:'#0a0e24', farMid:'#1a2340', mid:'#0f1a33', near:'#050816', accent:'#d4b36a', light:'rgba(255,245,160,0.18)' },
    audienceRows: 3,
    musicianGroups: [
      { name:'Violin I', icon:'🎻', count:6 },
      { name:'Violin II', icon:'🎻', count:5 },
      { name:'Viola', icon:'🎻', count:4 },
      { name:'Cello', icon:'🎻', count:4 },
      { name:'Brass', icon:'🎺', count:3 },
      { name:'Perc', icon:'🥁', count:2 },
    ]
  },
  paris: {
    id:'paris', name:'Palais Garnier', subtitle:'Paris • Baroque • 1875',
    colors:{ farTop:'#0a1428', farMid:'#1a2a4a', mid:'#102040', near:'#060a18', accent:'#a8c4e8', light:'rgba(180,210,255,0.14)' },
    audienceRows: 3,
    musicianGroups: [
      { name:'Strings', icon:'🎻', count:8 },
      { name:'Winds', icon:'🎷', count:4 },
      { name:'Brass', icon:'🎺', count:4 },
      { name:'Harp', icon:'🪉', count:1 },
      { name:'Choir', icon:'🎤', count:6 },
    ]
  },
  modern: {
    id:'modern', name:'Modern Glass Hall', subtitle:'Berlin • Hiện đại • 2024',
    colors:{ farTop:'#050a1a', farMid:'#0a1430', mid:'#0a1a2a', near:'#030515', accent:'#00e6cc', light:'rgba(0,230,204,0.12)' },
    audienceRows: 2,
    musicianGroups: [
      { name:'Synth', icon:'🎹', count:3 },
      { name:'Strings', icon:'🎻', count:6 },
      { name:'Brass', icon:'🎺', count:3 },
      { name:'Drums', icon:'🥁', count:3 },
    ]
  },
  baroque: {
    id:'baroque', name:'Baroque Chamber', subtitle:'Vienna • Thính phòng • 1720',
    colors:{ farTop:'#1a0f08', farMid:'#2a1a0f', mid:'#1f150a', near:'#0a0602', accent:'#c9a86a', light:'rgba(255,220,160,0.14)' },
    audienceRows: 2,
    musicianGroups: [
      { name:'Violin', icon:'🎻', count:4 },
      { name:'Cello', icon:'🎻', count:2 },
      { name:'Harpsichord', icon:'🎹', count:1 },
      { name:'Flute', icon:'🪈', count:2 },
    ]
  },
  cathedral: {
    id:'cathedral', name:'Grand Cathedral', subtitle:'Cathedral • Hợp xướng • Gothic',
    colors:{ farTop:'#0a0a14', farMid:'#151528', mid:'#10102a', near:'#050510', accent:'#8a6fdb', light:'rgba(180,160,255,0.12)' },
    audienceRows: 4,
    musicianGroups: [
      { name:'Choir', icon:'🎤', count:10 },
      { name:'Organ', icon:'🎹', count:1 },
      { name:'Strings', icon:'🎻', count:6 },
      { name:'Brass', icon:'🎺', count:4 },
    ]
  }
}

// Palette cho từng người — đổi màu ngẫu nhiên trang phục
const CLOTH_PALETTE: Record<HallId, string[]> = {
  vienna: ['#7a1a1a','#1a3a5a','#2a4a2a','#3a2a1a','#4a1a3a','#1a4a4a'],
  paris: ['#1a2a4a','#2a3a6a','#4a1a2a','#1a4a3a','#3a1a4a','#2a4a2a'],
  modern: ['#0a1a2a','#1a3a4a','#2a5a6a','#0a2a3a','#1a4a5a','#003a4a'],
  baroque: ['#5a1a0a','#3a1a0a','#2a1a0a','#4a2a0a','#6a2a0a','#1a0a00'],
  cathedral: ['#1a0a2a','#2a0a3a','#0a1a2a','#1a0a3a','#2a0a4a','#0a2a4a'],
}

// Vẽ từng khán giả chi tiết — Conductor POV: ban công tầng, to, chân thật
export function renderAudience(container: HTMLElement, hallId: HallId){
  container.innerHTML = ''
  const hall = HALLS[hallId]
  const palette = CLOTH_PALETTE[hallId]
  const rows = hall.audienceRows
  // Conductor POV: khán giả ở xa, trên cao, ban công
  for(let r=0;r<rows;r++){
    const row = document.createElement('div')
    row.className='audRow'
    // POV: hàng xa cao hơn, hàng gần thấp hơn, tạo perspective
    row.style.top = `${4 + r*9}%`
    row.style.opacity = `${0.92 - r*0.12}`
    row.style.transform = `translateX(-50%) scale(${1 - r*0.08}) perspective(600px) rotateX(8deg)`
    row.style.filter = `brightness(${1 - r*0.08})`
    // balcony railing
    row.style.borderBottom = r===rows-1 ? '3px solid rgba(212,179,106,0.35)' : 'none'
    row.style.paddingBottom = '8px'
    row.style.background = r===rows-1 ? 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.25))' : 'transparent'
    const count = 10 - r // to hơn nên ít người hơn, đỡ rối
    row.style.gap = '18px'
    for(let i=0;i<count;i++){
      const person = document.createElement('div')
      person.className='person'
      const col = palette[Math.floor(Math.random()*palette.length)]
      const pose = Math.random()
      const poseClass = pose<0.33?'pose-clap': pose<0.66?'pose-lean':'pose-sit'
      person.classList.add(poseClass)
      // chi tiết hơn: thêm tóc, cổ áo
      person.innerHTML = `<div class="pHead"></div><div class="pBody" style="background:${col}"><div class="pCollar"></div></div>`
      const skin = ['#f5d0a8','#e8b98a','#d9a679','#c68660', '#8d5524'][Math.floor(Math.random()*5)]
      const head = person.querySelector('.pHead') as HTMLElement
      head.style.background = skin
      // tóc ngẫu nhiên
      const hair = ['#1a0f08','#2a1a0a','#3a2a1a','#5a3a18','#0a0a0a','#4a2a0a'][Math.floor(Math.random()*6)]
      head.style.boxShadow = `inset 0 4px 0 ${hair}`
      // animation delay riêng
      person.style.animationDelay = `${(r*0.2 + i*0.08)%2}s`
      row.appendChild(person)
    }
    container.appendChild(row)
  }
  // Chandelier cho hall sang
  if(hallId==='vienna' || hallId==='paris'){
    const chand = document.createElement('div')
    chand.className='chandelier'
    chand.textContent='✦'
    container.appendChild(chand)
  }
  const label = document.createElement('div')
  label.className='hallLabel'
  label.textContent = hall.subtitle
  container.appendChild(label)
}

// Vẽ từng nhạc công — Conductor POV: fan hình quạt trước mặt, to, chân thật, từng người có giá nhạc
export function renderOrchestra(container: HTMLElement, hallId: HallId){
  container.innerHTML = ''
  const hall = HALLS[hallId]
  const groups = hall.musicianGroups
  // POV: dàn nhạc hình quạt, gần to, xa nhỏ, cong
  const total = groups.reduce((s,g)=>s+g.count,0)
  let idx=0
  for(const g of groups){
    const section = document.createElement('div')
    section.className='orchSection'
    // fan: mỗi section lệch góc nhẹ
    const angle = (idx / total - 0.5) * 40 // -20deg to 20deg
    section.style.transform = `translateX(-50%) rotate(${angle*0.15}deg)`
    section.style.left = `${50 + (idx/total -0.5)*60}%`
    section.style.bottom = `${14 + Math.abs(idx/total -0.5)*12}%`
    const title = document.createElement('div')
    title.className='secTitle'
    title.textContent = g.name
    section.appendChild(title)
    const row = document.createElement('div')
    row.className='musRow'
    row.style.gap = '14px'
    for(let i=0;i<g.count;i++){
      const m = document.createElement('div')
      m.className='musician'
      // chi tiết: thêm tay, nhạc cụ
      const hasBow = g.icon==='🎻'
      m.innerHTML = `<div class="mIcon">${g.icon}</div><div class="mBody"><div class="mHands"></div></div><div class="mStand"></div><div class="mChair"></div>`
      if(hasBow) m.querySelector('.mHands')!.innerHTML = '<span style="font-size:10px">︻</span>'
      m.style.animationDelay = `${(idx*0.11)%1.2}s`
      // scale theo khoảng cách: gần to hơn
      const dist = Math.abs(idx/total -0.5)
      m.style.transform = `scale(${1 - dist*0.12})`
      m.style.opacity = `${1 - dist*0.08}`
      idx++
      row.appendChild(m)
    }
    section.appendChild(row)
    container.appendChild(section)
  }
}

export function applyHallColors(hallId: HallId){
  const h = HALLS[hallId]
  const far = document.getElementById('far') || document.getElementById('menuFar')
  const mid = document.getElementById('mid') || document.getElementById('menuFar') // fallback
  const light = document.getElementById('light') || document.getElementById('menuSpot')
  if(far) far.style.background = `linear-gradient(to bottom, ${h.colors.farTop}, ${h.colors.farMid})`
  const midEl = document.getElementById('mid')
  if(midEl) midEl.style.background = `linear-gradient(to bottom, transparent 38%, ${h.colors.mid} 58%, #0a1028)`
  if(light) light.style.background = `radial-gradient(ellipse at 50% 0%, ${h.colors.light} 0%, transparent 70%)`
  // accent
  document.documentElement.style.setProperty('--accent', h.colors.accent)
}
