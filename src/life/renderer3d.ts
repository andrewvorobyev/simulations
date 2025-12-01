import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { Grid } from './gameOfLife'

export class Renderer3D {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private cubes: THREE.InstancedMesh | null = null
  private gridHelper: THREE.GridHelper | null = null
  private boundingBox: THREE.LineSegments | null = null
  private showBounds = true

  private K: number // Grid cell size
  private M: number // Cube size as fraction of cell (0-1)

  private width: number = 0
  private height: number = 0
  private depth: number = 0

  constructor(container: HTMLElement, K = 1, M = 0.3) {
    this.K = K
    this.M = M

    // Scene setup
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0f0f1a)

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      2000
    )
    this.camera.position.set(50, 50, 50)

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setPixelRatio(window.devicePixelRatio)
    container.appendChild(this.renderer.domElement)

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    this.scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(50, 100, 50)
    this.scene.add(directionalLight)

    const directionalLight2 = new THREE.DirectionalLight(0x4488ff, 0.3)
    directionalLight2.position.set(-50, -50, -50)
    this.scene.add(directionalLight2)

    // Handle resize
    window.addEventListener('resize', () => this.onResize(container))

    // Start render loop
    this.animate()
  }

  private onResize(container: HTMLElement): void {
    this.camera.aspect = container.clientWidth / container.clientHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(container.clientWidth, container.clientHeight)
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate)
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  setParameters(K: number, M: number): void {
    this.K = K
    this.M = M
  }

  setShowBounds(show: boolean): void {
    this.showBounds = show
    if (this.boundingBox) {
      this.boundingBox.visible = show
    }
  }

  getShowBounds(): boolean {
    return this.showBounds
  }

  setupVolume(width: number, height: number, depth: number): void {
    this.width = width
    this.height = height
    this.depth = depth

    // Remove old objects
    if (this.gridHelper) {
      this.scene.remove(this.gridHelper)
      this.gridHelper.dispose()
    }
    if (this.boundingBox) {
      this.scene.remove(this.boundingBox)
    }

    // Calculate volume dimensions
    const volWidth = width * this.K
    const volHeight = height * this.K
    const volDepth = depth * this.K

    // Add bounding box
    const boxGeometry = new THREE.BoxGeometry(volWidth, volDepth, volHeight)
    const edges = new THREE.EdgesGeometry(boxGeometry)
    this.boundingBox = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x444466 })
    )
    this.boundingBox.position.set(volWidth / 2, volDepth / 2, volHeight / 2)
    this.boundingBox.visible = this.showBounds
    this.scene.add(this.boundingBox)

    // Position camera to see the volume
    const maxDim = Math.max(volWidth, volHeight, volDepth)
    this.camera.position.set(maxDim * 1.2, maxDim * 0.8, maxDim * 1.2)
    this.controls.target.set(volWidth / 2, volDepth / 2, volHeight / 2)
    this.controls.update()
  }

  updateVolume(volume: Grid[]): void {
    // Remove old cubes
    if (this.cubes) {
      this.scene.remove(this.cubes)
      this.cubes.geometry.dispose()
      if (Array.isArray(this.cubes.material)) {
        this.cubes.material.forEach(m => m.dispose())
      } else {
        this.cubes.material.dispose()
      }
    }

    // Count alive cells
    let aliveCount = 0
    for (let z = 0; z < volume.length; z++) {
      const grid = volume[z]!
      for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y]!.length; x++) {
          if (grid[y]![x]) aliveCount++
        }
      }
    }

    if (aliveCount === 0) return

    // Create instanced mesh for performance
    const cubeSize = this.K * this.M
    const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize)
    const material = new THREE.MeshPhongMaterial({
      color: 0xe94560,
      transparent: true,
      opacity: 0.8,
    })

    this.cubes = new THREE.InstancedMesh(geometry, material, aliveCount)

    const matrix = new THREE.Matrix4()
    const color = new THREE.Color()
    let instanceIndex = 0

    for (let z = 0; z < volume.length; z++) {
      const grid = volume[z]!
      // z=0 is current (newest), higher z is older
      // ageFactor: 1.0 for z=0, decreases toward 0 for older layers
      const ageFactor = 1 - z / volume.length

      for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y]!.length; x++) {
          if (grid[y]![x]) {
            // Position: x -> X, y -> Z (depth), z (time) -> Y
            const posX = x * this.K + this.K / 2
            const posY = z * this.K + this.K / 2
            const posZ = y * this.K + this.K / 2

            matrix.setPosition(posX, posY, posZ)
            this.cubes.setMatrixAt(instanceIndex, matrix)

            // Color based on age - newer is brighter
            color.setHSL(0.95, 0.8, 0.3 + ageFactor * 0.4)
            this.cubes.setColorAt(instanceIndex, color)

            instanceIndex++
          }
        }
      }
    }

    this.cubes.instanceMatrix.needsUpdate = true
    if (this.cubes.instanceColor) {
      this.cubes.instanceColor.needsUpdate = true
    }

    this.scene.add(this.cubes)
  }

  dispose(): void {
    this.renderer.dispose()
    this.controls.dispose()
    if (this.cubes) {
      this.cubes.geometry.dispose()
      if (Array.isArray(this.cubes.material)) {
        this.cubes.material.forEach(m => m.dispose())
      } else {
        this.cubes.material.dispose()
      }
    }
  }
}
