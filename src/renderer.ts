import type { ViewState } from './types'

const VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`

const FRAGMENT_SHADER = `
  precision mediump float;

  uniform sampler2D u_texture;
  uniform vec2 u_resolution;
  uniform vec2 u_gridSize;
  uniform vec2 u_offset;
  uniform float u_scale;
  uniform vec3 u_cellColor;
  uniform vec3 u_bgColor;

  varying vec2 v_texCoord;

  void main() {
    // Convert screen position to grid position
    vec2 screenPos = v_texCoord * u_resolution;
    vec2 gridPos = (screenPos - u_offset) / u_scale;

    // Check if within grid bounds
    if (gridPos.x < 0.0 || gridPos.x >= u_gridSize.x ||
        gridPos.y < 0.0 || gridPos.y >= u_gridSize.y) {
      gl_FragColor = vec4(u_bgColor * 0.8, 1.0);
      return;
    }

    // Sample the texture
    vec2 texCoord = gridPos / u_gridSize;
    float cell = texture2D(u_texture, texCoord).r;

    // Color based on cell state
    vec3 color = cell > 0.5 ? u_cellColor : u_bgColor;
    gl_FragColor = vec4(color, 1.0);
  }
`

export class Renderer {
  private canvas: HTMLCanvasElement
  private gl: WebGLRenderingContext
  private program: WebGLProgram
  private texture: WebGLTexture | null = null
  private gridWidth = 0
  private gridHeight = 0
  private view: ViewState = { offsetX: 0, offsetY: 0, scale: 4 }
  private isDragging = false
  private lastMouseX = 0
  private lastMouseY = 0
  private onViewChange?: () => void

  // Uniform locations
  private uniforms: Record<string, WebGLUniformLocation | null> = {}

  constructor(canvas: HTMLCanvasElement, onViewChange?: () => void) {
    this.canvas = canvas
    this.onViewChange = onViewChange

    const gl = canvas.getContext('webgl', { antialias: false, preserveDrawingBuffer: true })
    if (!gl) throw new Error('WebGL not supported')
    this.gl = gl

    this.program = this.createProgram()
    this.setupBuffers()
    this.cacheUniforms()
    this.setupEventListeners()
    this.resize()

    window.addEventListener('resize', () => this.resize())
  }

  private createShader(type: number, source: string): WebGLShader {
    const gl = this.gl
    const shader = gl.createShader(type)!
    gl.shaderSource(shader, source)
    gl.compileShader(shader)

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader)
      gl.deleteShader(shader)
      throw new Error('Shader compile error: ' + info)
    }

    return shader
  }

  private createProgram(): WebGLProgram {
    const gl = this.gl
    const vertexShader = this.createShader(gl.VERTEX_SHADER, VERTEX_SHADER)
    const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER)

    const program = gl.createProgram()!
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program)
      throw new Error('Program link error: ' + info)
    }

    gl.useProgram(program)
    return program
  }

  private setupBuffers(): void {
    const gl = this.gl

    // Full screen quad
    const positions = new Float32Array([
      -1, -1, -1, 1, 1, -1,
      1, -1, -1, 1, 1, 1,
    ])

    const texCoords = new Float32Array([
      0, 1, 0, 0, 1, 1,
      1, 1, 0, 0, 1, 0,
    ])

    const posBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)

    const posLoc = gl.getAttribLocation(this.program, 'a_position')
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

    const texBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW)

    const texLoc = gl.getAttribLocation(this.program, 'a_texCoord')
    gl.enableVertexAttribArray(texLoc)
    gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0)
  }

  private cacheUniforms(): void {
    const gl = this.gl
    const names = ['u_texture', 'u_resolution', 'u_gridSize', 'u_offset', 'u_scale', 'u_cellColor', 'u_bgColor']
    for (const name of names) {
      this.uniforms[name] = gl.getUniformLocation(this.program, name)
    }
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown)
    this.canvas.addEventListener('mousemove', this.handleMouseMove)
    this.canvas.addEventListener('mouseup', this.handleMouseUp)
    this.canvas.addEventListener('mouseleave', this.handleMouseUp)
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false })

    this.canvas.addEventListener('touchstart', this.handleTouchStart)
    this.canvas.addEventListener('touchmove', this.handleTouchMove)
    this.canvas.addEventListener('touchend', this.handleTouchEnd)
  }

  private handleMouseDown = (e: MouseEvent): void => {
    this.isDragging = true
    this.lastMouseX = e.clientX
    this.lastMouseY = e.clientY
    this.canvas.style.cursor = 'grabbing'
  }

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.isDragging) return

    const dx = e.clientX - this.lastMouseX
    const dy = e.clientY - this.lastMouseY

    this.view.offsetX += dx
    this.view.offsetY += dy

    this.lastMouseX = e.clientX
    this.lastMouseY = e.clientY

    this.render()
    this.onViewChange?.()
  }

  private handleMouseUp = (): void => {
    this.isDragging = false
    this.canvas.style.cursor = 'grab'
  }

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault()

    const rect = this.canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const worldX = (mouseX - this.view.offsetX) / this.view.scale
    const worldY = (mouseY - this.view.offsetY) / this.view.scale

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.max(0.1, Math.min(100, this.view.scale * zoomFactor))

    this.view.offsetX = mouseX - worldX * newScale
    this.view.offsetY = mouseY - worldY * newScale
    this.view.scale = newScale

    this.render()
    this.onViewChange?.()
  }

  private handleTouchStart = (e: TouchEvent): void => {
    if (e.touches.length === 1) {
      this.isDragging = true
      this.lastMouseX = e.touches[0]!.clientX
      this.lastMouseY = e.touches[0]!.clientY
    }
  }

  private handleTouchMove = (e: TouchEvent): void => {
    if (!this.isDragging || e.touches.length !== 1) return
    e.preventDefault()

    const touch = e.touches[0]!
    const dx = touch.clientX - this.lastMouseX
    const dy = touch.clientY - this.lastMouseY

    this.view.offsetX += dx
    this.view.offsetY += dy

    this.lastMouseX = touch.clientX
    this.lastMouseY = touch.clientY

    this.render()
    this.onViewChange?.()
  }

  private handleTouchEnd = (): void => {
    this.isDragging = false
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1
    const rect = this.canvas.getBoundingClientRect()
    this.canvas.width = rect.width * dpr
    this.canvas.height = rect.height * dpr
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    this.render()
  }

  setGrid(grid: boolean[][]): void {
    const gl = this.gl

    if (grid.length === 0) {
      this.gridWidth = 0
      this.gridHeight = 0
      return
    }

    this.gridHeight = grid.length
    this.gridWidth = grid[0]?.length ?? 0

    // Create texture data (single channel)
    const data = new Uint8Array(this.gridWidth * this.gridHeight)
    for (let y = 0; y < this.gridHeight; y++) {
      const row = grid[y]!
      for (let x = 0; x < this.gridWidth; x++) {
        data[y * this.gridWidth + x] = row[x] ? 255 : 0
      }
    }

    // Create or update texture
    if (!this.texture) {
      this.texture = gl.createTexture()
    }

    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    // Disable 4-byte row alignment (our data is tightly packed)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.LUMINANCE,
      this.gridWidth,
      this.gridHeight,
      0,
      gl.LUMINANCE,
      gl.UNSIGNED_BYTE,
      data
    )

    // Use NEAREST for crisp pixels
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    this.render()
  }

  centerView(): void {
    if (this.gridWidth === 0 || this.gridHeight === 0) return

    const rect = this.canvas.getBoundingClientRect()
    const canvasWidth = rect.width
    const canvasHeight = rect.height

    const scaleX = (canvasWidth * 0.9) / this.gridWidth
    const scaleY = (canvasHeight * 0.9) / this.gridHeight
    this.view.scale = Math.min(scaleX, scaleY, 10)

    const scaledWidth = this.gridWidth * this.view.scale
    const scaledHeight = this.gridHeight * this.view.scale

    this.view.offsetX = (canvasWidth - scaledWidth) / 2
    this.view.offsetY = (canvasHeight - scaledHeight) / 2

    this.render()
    this.onViewChange?.()
  }

  getView(): ViewState {
    return { ...this.view }
  }

  setScale(scale: number): void {
    const rect = this.canvas.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const worldX = (centerX - this.view.offsetX) / this.view.scale
    const worldY = (centerY - this.view.offsetY) / this.view.scale

    this.view.scale = Math.max(0.1, Math.min(100, scale))

    this.view.offsetX = centerX - worldX * this.view.scale
    this.view.offsetY = centerY - worldY * this.view.scale

    this.render()
    this.onViewChange?.()
  }

  render(): void {
    const gl = this.gl
    const rect = this.canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1

    // Clear with background color
    gl.clearColor(0.1, 0.1, 0.18, 1.0)
    gl.clear(gl.COLOR_BUFFER_BIT)

    if (this.gridWidth === 0 || this.gridHeight === 0 || !this.texture) return

    gl.useProgram(this.program)

    // Set uniforms
    gl.uniform1i(this.uniforms['u_texture']!, 0)
    gl.uniform2f(this.uniforms['u_resolution']!, rect.width, rect.height)
    gl.uniform2f(this.uniforms['u_gridSize']!, this.gridWidth, this.gridHeight)
    gl.uniform2f(this.uniforms['u_offset']!, this.view.offsetX, this.view.offsetY)
    gl.uniform1f(this.uniforms['u_scale']!, this.view.scale)
    gl.uniform3f(this.uniforms['u_cellColor']!, 0.914, 0.271, 0.376) // #e94560
    gl.uniform3f(this.uniforms['u_bgColor']!, 0.102, 0.102, 0.18) // #1a1a2e

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.texture)

    gl.drawArrays(gl.TRIANGLES, 0, 6)

    // Draw info using 2D overlay
    this.drawInfo()
  }

  private drawInfo(): void {
    // We'll handle this in the UI layer instead
  }

  getGridSize(): { width: number; height: number } {
    return { width: this.gridWidth, height: this.gridHeight }
  }

  destroy(): void {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown)
    this.canvas.removeEventListener('mousemove', this.handleMouseMove)
    this.canvas.removeEventListener('mouseup', this.handleMouseUp)
    this.canvas.removeEventListener('mouseleave', this.handleMouseUp)
    this.canvas.removeEventListener('wheel', this.handleWheel)
    this.canvas.removeEventListener('touchstart', this.handleTouchStart)
    this.canvas.removeEventListener('touchmove', this.handleTouchMove)
    this.canvas.removeEventListener('touchend', this.handleTouchEnd)

    if (this.texture) {
      this.gl.deleteTexture(this.texture)
    }
    this.gl.deleteProgram(this.program)
  }
}
