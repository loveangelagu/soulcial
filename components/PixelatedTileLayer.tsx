import { useEffect, useMemo } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

type Props = {
  urlTemplate: string
  pixelSize?: number
  opacity?: number
  zIndex?: number
  attribution?: string
  minZoom?: number
  maxZoom?: number
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function pickSubdomain(subdomains: string, x: number, y: number) {
  if (!subdomains) return ''
  const i = Math.abs(x + y) % subdomains.length
  return subdomains[i]
}

export function PixelatedTileLayer({
  urlTemplate,
  pixelSize = 10,
  opacity = 1,
  zIndex = 1,
  attribution,
  minZoom,
  maxZoom,
}: Props) {
  const map = useMap()

  const opts = useMemo(
    () => ({
      urlTemplate,
      pixelSize: clamp(pixelSize, 1, 64),
      opacity: clamp(opacity, 0, 1),
      zIndex,
      attribution,
      minZoom,
      maxZoom,
    }),
    [urlTemplate, pixelSize, opacity, zIndex, attribution, minZoom, maxZoom],
  )

  useEffect(() => {
    const subdomains = 'abc'

    const layer = L.gridLayer({
      opacity: opts.opacity,
      zIndex: opts.zIndex,
      attribution: opts.attribution,
      minZoom: opts.minZoom,
      maxZoom: opts.maxZoom,
      updateWhenIdle: true,
      updateWhenZooming: false,
      keepBuffer: 2,
    }) as L.GridLayer & {
      createTile: (coords: L.Coords, done: L.DoneCallback) => HTMLElement
    }

    layer.createTile = (coords: L.Coords, done: L.DoneCallback) => {
      const tileSize = layer.getTileSize()
        const canvas = document.createElement('canvas')
        canvas.width = tileSize.x
        canvas.height = tileSize.y

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          done(undefined, canvas)
          return canvas
        }

        const url = L.Util.template(opts.urlTemplate, {
          s: pickSubdomain(subdomains, coords.x, coords.y),
          x: coords.x,
          y: coords.y,
          z: coords.z,
        } as any)

        const img = new Image()
        img.crossOrigin = 'anonymous'

        img.onload = () => {
          try {
            const p = opts.pixelSize
            const w = Math.max(1, Math.floor(tileSize.x / p))
            const h = Math.max(1, Math.floor(tileSize.y / p))

            const tmp = document.createElement('canvas')
            tmp.width = w
            tmp.height = h
            const tctx = tmp.getContext('2d')
            if (!tctx) {
              ctx.drawImage(img, 0, 0, tileSize.x, tileSize.y)
              done(undefined, canvas)
              return
            }

            tctx.imageSmoothingEnabled = false
            tctx.drawImage(img, 0, 0, w, h)

            ctx.imageSmoothingEnabled = false
            ctx.clearRect(0, 0, tileSize.x, tileSize.y)
            ctx.drawImage(tmp, 0, 0, w, h, 0, 0, tileSize.x, tileSize.y)

            done(undefined, canvas)
          } catch (e) {
            done(e as any, canvas)
          }
        }

        img.onerror = () => done(undefined, canvas)
        img.src = url

        return canvas
    }

    layer.addTo(map)
    return () => {
      layer.remove()
    }
  }, [map, opts])

  return null
}

