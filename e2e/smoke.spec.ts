import { expect, test } from '@playwright/test'

// Runs against the Vite dev server (the test hook window.__gilmores only exists in dev builds).
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 375, height: 667 },
]

for (const vp of VIEWPORTS) {
  test.describe(vp.name, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.name === 'mobile' })

    test('loads, plays a shot, replays and completes a hole', async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(e.message))
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

      await page.goto('/?level=3')
      await expect(page.getByRole('heading', { name: "Gilmore's Golf" })).toBeVisible()
      await page.getByRole('button', { name: /let.s putt/i }).click()

      const canvas = page.locator('canvas.course-canvas')
      await expect(canvas).toBeVisible()

      // Layout fits the viewport: no horizontal scroll, whole canvas visible.
      const fit = await page.evaluate(() => ({
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
      }))
      expect(fit.scrollW).toBeLessThanOrEqual(fit.clientW)
      const box = (await canvas.boundingBox()) as { x: number; y: number; width: number; height: number }
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(vp.width)

      // Pixel-art layer is not blank.
      const nonBlank = await canvas.evaluate((c: HTMLCanvasElement) => {
        const d = c.getContext('2d')?.getImageData(0, 0, c.width, c.height).data
        if (!d) return false
        let n = 0
        for (let i = 0; i < d.length; i += 4000) if (d[i + 3] !== 0) n++
        return n > 20
      })
      expect(nonBlank).toBe(true)

      // Drag a real shot with the pointer, away from the target (ball position comes from the dev hook).
      const ball = await page.evaluate(() => {
        const g = window.__gilmores?.game()
        return g ? { x: g.ball.x, y: g.ball.y, tx: g.course.cup.x, ty: g.course.cup.y } : null
      })
      expect(ball).not.toBeNull()
      const b = ball as { x: number; y: number; tx: number; ty: number }
      // Narrow portrait screens draw the board rotated a quarter turn (view x runs down, view y runs left).
      const rotated = vp.width <= 640
      const sx = rotated ? box.x + (1 - (b.y + 60) / 720) * box.width : box.x + ((b.x + 80) / 960) * box.width
      const sy = rotated ? box.y + ((b.x + 80) / 960) * box.height : box.y + ((b.y + 60) / 720) * box.height
      const away = Math.hypot(b.tx - b.x, b.ty - b.y)
      const wx = -(b.tx - b.x) / away
      const wy = -(b.ty - b.y) / away
      const ux = rotated ? -wy : wx
      const uy = rotated ? wx : wy
      await page.mouse.move(sx, sy)
      await page.mouse.down()
      await page.mouse.move(sx + ux * 40, sy + uy * 40, { steps: 5 })
      await page.mouse.up()

      await expect(page.getByTestId('strokes')).toHaveText('1')
      await expect(page.getByRole('button', { name: /reset this hole/i })).toBeVisible()

      // Replay resets the round but keeps the same course.
      const before = await page.evaluate(() => JSON.stringify(window.__gilmores?.game().course.tee))
      await page.getByRole('button', { name: /reset this hole/i }).click()
      await expect(page.getByTestId('strokes')).toHaveText('0')
      expect(await page.evaluate(() => JSON.stringify(window.__gilmores?.game().course.tee))).toBe(before)

      // Hole it (dev hook exercises the real capture path) and expect the results overlay.
      await page.evaluate(() => window.__gilmores?.holeIn())
      await expect(page.getByTestId('results')).toBeVisible({ timeout: 8000 })
      await expect(page.getByTestId('result-strokes')).toHaveText('1')
      await page.getByTestId('results').getByRole('button', { name: 'Next level' }).click()
      await expect(page.getByTestId('results')).toHaveCount(0)
      await expect(page.getByRole('heading', { name: "Gilmore's Golf" })).toBeVisible()
      await expect(page.getByTestId('strokes')).toHaveText('0')

      expect(errors).toEqual([])
    })
  })
}
