import * as THREE from 'three'

export type HallId3D = 'vienna' | 'paris' | 'modern' | 'baroque' | 'cathedral'

const HALL_COLORS: Record<HallId3D, { wall:string, floor:string, accent:string, light:string }> = {
  vienna: { wall:'#1a2340', floor:'#2a1a0f', accent:'#d4b36a', light:'#fff5a0' },
  paris: { wall:'#1a2a4a', floor:'#0f1a30', accent:'#a8c4e8', light:'#b4d2ff' },
  modern: { wall:'#0a1430', floor:'#0a1a2a', accent:'#00e6cc', light:'#00ffcc' },
  baroque: { wall:'#2a1a0f', floor:'#1f150a', accent:'#c9a86a', light:'#ffdca0' },
  cathedral: { wall:'#151528', floor:'#10102a', accent:'#8a6fdb', light:'#b4a0ff' },
}

export class ThreeHall {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  hallGroup = new THREE.Group()
  audienceGroup = new THREE.Group()
  orchestraGroup = new THREE.Group()
  current: HallId3D = 'vienna'
  private animId = 0
  private targetPan = 0
  private pan = 0
  container: HTMLElement

  constructor(container: HTMLElement){
    this.container = container
    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.Fog(0x050816, 12, 32)
    this.camera = new THREE.PerspectiveCamera(65, container.clientWidth/container.clientHeight, 0.1, 100)
    this.camera.position.set(0, 1.7, 4.5) // conductor POV: 1.7m height, 4.5m back from orchestra
    this.camera.lookAt(0, 0.8, -6)

    this.renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true })
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(this.renderer.domElement)
    this.renderer.domElement.style.position='absolute'
    this.renderer.domElement.style.inset='0'
    this.renderer.domElement.style.zIndex='1'

    this.buildHall()
    this.buildAudience()
    this.buildOrchestra()
    this.buildLights()

    window.addEventListener('resize', ()=>this.resize())
    this.animate()
  }

  private buildHall(){
    const s=this.scene
    s.add(this.hallGroup)
    // floor
    const floorGeo = new THREE.PlaneGeometry(36, 36)
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x0a0e1a, roughness:0.85, metalness:0.1 })
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.rotation.x = -Math.PI/2
    floor.position.y = -0.5
    floor.receiveShadow = true
    this.hallGroup.add(floor)
    // podium
    const podGeo = new THREE.BoxGeometry(1.6, 0.25, 1.1)
    const podMat = new THREE.MeshStandardMaterial({ color: 0x8a6f3a, roughness:0.6, metalness:0.2 })
    const podium = new THREE.Mesh(podGeo, podMat)
    podium.position.set(0, -0.38, 3.2)
    podium.castShadow = true
    podium.receiveShadow = true
    this.hallGroup.add(podium)
    // back wall
    const wallGeo = new THREE.PlaneGeometry(36, 14)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0f1428, roughness:0.9 })
    const wall = new THREE.Mesh(wallGeo, wallMat)
    wall.position.set(0, 4.5, -18)
    this.hallGroup.add(wall)
    // side walls
    const sideGeo = new THREE.PlaneGeometry(36, 14)
    const left = new THREE.Mesh(sideGeo, wallMat)
    left.rotation.y = Math.PI/2
    left.position.set(-18, 4.5, 0)
    this.hallGroup.add(left)
    const right = left.clone()
    right.position.set(18, 4.5, 0)
    right.rotation.y = -Math.PI/2
    this.hallGroup.add(right)
    // ceiling
    const ceilGeo = new THREE.PlaneGeometry(36,36)
    const ceilMat = new THREE.MeshStandardMaterial({ color: 0x080c1e, roughness:0.95 })
    const ceil = new THREE.Mesh(ceilGeo, ceilMat)
    ceil.rotation.x = Math.PI/2
    ceil.position.y = 11
    this.hallGroup.add(ceil)
    // balconies (far audience tiers)
    for(let i=0;i<3;i++){
      const balGeo = new THREE.BoxGeometry(28 - i*2, 0.4, 2.2)
      const balMat = new THREE.MeshStandardMaterial({ color: 0x1a2340, roughness:0.7 })
      const bal = new THREE.Mesh(balGeo, balMat)
      bal.position.set(0, 2.2 + i*1.8, -12 - i*1.2)
      bal.castShadow=true
      this.hallGroup.add(bal)
      // railing
      const railGeo = new THREE.BoxGeometry(28 - i*2, 0.22, 0.12)
      const railMat = new THREE.MeshStandardMaterial({ color: 0xd4b36a, metalness:0.4, roughness:0.5 })
      const rail = new THREE.Mesh(railGeo, railMat)
      rail.position.set(0, 2.6 + i*1.8, -11 + i*0.1)
      this.hallGroup.add(rail)
    }
  }

  private buildAudience(){
    this.scene.add(this.audienceGroup)
    // Dùng InstancedMesh cho performance: mỗi hall ~30-36 người, to, chi tiết
    const headGeo = new THREE.SphereGeometry(0.18, 12, 10)
    const bodyGeo = new THREE.CylinderGeometry(0.22, 0.26, 0.55, 8)
    const palette = ['#7a1a1a','#1a3a5a','#2a4a2a','#3a2a1a','#4a1a3a','#1a4a4a']
    // 3 hàng ban công, mỗi hàng 10, 9, 8 người
    let idx=0
    for(let row=0; row<3; row++){
      const y = 2.9 + row*1.8
      const z = -11.2 - row*1.2
      const count = 10 - row
      const spacing = 2.2
      const startX = -(count-1)*spacing/2
      for(let i=0;i<count;i++){
        const group = new THREE.Group()
        const col = palette[Math.floor(Math.random()*palette.length)]
        const skin = ['#f5d0a8','#e8b98a','#d9a679','#c68660'][Math.floor(Math.random()*4)]
        const headMat = new THREE.MeshStandardMaterial({ color: skin, roughness:0.6 })
        const bodyMat = new THREE.MeshStandardMaterial({ color: col, roughness:0.7 })
        const head = new THREE.Mesh(headGeo, headMat)
        head.position.y = 0.42
        head.castShadow=true
        const body = new THREE.Mesh(bodyGeo, bodyMat)
        body.position.y = 0.05
        body.castShadow=true
        group.add(head); group.add(body)
        group.position.set(startX + i*spacing + (Math.random()-0.5)*0.2, y, z)
        group.rotation.y = (Math.random()-0.5)*0.15
        // breathe
        group.userData = { baseY: y, idx: idx++ }
        this.audienceGroup.add(group)
      }
    }
  }

  private buildOrchestra(){
    this.scene.add(this.orchestraGroup)
    // Fan hình quạt trước mặt nhạc trưởng, to, chi tiết từng nhạc công có giá nhạc
    const sections: { name:string, count:number, z:number, color:string }[] = [
      { name:'Violin I', count:6, z:-3.5, color:'#d4b36a' },
      { name:'Violin II', count:5, z:-4.2, color:'#d4b36a' },
      { name:'Viola', count:4, z:-4.9, color:'#c9a86a' },
      { name:'Cello', count:4, z:-5.6, color:'#8a6f3a' },
      { name:'Brass', count:3, z:-6.3, color:'#e8c4a8' },
      { name:'Perc', count:2, z:-7.0, color:'#a8c4e8' },
    ]
    let idx=0
    for(const sec of sections){
      const fanRadius = 4.5
      const angleStep = 0.38 // rad
      const startAngle = - (sec.count-1)*angleStep/2
      for(let i=0;i<sec.count;i++){
        const angle = startAngle + i*angleStep
        const x = Math.sin(angle) * fanRadius * 0.9
        const z = sec.z + Math.cos(angle)*0.3
        const group = new THREE.Group()
        // body
        const bodyGeo = new THREE.CylinderGeometry(0.18, 0.2, 0.65, 8)
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a2233, roughness:0.8 })
        const body = new THREE.Mesh(bodyGeo, bodyMat)
        body.position.y = 0.35
        body.castShadow=true
        // head
        const headGeo = new THREE.SphereGeometry(0.15, 10, 8)
        const headMat = new THREE.MeshStandardMaterial({ color: 0xf5d0a8 })
        const head = new THREE.Mesh(headGeo, headMat)
        head.position.y = 0.78
        // music stand
        const standGeo = new THREE.BoxGeometry(0.45, 0.32, 0.02)
        const standMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness:0.9 })
        const stand = new THREE.Mesh(standGeo, standMat)
        stand.position.set(0, 0.62, 0.42)
        stand.rotation.x = -0.25
        // instrument hint
        const instGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6)
        const instMat = new THREE.MeshStandardMaterial({ color: sec.color, metalness:0.3, roughness:0.4 })
        const inst = new THREE.Mesh(instGeo, instMat)
        inst.position.set(0.18, 0.55, 0.1)
        inst.rotation.z = 0.6
        group.add(body, head, stand, inst)
        group.position.set(x, -0.12, z)
        group.rotation.y = -angle * 0.5
        group.userData = { baseY: -0.12, idx: idx++ }
        this.orchestraGroup.add(group)
      }
    }
  }

  private buildLights(){
    const ambient = new THREE.AmbientLight(0xffffff, 0.45)
    this.scene.add(ambient)
    const dir = new THREE.DirectionalLight(0xfff5d0, 0.9)
    dir.position.set(4, 10, 6)
    dir.castShadow=true
    dir.shadow.mapSize.set(2048,2048)
    this.scene.add(dir)
    // chandelier point
    const chand = new THREE.PointLight(0xd4b36a, 1.2, 22)
    chand.position.set(0, 9, -4)
    this.scene.add(chand)
    // spotlight podium
    const spot = new THREE.SpotLight(0xfff8d0, 2.2, 14, Math.PI/7, 0.35, 1)
    spot.position.set(0, 8, 5)
    spot.target.position.set(0, -0.4, 3.2)
    this.scene.add(spot)
    this.scene.add(spot.target)
  }

  setHall(id: HallId3D){
    this.current=id
    const c = HALL_COLORS[id]
    ;(this.scene.fog as THREE.Fog).color.set(c.wall)
    this.scene.background = new THREE.Color(c.wall)
    // đổi màu wall/floor
    this.hallGroup.traverse((o:any)=>{
      if(o.isMesh && o.material){
        if(o.geometry?.type==='PlaneGeometry' && o.position.y <0) o.material.color.set(c.floor)
      }
    })
  }

  setPan(v:number){
    this.targetPan = v
  }

  private animate = ()=>{
    this.animId = requestAnimationFrame(this.animate)
    // parallax lerp
    this.pan += (this.targetPan - this.pan) * 0.08
    this.camera.position.x = this.pan * 0.9
    this.camera.lookAt(this.pan*0.5, 0.8, -6)
    // breathe audience/orchestra
    const t = performance.now()*0.001
    this.audienceGroup.children.forEach((g:any)=>{
      const base = g.userData.baseY
      g.position.y = base + Math.sin(t*0.9 + g.userData.idx*0.3)*0.04
    })
    this.orchestraGroup.children.forEach((g:any)=>{
      g.position.y = g.userData.baseY + Math.sin(t*1.1 + g.userData.idx*0.4)*0.03
    })
    this.renderer.render(this.scene, this.camera)
  }

  resize(){
    const w=this.container.clientWidth, h=this.container.clientHeight
    this.camera.aspect=w/h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w,h)
  }

  dispose(){
    cancelAnimationFrame(this.animId)
    this.renderer.dispose()
  }
}
