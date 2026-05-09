type UxMetrics = {
  planStartedAt: number | null
  firstExportMs: number | null
  exportClicks: number
  advancedFilterOpenCount: number
  zeroResultRecoveries: number
  pinClicks: number
  spotlightDayChanges: number
  reviewSheetOpens: number
}

const KEY = 'vibecheck:ux-metrics:v1'

function readMetrics(): UxMetrics {
  if (typeof window === 'undefined') return emptyMetrics()
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<UxMetrics> | null
    return {
      planStartedAt: parsed?.planStartedAt ?? null,
      firstExportMs: parsed?.firstExportMs ?? null,
      exportClicks: parsed?.exportClicks ?? 0,
      advancedFilterOpenCount: parsed?.advancedFilterOpenCount ?? 0,
      zeroResultRecoveries: parsed?.zeroResultRecoveries ?? 0,
      pinClicks: parsed?.pinClicks ?? 0,
      spotlightDayChanges: parsed?.spotlightDayChanges ?? 0,
      reviewSheetOpens: parsed?.reviewSheetOpens ?? 0,
    }
  } catch {
    return emptyMetrics()
  }
}

function writeMetrics(next: UxMetrics) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(next))
}

function emptyMetrics(): UxMetrics {
  return {
    planStartedAt: null,
    firstExportMs: null,
    exportClicks: 0,
    advancedFilterOpenCount: 0,
    zeroResultRecoveries: 0,
    pinClicks: 0,
    spotlightDayChanges: 0,
    reviewSheetOpens: 0,
  }
}

export function startPlanSession() {
  const metrics = readMetrics()
  if (metrics.planStartedAt !== null) return
  writeMetrics({ ...metrics, planStartedAt: Date.now() })
}

export function trackAdvancedFilterOpened() {
  const metrics = readMetrics()
  writeMetrics({
    ...metrics,
    advancedFilterOpenCount: metrics.advancedFilterOpenCount + 1,
  })
}

export function trackZeroResultRecovery() {
  const metrics = readMetrics()
  writeMetrics({
    ...metrics,
    zeroResultRecoveries: metrics.zeroResultRecoveries + 1,
  })
}

export function trackExportClick() {
  const metrics = readMetrics()
  const now = Date.now()
  const firstExportMs =
    metrics.firstExportMs ?? (metrics.planStartedAt ? now - metrics.planStartedAt : null)
  writeMetrics({
    ...metrics,
    exportClicks: metrics.exportClicks + 1,
    firstExportMs,
  })
}

export function trackPin(_uid: string) {
  const metrics = readMetrics()
  writeMetrics({
    ...metrics,
    pinClicks: metrics.pinClicks + 1,
  })
}

export function trackSpotlightDayChange() {
  const metrics = readMetrics()
  writeMetrics({
    ...metrics,
    spotlightDayChanges: metrics.spotlightDayChanges + 1,
  })
}

export function trackReviewSheetOpen() {
  const metrics = readMetrics()
  writeMetrics({
    ...metrics,
    reviewSheetOpens: metrics.reviewSheetOpens + 1,
  })
}

export function getUxMetrics(): UxMetrics {
  return readMetrics()
}
