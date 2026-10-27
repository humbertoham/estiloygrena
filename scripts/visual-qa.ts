import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({ headless: true });
await mkdir("artifacts/qa", { recursive: true });
try {
  const page = await browser.newPage();
  for (const [w, h] of [
    [1440, 900],
    [1280, 800],
    [768, 1024],
    [390, 844],
    [375, 812],
  ]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("http://localhost:3000");
    await page.evaluate(() => document.fonts.ready);
    await page.locator(".hero-poster").waitFor();
    console.log(
      "Viewport",
      w,
      "overflow",
      await page.evaluate(() =>
        Array.from(document.querySelectorAll("body *"))
          .filter((e) => {
            const b = e.getBoundingClientRect();
            return b.right > innerWidth + 1 && b.width > 0;
          })
          .map((e) => ({
            tag: e.tagName,
            class: e.className,
            right: Math.round(e.getBoundingClientRect().right),
          }))
          .slice(0, 12),
      ),
    );
    await page.screenshot({ path: `artifacts/qa/hero-${w}.png` });
    if (w === 1440 || w === 390) {
      for (const section of ["services", "gallery", "location"]) {
        await page.locator(`.${section}-composition`).scrollIntoViewIfNeeded();
        await page.screenshot({ path: `artifacts/qa/${section}-${w}.png` });
      }
    }
  }
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto("http://localhost:3000/agendar");
    await page.locator('.booking-layout form[data-ready="true"]').waitFor();
    await page.locator('.booking-layout [aria-busy="false"]').waitFor();
    await page.screenshot({
      path: `artifacts/qa/booking-${width}.png`,
      fullPage: true,
    });
    console.log(
      "Booking viewport",
      width,
      "overflow",
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    );
  }
} finally {
  await browser.close();
}
