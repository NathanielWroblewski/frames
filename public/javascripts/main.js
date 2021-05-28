import Vector from './models/vector.js'
import FourByFour from './models/four_by_four.js'
import Camera from './models/orthographic.js'
import angles from './isomorphisms/angles.js'
import renderCircle from './views/circle.js'
import renderCube from './views/cube.js'
import renderLine from './views/line.js'
import renderPolygon from './views/polygon.js'
import { seed, noise } from './utilities/noise.js'
import { range, stableSort, remap, grid, cube } from './utilities/index.js'
import { COLOR } from './constants/colors.js'
import {
  ZOOM, Δt, TICK_ROLLOVER, TENTH_TICK_ROLLOVER, HALF_TICK_ROLLOVER, DELAY, FPS,
  FREQUENCY, AMPLITUDE, SCALE, X_AXIS, Y_AXIS, ORIGIN, QUEUE_SIZE, TIME_ROLLOVER
} from './constants/dimensions.js'

// Copyright (c) 2020 Nathaniel Wroblewski
// I am making my contributions/submissions to this project solely in my personal
// capacity and am not conveying any rights to any intellectual property of any
// third parties.

const canvas = document.querySelector('.canvas')
const context = canvas.getContext('2d')

const perspective = FourByFour
  .identity()
  .rotX(angles.toRadians(60))
  .rotZ(angles.toRadians(40))

const camera = new Camera({
  position: Vector.from(ORIGIN),
  direction: Vector.zeroes(),
  up: Vector.from(Y_AXIS),
  width: canvas.width,
  height: canvas.height,
  zoom: ZOOM
})

context.shadowBlur = 2
context.shadowColor = COLOR

seed(Math.random())

const TILE_VERTICES = [
  Vector.from([ 0.1,  1,  1]),
  Vector.from([-0.1,  1,  1]),
  Vector.from([ 0.1, -1,  1]),
  Vector.from([-0.1, -1,  1]),
  Vector.from([ 0.1,  1, -1]),
  Vector.from([-0.1,  1, -1]),
  Vector.from([ 0.1, -1, -1]),
  Vector.from([-0.1, -1, -1]),
]

let t = 0 // time
let tick = 0
let θ = 0

let tile = TILE_VERTICES.map(vertex => vertex.multiply(SCALE))

const SPACING = TILE_VERTICES[0].x * SCALE * 4
const X_OFFSET = (((QUEUE_SIZE + 1) * SPACING/2)) - 1

let queue = new Array(QUEUE_SIZE)

const getOpacity = tick => {
  const first = HALF_TICK_ROLLOVER - TENTH_TICK_ROLLOVER
  const second = TICK_ROLLOVER - TENTH_TICK_ROLLOVER

  if (tick < first) return 0
  if (tick >= first && tick < HALF_TICK_ROLLOVER) return (tick - first)/TENTH_TICK_ROLLOVER
  if (tick >= HALF_TICK_ROLLOVER && tick < second) return 1
  return 1 - ((tick - second)/TENTH_TICK_ROLLOVER)
}

const render = () => {
  const θf = noise(θ * FREQUENCY, t * FREQUENCY, 1) * AMPLITUDE
  const Δθ = θf - θ
  θ = θf

  context.clearRect(0, 0, canvas.width, canvas.height)

  perspective.rotX(angles.toRadians(0.4))

  tile = tile.map(vertex => (
    vertex.rotateAround(Vector.from(ORIGIN), X_AXIS, angles.toRadians(Δθ))
  ))

  if (tick === TICK_ROLLOVER) tick = 0
  if (tick % DELAY === 0) queue.push(tile)

  queue = queue.slice(Math.max(queue.length - QUEUE_SIZE, 0))

  const train = queue.concat([tile])

  train.forEach((tile, index) => {
    const offset = Vector.from([X_OFFSET - (index * SPACING), 0, 0])
    const projected = tile.map(vertex => (
      camera.project(vertex.add(offset).transform(perspective))
    ))

    renderCube(context, projected, COLOR, COLOR, getOpacity(tick))
  })

  tick++
  t += Δt

  if (t === TIME_ROLLOVER) t = 0
}

let prevTick = 0

const step = () => {
  window.requestAnimationFrame(step)

  const now = Math.round(FPS * Date.now() / 1000)
  if (now === prevTick) return
  prevTick = now

  render()
}

step()
