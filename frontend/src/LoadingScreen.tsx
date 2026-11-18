import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'

const GOLD = '#D4Af37'
const MIDNIGHT = '#05070b'
const PARTICLE_COUNT = 6200
const FORMATION_DURATION = 2.4
const SCATTER_START = 5.2
const SCATTER_DURATION = 1.05

type Point = { x: number; y: number }

function sampleText(text: string, fontSize: number, y: number, maxWidth: number) {
  const canvas = document.createElement('canvas')
  canvas.width = 1600
  canvas.height = 440

  const context = canvas.getContext('2d')
  if (!context) return [] as Point[]

  context.fillStyle = '#fff'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = `700 ${fontSize}px Georgia, "Times New Roman", serif`

  const measuredWidth = context.measureText(text).width
  if (measuredWidth > maxWidth) {
    context.font = `700 ${fontSize * (maxWidth / measuredWidth)}px Georgia, "Times New Roman", serif`
  }
  context.fillText(text, canvas.width / 2, y, maxWidth)

  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
  const alphaAt = (px: number, py: number) =>
    px < 0 || py < 0 || px >= canvas.width || py >= canvas.height
      ? 0
      : pixels[(py * canvas.width + px) * 4 + 3]
  const points: Point[] = []
  for (let py = 0; py < canvas.height; py += 2) {
    for (let px = 0; px < canvas.width; px += 2) {
      const inside = alphaAt(px, py) > 100
      const boundary =
        alphaAt(px - 2, py) <= 100 ||
        alphaAt(px + 2, py) <= 100 ||
        alphaAt(px, py - 2) <= 100 ||
        alphaAt(px, py + 2) <= 100

      if (inside && boundary) {
        points.push({
          x: ((px / canvas.width) - 0.5) * 6.8,
          y: (0.5 - py / canvas.height) * 2.3,
        })
      }
    }
  }
  return points
}

function buildWordTargets() {
  const headline = sampleText('SANDIEGO', 178, 173, 1430)
  const caption = sampleText('COLLECTIONS', 66, 315, 900)
  return { headline, caption }
}

function seededRandom(seed: number) {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return value - Math.floor(value)
}

const INTRO_STARS = Array.from({ length: 28 }, (_, index) => {
  const seed = seededRandom(index + 401)
  return {
    x: 90 + seed * 820,
    y: 145 + seededRandom(index + 701) * 295,
    size: 1.4 + seededRandom(index + 1001) * 2.2,
    delay: seededRandom(index + 1301) * 900,
  }
})

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3)
}

function ParticleField() {
  const pointsRef = useRef<THREE.Points>(null)
  const { targets, origins, scatterTargets, seeds, delays } = useMemo(() => {
    const { headline, caption } = buildWordTargets()
    const targetData = new Float32Array(PARTICLE_COUNT * 3)
    const originData = new Float32Array(PARTICLE_COUNT * 3)
    const scatterData = new Float32Array(PARTICLE_COUNT * 3)
    const seedData = new Float32Array(PARTICLE_COUNT)
    const delayData = new Float32Array(PARTICLE_COUNT)
    const headlineCount = Math.floor(PARTICLE_COUNT * 0.78)

    for (let index = 0; index < PARTICLE_COUNT; index += 1) {
      const seed = seededRandom(index + 1)
      const targetPool = index < headlineCount ? headline : caption
      const targetIndex = Math.floor(seededRandom(index * 3 + 7) * targetPool.length)
      const target = targetPool[targetIndex] ?? { x: 0, y: 0 }
      const side = Math.floor(seededRandom(index * 5 + 19) * 4)
      const edge = 4.8 + seededRandom(index * 7 + 31) * 2.4
      const alongEdge = (seededRandom(index * 11 + 43) - 0.5) * 8
      const origin = [
        side === 0 ? -edge : side === 1 ? edge : alongEdge,
        side === 2 ? -edge * 0.6 : side === 3 ? edge * 0.6 : alongEdge * 0.55,
        (seededRandom(index * 13 + 59) - 0.5) * 5,
      ]
      const scatterAngle = seededRandom(index * 29 + 101) * Math.PI * 2
      const scatterRadius = 2.2 + seededRandom(index * 31 + 113) * 2.1
      const offset = index * 3

      targetData[offset] = target.x + (seed - 0.5) * 0.018
      targetData[offset + 1] = target.y + (seededRandom(index * 17 + 71) - 0.5) * 0.018
      targetData[offset + 2] = (seededRandom(index * 19 + 83) - 0.5) * 0.9
      originData[offset] = origin[0]
      originData[offset + 1] = origin[1]
      originData[offset + 2] = origin[2]
      scatterData[offset] = Math.cos(scatterAngle) * scatterRadius * 1.15
      scatterData[offset + 1] = Math.sin(scatterAngle) * scatterRadius * 0.52
      scatterData[offset + 2] = (seededRandom(index * 37 + 127) - 0.5) * 1.2
      seedData[index] = seed
      delayData[index] = seededRandom(index * 23 + 97) * 1.1
    }

    return { targets: targetData, origins: originData, scatterTargets: scatterData, seeds: seedData, delays: delayData }
  }, [])

  const positions = useMemo(() => new Float32Array(origins), [origins])

  useFrame(({ camera, clock, size }) => {
    const elapsed = clock.elapsedTime
    const scatter = easeOutCubic(THREE.MathUtils.clamp((elapsed - SCATTER_START) / SCATTER_DURATION, 0, 1))
    const array = pointsRef.current?.geometry.attributes.position.array as Float32Array | undefined
    if (!array) return

    for (let index = 0; index < PARTICLE_COUNT; index += 1) {
      const offset = index * 3
      const seed = seeds[index]
      const progress = THREE.MathUtils.clamp((elapsed - delays[index]) / FORMATION_DURATION, 0, 1)
      const eased = easeOutCubic(progress)
      const swirl = (1 - eased) * (0.28 + seed * 0.48)
      const angle = elapsed * 1.2 + seed * Math.PI * 2
      const driftX = Math.sin(elapsed * 0.9 + seed * 18) * 0.018
      const driftY = Math.cos(elapsed * 1.1 + seed * 21) * 0.018
      const driftZ = Math.sin(elapsed * 0.8 + seed * 27) * 0.035
      const twinkle = Math.sin(elapsed * 4.5 + seed * Math.PI * 2) * 0.035

      const formedX = THREE.MathUtils.lerp(origins[offset], targets[offset], eased) + Math.cos(angle) * swirl + driftX
      const formedY = THREE.MathUtils.lerp(origins[offset + 1], targets[offset + 1], eased) + Math.sin(angle) * swirl + driftY
      const formedZ = THREE.MathUtils.lerp(origins[offset + 2], targets[offset + 2], eased) + driftZ
      array[offset] = THREE.MathUtils.lerp(formedX, scatterTargets[offset], scatter) + Math.cos(angle) * twinkle
      array[offset + 1] = THREE.MathUtils.lerp(formedY, scatterTargets[offset + 1], scatter) + Math.sin(angle) * twinkle
      array[offset + 2] = THREE.MathUtils.lerp(formedZ, scatterTargets[offset + 2], scatter)
    }

    if (pointsRef.current) {
      pointsRef.current.geometry.attributes.position.needsUpdate = true
      const settle = THREE.MathUtils.smoothstep(elapsed, 3.8, 5.2)
      pointsRef.current.rotation.x = THREE.MathUtils.lerp(0.12, 0.06, settle)
      pointsRef.current.rotation.y = THREE.MathUtils.lerp(elapsed * 0.35 + 0.8, 0.16, settle)
      pointsRef.current.rotation.z = 0
      const material = pointsRef.current.material as THREE.PointsMaterial
      material.size = THREE.MathUtils.lerp(0.022, 0.029, scatter)
      material.opacity = THREE.MathUtils.lerp(0.92, 0.78, scatter)
    }

    const settle = THREE.MathUtils.smoothstep(elapsed, 3.8, 5.2)
    camera.position.x = THREE.MathUtils.lerp(Math.sin(elapsed * 0.18) * 2.7, 0.45, settle)
    camera.position.y = THREE.MathUtils.lerp(Math.cos(elapsed * 0.2) * 1.2, 0.35, settle)
    camera.position.z = THREE.MathUtils.lerp(8.2 + Math.sin(elapsed * 0.14) * 0.55, 8.2, settle)
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.aspect = size.width / Math.max(size.height, 1)
      camera.updateProjectionMatrix()
      const visibleHeight = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
      const visibleWidth = visibleHeight * camera.aspect
      const fitScale = Math.min(1, visibleWidth / 7.25, visibleHeight / 2.9)
      pointsRef.current?.scale.setScalar(fitScale)
    }
    camera.lookAt(0, 0, 0)
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={GOLD}
        size={0.022}
        sizeAttenuation
        transparent
        opacity={0.92}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  )
}

type LoadingScreenProps = {
  onComplete?: () => void
}

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const onCompleteRef = useRef(onComplete)
  const [outlineVisible, setOutlineVisible] = useState(false)
  const [starFieldVisible, setStarFieldVisible] = useState(false)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    const starTimer = window.setTimeout(() => setStarFieldVisible(true), SCATTER_START * 1000)
    const outlineTimer = window.setTimeout(() => setOutlineVisible(true), 6300)
    const finishTimer = window.setTimeout(() => onCompleteRef.current?.(), 8800)
    return () => {
      window.clearTimeout(starTimer)
      window.clearTimeout(outlineTimer)
      window.clearTimeout(finishTimer)
    }
  }, [])

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        minHeight: '100dvh',
        overflow: 'hidden',
        background: `radial-gradient(circle at 50% 40%, rgba(212, 175, 55, 0.1), transparent 25%), ${MIDNIGHT}`,
      }}
    >
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
        style={{ position: 'absolute', inset: 0, width: '100vw', height: '100vh', minHeight: '100dvh', background: MIDNIGHT }}
      >
        <color attach="background" args={[MIDNIGHT]} />
        <fog attach="fog" args={[MIDNIGHT, 5.5, 11]} />
        <PerspectiveCamera makeDefault position={[0, 0, 8.2]} fov={31} />
        <ambientLight intensity={0.14} color={GOLD} />
        <directionalLight position={[2.8, 2.5, 4]} intensity={0.48} color={GOLD} />
        <pointLight position={[0, 1.4, 3.8]} intensity={0.65} color={GOLD} distance={6} />
        <ParticleField />
      </Canvas>
      <svg
        viewBox="0 0 1000 600"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-1000 ${starFieldVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        <defs>
          <filter id="intro-star-glow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {INTRO_STARS.map(({ x, y, size, delay }, index) => (
          <g key={index} className="intro-star" style={{ animationDelay: `${delay}ms` }}>
            <path
              d={`M ${x} ${y - size * 2.2} Q ${x + size * 0.3} ${y - size * 0.3} ${x + size * 2.2} ${y} Q ${x + size * 0.3} ${y + size * 0.3} ${x} ${y + size * 2.2} Q ${x - size * 0.3} ${y + size * 0.3} ${x - size * 2.2} ${y} Q ${x - size * 0.3} ${y - size * 0.3} ${x} ${y - size * 2.2} Z`}
              fill="#E5C75E"
              filter="url(#intro-star-glow)"
              opacity={0.45 + seededRandom(index + 1701) * 0.5}
            />
          </g>
        ))}
      </svg>
      <svg
        viewBox="0 0 1000 600"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-700 ${outlineVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        <text x="500" y="284" textAnchor="middle" className={`loading-word-outline ${outlineVisible ? 'loading-outline-active loading-word-outline-main' : ''}`} pathLength="1000">SANDIEGO</text>
        <text x="500" y="365" textAnchor="middle" className={`loading-word-outline ${outlineVisible ? 'loading-outline-active loading-word-outline-caption' : ''}`} pathLength="1000">COLLECTIONS</text>
      </svg>
    </div>
  )
}

export default LoadingScreen
