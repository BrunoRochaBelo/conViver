const { test, expect } = require('@playwright/test');
const path = require('path');

const layoutPath = path.resolve(__dirname, '../../conViver.Web/wwwroot/layout.html');

test('header becomes sticky and pageMain padding accounts for header elements', async ({ page }) => {
  await page.goto('file://' + layoutPath);

  // extend pageMain with tall content to enable scrolling
  await page.evaluate(() => {
    const main = document.getElementById('pageMain');
    if (main) {
      const filler = document.createElement('div');
      filler.style.height = '2000px';
      main.appendChild(filler);
    }
  });

  // scroll past sentinel
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(100); // wait for intersection observer

  // check sticky class applied
  const hasSticky = await page.evaluate(() => document.querySelector('.cv-header').classList.contains('cv-header--sticky'));
  expect(hasSticky).toBe(true);

  const values = await page.evaluate(() => {
    const header = document.querySelector('.cv-header');
    const nav = document.getElementById('mainNav');
    const tabs = document.querySelector('.cv-tabs');
    const pageMain = document.getElementById('pageMain');
    const headerH = header ? header.offsetHeight : 0;
    const navH = nav ? nav.offsetHeight : 0;
    const tabsH = tabs ? tabs.offsetHeight : 0;
    const paddingTop = parseFloat(getComputedStyle(pageMain).paddingTop);
    return { headerH, navH, tabsH, paddingTop };
  });

  expect(values.paddingTop).toBe(values.headerH + values.navH + values.tabsH);
});
