const { test, expect } = require('@playwright/test');
const fs = require('fs');

const BASE = 'https://dashboard-gamification.vercel.app';
const EMAIL = 'dev@prosper-fi.com';
const PASSWORD = 'testpass1234';

test.setTimeout(120000);

const bugs = [];
const shots = [];
let consoleErrors = [];
let networkErrors = [];

function bug(s, c, d, w, r, e, a) {
  bugs.push({ severity: s, category: c, desc: d, where: w, repro: r, expected: e, actual: a });
  console.log(`[BUG ${s.toUpperCase()}] ${d}`);
}

async function shot(page, name) {
  const p = `/tmp/audit3-${name}.png`;
  await page.screenshot({ path: p });
  shots.push(p);
  console.log(`[SS] ${p}`);
}

async function loginAndSetup(page) {
  await page.goto(`${BASE}/login`);
  await page.waitForTimeout(1500);
  await page.locator('button:has-text("sign in with email")').click();
  await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 8000 });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 15000 });
  await page.waitForTimeout(2000);
  
  await page.evaluate(() => {
    ['anna','aakarshit','usama','ahsan','prajeesh','abdallah'].forEach(id => {
      localStorage.setItem(`binayah_welcomed_${id}`, Date.now().toString());
    });
  });
  await page.goto(BASE + '/');
  await page.waitForTimeout(4000);
  
  if (await page.locator('text=Pick your theme').isVisible({ timeout: 1500 }).catch(() => false)) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }
}

test('Part 3: Docs/Activity/Chat + visual deep dive', async ({ page }) => {
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.log(`[CE] ${msg.text().substring(0,150)}`);
    }
  });
  page.on('pageerror', err => {
    consoleErrors.push('PAGE_ERROR: ' + err.message);
    console.log(`[PE] ${err.message.substring(0,120)}`);
  });
  page.on('response', resp => {
    const s = resp.status();
    const url = resp.url();
    if (s >= 400 && !url.includes('favicon') && !url.includes('_next/static') && !url.includes('fonts.')) {
      networkErrors.push(`${s} ${url}`);
      console.log(`[NET ${s}] ${url.substring(0,120)}`);
    }
  });

  try {
    await loginAndSetup(page);
  } catch (e) {
    console.log('Login failed:', e.message);
    return;
  }
  
  // List all nav buttons with actual text
  const navInfo = await page.evaluate(() => {
    const nav = document.querySelector('nav');
    if (!nav) return [];
    return Array.from(nav.querySelectorAll('button')).map(btn => ({
      text: btn.textContent?.trim(),
      innerText: btn.innerText?.trim()
    }));
  });
  console.log('Nav buttons:', JSON.stringify(navInfo));
  
  // ═══ DOCUMENTS ══════════════════════════════════════════════
  console.log('\n=== DOCUMENTS ===');
  // Nav buttons have emoji prefix: "📄documents" 
  const docsBtn = page.locator('nav button').filter({ hasText: 'documents' }).first();
  console.log(`Docs btn visible: ${await docsBtn.isVisible({ timeout: 2000 }).catch(() => false)}`);
  
  if (await docsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await docsBtn.click();
    await page.waitForTimeout(3000);
    await shot(page, '01-documents');
    await page.screenshot({ path: '/tmp/audit3-01b-docs-full.png', fullPage: true });
    shots.push('/tmp/audit3-01b-docs-full.png');
    
    // Check for TipTap editor
    const editorVis = await page.locator('.tiptap, .ProseMirror, [contenteditable="true"]').first().isVisible({ timeout: 3000 }).catch(() => false);
    const html = await page.content();
    const hasTiptap = html.includes('ProseMirror') || html.includes('tiptap');
    console.log(`TipTap: visible=${editorVis}, inHTML=${hasTiptap}`);
    
    if (!editorVis && !hasTiptap) {
      bug('major','functional','Documents panel: editor not rendered after clicking nav',
        '/documents nav','Click documents nav, wait 3s','Rich text editor','Not found');
    }
    
    // Check the 2-column layout mentioned in docs (list + editor)
    const docLayout = await page.evaluate(() => {
      const cols = Array.from(document.querySelectorAll('div[style*="flex"]')).filter(el => {
        const style = el.getAttribute('style') || '';
        return style.includes('gap') && el.children.length >= 2;
      });
      return cols.slice(0, 3).map(col => ({
        style: col.getAttribute('style')?.substring(0, 80),
        children: col.children.length
      }));
    });
    console.log('Doc layout columns:', JSON.stringify(docLayout));
    
    // Check for attribution strip
    const unsavedVis = await page.locator('text=// unsaved').isVisible({ timeout: 1000 }).catch(() => false);
    const lastSavedVis = await page.locator('text=last saved').isVisible({ timeout: 1000 }).catch(() => false);
    console.log(`Attribution: unsaved=${unsavedVis}, lastSaved=${lastSavedVis}`);
    
    // Check for new doc button
    const newDocBtn = page.locator('button').filter({ hasText: /new|create|\+ new/ }).first();
    const newDocVis = await newDocBtn.isVisible({ timeout: 1000 }).catch(() => false);
    console.log(`New doc button: ${newDocVis}`);
  }
  
  // ═══ ACTIVITY ════════════════════════════════════════════════
  console.log('\n=== ACTIVITY ===');
  const actBtn = page.locator('nav button').filter({ hasText: 'activity' }).first();
  if (await actBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await actBtn.click();
    await page.waitForTimeout(3000);
    await shot(page, '02-activity');
    await page.screenshot({ path: '/tmp/audit3-02b-activity-full.png', fullPage: true });
    shots.push('/tmp/audit3-02b-activity-full.png');
    
    const actVis = await page.locator('[class*="activity"], [class*="feed"]').first().isVisible({ timeout: 1000 }).catch(() => false);
    console.log(`Activity panel visible: ${actVis}`);
    
    // Check feed items vs empty state
    const actText = await page.evaluate(() => {
      const panel = document.querySelector('[class*="activity"], [class*="feed"]') || document.body;
      return panel.textContent?.substring(0, 200);
    });
    console.log(`Activity content: "${actText?.substring(0, 100)}"`);
  }
  
  // ═══ CHAT ════════════════════════════════════════════════════
  console.log('\n=== CHAT ===');
  const chatNavBtn = page.locator('nav button').filter({ hasText: 'chat' }).first();
  if (await chatNavBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await chatNavBtn.click();
    await page.waitForTimeout(3000);
    await shot(page, '03-chat');
    await page.screenshot({ path: '/tmp/audit3-03b-chat-full.png', fullPage: true });
    shots.push('/tmp/audit3-03b-chat-full.png');
    
    // Check for tabs and input
    const allInputs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('input')).filter(el => {
        const r = el.getBoundingClientRect();
        return r.height > 0 && r.width > 50;
      }).map(el => ({ type: el.type, placeholder: el.placeholder }))
    );
    console.log('Inputs on chat view:', JSON.stringify(allInputs));
    
    // Check team tab works
    const teamBtn = page.locator('button').filter({ hasText: /team/i }).first();
    const aiBtn = page.locator('button').filter({ hasText: /ai|claude/i }).first();
    console.log(`Team tab: ${await teamBtn.isVisible({timeout:1000}).catch(()=>false)}`);
    console.log(`AI tab: ${await aiBtn.isVisible({timeout:1000}).catch(()=>false)}`);
    
    // Check SSE connection — is there a connection error?
    const sseError = consoleErrors.some(e => e.includes('SSE') || e.includes('EventSource'));
    console.log(`SSE errors: ${sseError}`);
  }
  
  // ═══ VISUAL / DESIGN CHECK ════════════════════════════════════
  console.log('\n=== VISUAL DESIGN ===');
  
  // Check light mode (default)
  const lightModeData = await page.evaluate(() => {
    const isDark = localStorage.getItem('isDark');
    const themeId = localStorage.getItem('themeId') || 'warroom';
    return { isDark, themeId };
  });
  console.log(`isDark: ${lightModeData.isDark}, themeId: ${lightModeData.themeId}`);
  
  // Look at the "Chat/AI panel" float at bottom right
  const chatFloat = await page.evaluate(() => {
    // Find the chat bot floating button in bottom-right
    const fixed = Array.from(document.querySelectorAll('div[style], button')).filter(el => {
      const cs = window.getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return (cs.position === 'fixed' || cs.position === 'absolute') && 
        r.bottom > window.innerHeight - 100 && r.right > window.innerWidth - 100 &&
        r.width > 30 && r.height > 30;
    });
    return fixed.map(el => ({
      tag: el.tagName,
      text: el.textContent?.substring(0,30),
      rect: {
        bottom: Math.round(el.getBoundingClientRect().bottom),
        right: Math.round(el.getBoundingClientRect().right),
        w: Math.round(el.getBoundingClientRect().width),
        h: Math.round(el.getBoundingClientRect().height)
      },
      zIndex: window.getComputedStyle(el).zIndex
    }));
  });
  console.log('Bottom-right fixed elements:', JSON.stringify(chatFloat));
  
  // Back to pipelines to check the floating AI bot
  const pipBtn = page.locator('nav button').filter({ hasText: 'pipelines' }).first();
  if (await pipBtn.isVisible().catch(()=>false)) await pipBtn.click();
  await page.waitForTimeout(1500);
  await shot(page, '04-pipelines-with-bot');
  
  // ═══ FOCUS/HOVER STATES ════════════════════════════════════════
  console.log('\n=== HOVER STATES ===');
  // Hover over a stage claim button
  const claimBtns = await page.locator('button').filter({ hasText: /claim/i }).all();
  if (claimBtns.length > 0) {
    await claimBtns[0].hover();
    await page.waitForTimeout(300);
    await shot(page, '05-hover-claim');
  }
  
  // Hover over sidebar nav item
  const pipelinesNavItem = page.locator('nav button').filter({ hasText: 'pipelines' }).first();
  await pipelinesNavItem.hover();
  await page.waitForTimeout(300);
  
  // ═══ EMPTY STATE CHECK ════════════════════════════════════════
  console.log('\n=== EMPTY STATE - DOCS ===');
  // Navigate to docs and check if there's an empty state when no docs exist
  const docsBtn2 = page.locator('nav button').filter({ hasText: 'documents' }).first();
  if (await docsBtn2.isVisible({ timeout: 1000 }).catch(()=>false)) {
    await docsBtn2.click();
    await page.waitForTimeout(2500);
    
    // Check the empty state quality if no docs
    const emptyState = await page.evaluate(() => {
      return document.body.textContent?.includes('no documents') ||
             document.body.textContent?.includes('create your first') ||
             document.body.textContent?.includes('// empty');
    });
    console.log(`Has empty state copy: ${emptyState}`);
  }
  
  // ═══ DARK MODE VISUAL ═══════════════════════════════════════════
  console.log('\n=== DARK MODE ===');
  await page.evaluate(() => { localStorage.setItem('isDark', 'true'); });
  await page.goto(BASE + '/');
  await page.waitForTimeout(4000);
  await page.evaluate(() => {
    ['anna','aakarshit','usama','ahsan','prajeesh','abdallah'].forEach(id => {
      localStorage.setItem(`binayah_welcomed_${id}`, Date.now().toString());
    });
  });
  if (await page.locator('text=Pick your theme').isVisible({ timeout: 1500 }).catch(() => false)) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
  
  await shot(page, '06-dark-mode');
  await page.screenshot({ path: '/tmp/audit3-06b-dark-full.png', fullPage: true });
  shots.push('/tmp/audit3-06b-dark-full.png');
  
  const darkColors = await page.evaluate(() => {
    function isLight(rgb) {
      const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      return m ? (+m[1] > 200 && +m[2] > 190 && +m[3] > 180) : false;
    }
    const bodyBg = window.getComputedStyle(document.body).backgroundColor;
    const mainWrap = document.querySelector('div[style*="min-height: 100vh"]');
    const mainBg = mainWrap ? window.getComputedStyle(mainWrap).backgroundColor : null;
    return { bodyBg, mainBg, bodyIsLight: isLight(bodyBg), mainIsLight: isLight(mainBg || '') };
  });
  console.log('Dark mode colors:', JSON.stringify(darkColors));
  
  if (darkColors.mainIsLight || darkColors.bodyIsLight) {
    bug('major','design',
      'Dark mode: main content area still renders with cream/light background',
      '/dark mode (isDark=true)',
      'Set localStorage isDark="true", reload, check background color',
      'Dark background (e.g. warroom dark: #08050f)',
      `bodyBg=${darkColors.bodyBg}, mainBg=${darkColors.mainBg}`
    );
  }
  
  // ═══ MOBILE - DOCS ══════════════════════════════════════════════
  console.log('\n=== MOBILE 375 ===');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(1000);
  await shot(page, '07-mobile-dark');
  
  const mobileScroll = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth
  }));
  console.log(`Mobile scroll: ${JSON.stringify(mobileScroll)}`);
  
  if (mobileScroll.scrollW > mobileScroll.clientW + 5) {
    bug('major','layout',`Horizontal scroll on mobile`,'/375px','Set 375px','No scroll',
      `excess=${mobileScroll.scrollW - mobileScroll.clientW}px`);
  }
  
  // Nav on mobile
  const mobileNavVis = await page.locator('nav').first().isVisible({ timeout: 500 }).catch(() => false);
  const mobileNavBox = await page.locator('nav').first().boundingBox().catch(() => null);
  console.log(`Mobile nav: visible=${mobileNavVis} box=${JSON.stringify(mobileNavBox)}`);
  
  if (mobileNavBox && mobileNavBox.width > 60) {
    bug('major','layout','Sidebar visible on mobile','/375px','Set 375px viewport','Hidden','Visible width=' + mobileNavBox.width);
  }
  
  // ═══ STATS ════════════════════════════════════════════════════
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE + '/');
  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    ['anna','aakarshit','usama','ahsan','prajeesh','abdallah'].forEach(id => {
      localStorage.setItem(`binayah_welcomed_${id}`, Date.now().toString());
    });
  });
  
  // ═══ REPORT ═══════════════════════════════════════════════════
  console.log('\n=== CONSOLE ERRORS ===');
  console.log(`Count: ${consoleErrors.length}`);
  consoleErrors.slice(0,15).forEach(e => console.log(`  ${e.substring(0,200)}`));
  
  console.log('\n=== NETWORK ERRORS ===');
  console.log(`Count: ${networkErrors.length}`);
  networkErrors.slice(0,20).forEach(e => console.log(`  ${e}`));
  
  const results = { bugs, consoleErrors, networkErrors, screenshots: shots };
  fs.writeFileSync('/tmp/audit3-results.json', JSON.stringify(results, null, 2));
  
  console.log('\n=== BUG SUMMARY ===');
  bugs.forEach((b,i) => console.log(`  ${i+1}. [${b.severity.toUpperCase()}] ${b.category}: ${b.desc}`));
  
  expect(true).toBe(true);
});
