const { test, expect } = require('@playwright/test');
const fs = require('fs');

// Dashboard is at ROOT / not /dashboard
const BASE = 'https://dashboard-gamification.vercel.app';
const DASHBOARD = BASE + '/';  // Root is the dashboard
const EMAIL = 'dev@prosper-fi.com';
const PASSWORD = 'testpass1234';

test.setTimeout(180000);

const bugs = [];
const shots = [];
let consoleErrors = [];
let networkErrors = [];

function bug(s, c, d, w, r, e, a) {
  bugs.push({ severity: s, category: c, desc: d, where: w, repro: r, expected: e, actual: a });
  console.log(`[BUG ${s.toUpperCase()}] ${d}`);
}

async function shot(page, name) {
  const p = `/tmp/audit-${name}.png`;
  await page.screenshot({ path: p });
  shots.push(p);
  console.log(`[SS] ${p}`);
}

async function login(page) {
  await page.goto(`${BASE}/login`);
  await page.waitForTimeout(1500);
  
  const toggle = page.locator('button:has-text("sign in with email")');
  await toggle.waitFor({ state: 'visible', timeout: 8000 });
  await toggle.click();
  
  await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 8000 });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  
  await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 15000 });
  await page.waitForTimeout(3000);
}

async function dismissModal(page) {
  await page.evaluate(() => {
    ['anna','aakarshit','usama','ahsan','prajeesh','abdallah'].forEach(id => {
      localStorage.setItem(`binayah_welcomed_${id}`, Date.now().toString());
    });
  });
  await page.goto(DASHBOARD);
  await page.waitForTimeout(4000);
  if (await page.locator('text=Pick your theme').isVisible({ timeout: 1500 }).catch(() => false)) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }
}

test('Full dashboard audit', async ({ page }) => {
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
    const url = resp.url();
    const s = resp.status();
    if (s >= 400 && !url.includes('favicon') && !url.includes('_next/static') && !url.includes('fonts.')) {
      networkErrors.push(`${s} ${url}`);
      console.log(`[NET ${s}] ${url.substring(0,120)}`);
    }
  });

  // ═══ 1. LOGIN ════════════════════════════════════════════════════════════
  console.log('\n=== 1. LOGIN ===');
  
  try {
    await login(page);
  } catch (e) {
    bug('critical','functional','Login failed: ' + e.message,'/login','Fill creds + submit','Redirect to /','Failed: ' + e.message);
    fs.writeFileSync('/tmp/audit-results.json', JSON.stringify({ bugs, consoleErrors, networkErrors, screenshots: shots }, null, 2));
    return;
  }
  
  console.log(`After login URL: ${page.url()}`);
  await shot(page, '01-post-login');
  
  // NOTE: There is NO /dashboard route — app lives at /
  // Check if /dashboard 404s (this is a bug if linked anywhere)
  const dashboardResp = await page.request.get(`${BASE}/dashboard`).catch(() => null);
  if (dashboardResp) {
    console.log(`GET /dashboard status: ${dashboardResp.status()}`);
    if (dashboardResp.status() === 404) {
      bug('major','functional',
        '/dashboard route returns 404 — app lives at / but any link to /dashboard (e.g. in emails) is broken',
        'GET /dashboard',
        'Navigate to https://dashboard-gamification.vercel.app/dashboard',
        '200 OK or redirect to /',
        '404 Not Found'
      );
    }
  }
  
  // ═══ 2. DISMISS MODAL ════════════════════════════════════════════════════
  console.log('\n=== 2. DISMISS MODAL ===');
  await dismissModal(page);
  
  const currentUrl = page.url();
  console.log(`Dashboard URL: ${currentUrl}`);
  
  await shot(page, '02-dashboard');
  await page.screenshot({ path: '/tmp/audit-02b-full.png', fullPage: true });
  shots.push('/tmp/audit-02b-full.png');
  
  const welcomeStill = await page.locator('text=Pick your theme').isVisible({ timeout: 1500 }).catch(() => false);
  if (welcomeStill) {
    bug('major','functional','Welcome modal persists after localStorage binayah_welcomed_* set + page reload',
      '/ WelcomeModal','Set binayah_welcomed_anna etc in localStorage, reload page','Modal dismissed','Modal still visible');
  }
  
  // ═══ 3. THEME / VISUAL ═══════════════════════════════════════════════════
  console.log('\n=== 3. THEME ANALYSIS ===');
  const themeInfo = await page.evaluate(() => {
    function isLight(rgb) {
      const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      return m ? (+m[1] > 200 && +m[2] > 190 && +m[3] > 180) : false;
    }
    const bodyBg = window.getComputedStyle(document.body).backgroundColor;
    const isDark = localStorage.getItem('isDark');
    const themeId = localStorage.getItem('themeId') || 'warroom';
    
    // Find the main wrapper div background
    let mainBg = null;
    const mainWrap = document.querySelector('div[style*="background"][style*="min-height"]');
    if (mainWrap) mainBg = window.getComputedStyle(mainWrap).backgroundColor;
    
    // Large visible sections with light backgrounds
    const lightSections = [];
    document.querySelectorAll('div[style*="background"]').forEach(el => {
      const bg = window.getComputedStyle(el).backgroundColor;
      const rect = el.getBoundingClientRect();
      if (isLight(bg) && rect.width > 400 && rect.height > 200 && rect.top >= 0 && rect.top < window.innerHeight) {
        lightSections.push({
          bg, size: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
          pos: `y=${Math.round(rect.top)}`, style: el.getAttribute('style')?.substring(0,60)
        });
      }
    });
    
    return { bodyBg, mainBg, isDark, themeId, isBodyLight: isLight(bodyBg), lightSections };
  });
  
  console.log(`Theme: "${themeInfo.themeId}", isDark: ${themeInfo.isDark}`);
  console.log(`Body bg: ${themeInfo.bodyBg} (light: ${themeInfo.isBodyLight})`);
  console.log(`Main wrap bg: ${themeInfo.mainBg}`);
  console.log(`Light sections: ${themeInfo.lightSections.length}`);
  themeInfo.lightSections.forEach(s => console.log(`  ${s.size} pos=${s.pos}: ${s.bg}`));
  
  // isDark starts as false (per lsGet("isDark", false)) but login always uses dark
  // This means: login=dark, dashboard=light by default = jarring mismatch
  const actuallyLightMode = themeInfo.isDark !== 'true';
  if (actuallyLightMode) {
    bug('major','design',
      'Dashboard defaults to LIGHT mode while login page is always dark — jarring visual transition for first-time users',
      '/ after login',
      '1. Open in fresh browser (no localStorage) 2. Log in 3. Observe theme change',
      'Consistent dark theme (or user choice remembered from login)',
      `Login: warroom dark (#08050f bg). Dashboard on first load: warroom LIGHT (cream bg, isDark=${themeInfo.isDark})`
    );
  }
  
  // ═══ 4. HEADER AREA ═══════════════════════════════════════════════════════
  console.log('\n=== 4. HEADER AREA ===');
  const headerBtns = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).filter(btn => {
      const r = btn.getBoundingClientRect();
      return r.y < 300 && r.width > 0 && r.height > 0;
    }).map(btn => ({
      text: btn.textContent?.trim().substring(0,30),
      aria: btn.getAttribute('aria-label'),
      title: btn.getAttribute('title'),
      x: Math.round(btn.getBoundingClientRect().x),
      y: Math.round(btn.getBoundingClientRect().y)
    }));
  });
  console.log('Header buttons:', JSON.stringify(headerBtns, null, 2));
  
  // Look for bell/notification  
  const bellInfo = headerBtns.find(b => 
    (b.aria || '').toLowerCase().includes('notif') ||
    (b.aria || '').toLowerCase().includes('bell') ||
    (b.title || '').toLowerCase().includes('notif')
  );
  if (!bellInfo) {
    bug('minor','design','Notification bell button has no aria-label — accessibility gap',
      '/ header area','Inspect all buttons in header (y<300)',
      'aria-label="Notifications" or similar','No button with notification/bell label');
  }
  
  // ═══ 5. NOTIFICATION BELL ═════════════════════════════════════════════════
  console.log('\n=== 5. BELL CLICK ===');
  // Find the NotificationBell component — it's dynamically loaded
  // Look for SVG icons in header area buttons
  const bellClicked = await page.evaluate(async () => {
    const btns = Array.from(document.querySelectorAll('button')).filter(btn => {
      const r = btn.getBoundingClientRect();
      return r.y < 300 && r.x > 600 && r.width < 60;
    });
    
    const bellBtns = btns.filter(btn => {
      const svg = btn.querySelector('svg');
      const classes = btn.className || '';
      const label = btn.getAttribute('aria-label') || '';
      return svg || label.includes('notif') || classes.includes('bell');
    });
    
    return { count: bellBtns.length, texts: bellBtns.map(b => b.textContent?.trim().substring(0,20)) };
  });
  console.log('Potential bell buttons:', JSON.stringify(bellClicked));
  
  // Try to click the notification bell by iterating header area buttons
  await shot(page, '05-before-bell');
  
  // Since NotificationBell is dynamically loaded, find it after render
  // The bell component has a badge indicator div
  const bellArea = page.locator('[class*="bell"], [class*="notif"][class*="icon"]').first();
  const bellAreaCount = await bellArea.count();
  console.log(`Bell component by class: ${bellAreaCount}`);
  
  // Try clicking all small header buttons
  const smallHeaderBtns = page.locator('button').filter(async (btn) => {
    const box = await btn.boundingBox();
    return box && box.y < 200 && box.x > 800 && box.width < 50;
  });
  
  // Alternative: just try all header-area buttons and see if any open a dropdown
  const allHeaderButtons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).filter(btn => {
      const r = btn.getBoundingClientRect();
      return r.y < 200 && r.width > 0;
    }).map((btn, i) => ({ index: i, x: Math.round(btn.getBoundingClientRect().x), y: Math.round(btn.getBoundingClientRect().y) }));
  });
  
  let bellDropdownOpened = false;
  for (const btnPos of allHeaderButtons) {
    const btns = await page.locator('button').all();
    const btn = btns[btnPos.index];
    if (!btn) continue;
    
    const prevFixedCount = await page.evaluate(() =>
      Array.from(document.querySelectorAll('div[style]')).filter(el => {
        const cs = window.getComputedStyle(el);
        return cs.position === 'fixed' && parseInt(cs.zIndex) > 50;
      }).length
    );
    
    await btn.click().catch(() => {});
    await page.waitForTimeout(500);
    
    const newFixedCount = await page.evaluate(() =>
      Array.from(document.querySelectorAll('div[style]')).filter(el => {
        const cs = window.getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return cs.position === 'fixed' && parseInt(cs.zIndex) > 50 && r.height > 50;
      }).length
    );
    
    if (newFixedCount > prevFixedCount) {
      console.log(`Button at ${btnPos.x},${btnPos.y} opened dropdown (fixed: ${prevFixedCount}→${newFixedCount})`);
      await shot(page, '05b-dropdown');
      bellDropdownOpened = true;
      
      // Test Escape closes
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
      const afterEsc = await page.evaluate(() =>
        Array.from(document.querySelectorAll('div[style]')).filter(el => {
          const cs = window.getComputedStyle(el);
          const r = el.getBoundingClientRect();
          return cs.position === 'fixed' && parseInt(cs.zIndex) > 50 && r.height > 50;
        }).length
      );
      console.log(`After Escape: fixed count = ${afterEsc}`);
      break;
    }
    
    // Close any theme picker or popup that might have opened
    await page.mouse.click(300, 400);
    await page.waitForTimeout(200);
  }
  
  if (!bellDropdownOpened) {
    console.log('Could not confirm bell dropdown opened — may be by design for test user with no notifications');
  }
  
  // ═══ 6. CMD+K ════════════════════════════════════════════════════════════
  console.log('\n=== 6. CMD+K ===');
  
  const preKFixedCount = await page.evaluate(() =>
    Array.from(document.querySelectorAll('div')).filter(el => {
      const cs = window.getComputedStyle(el);
      return cs.position === 'fixed' && parseInt(cs.zIndex) > 50;
    }).length
  );
  
  await page.keyboard.press('Meta+k');
  await page.waitForTimeout(1000);
  await shot(page, '06-cmdK');
  
  const postKFixedCount = await page.evaluate(() =>
    Array.from(document.querySelectorAll('div')).filter(el => {
      const cs = window.getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return cs.position === 'fixed' && parseInt(cs.zIndex) > 50 && r.width > 200 && r.height > 100;
    }).length
  );
  
  // Also check visible inputs
  const visInputs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('input')).filter(el => {
      const r = el.getBoundingClientRect();
      return r.height > 0 && r.width > 100;
    }).map(el => ({ type: el.type, placeholder: el.placeholder }))
  );
  
  console.log(`CMD+K: pre=${preKFixedCount} post=${postKFixedCount}, inputs=${JSON.stringify(visInputs)}`);
  
  const cmdkWorked = postKFixedCount > preKFixedCount || visInputs.some(i => i.placeholder?.toLowerCase().includes('search'));
  
  if (!cmdkWorked) {
    bug('major','functional','Meta+K does not open search palette — no overlay or input appeared',
      '/ dashboard','Press Meta+K (Cmd+K) on dashboard page',
      'Search palette overlay opens with search input',
      `pre=${preKFixedCount} post=${postKFixedCount} inputs=${JSON.stringify(visInputs)}`
    );
  } else {
    console.log('Cmd+K: palette opened');
    await page.keyboard.type('research');
    await page.waitForTimeout(800);
    await shot(page, '06b-cmdK-typed');
    
    const results = await page.evaluate(() =>
      Array.from(document.querySelectorAll('div[style*="fixed"], [role="option"]')).slice(0, 5).map(el => el.textContent?.substring(0,30))
    );
    console.log('Search results:', results);
    
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }
  
  // ═══ 7. SIDEBAR ══════════════════════════════════════════════════════════
  console.log('\n=== 7. SIDEBAR ===');
  const sidebarInfo = await page.evaluate(() => {
    const nav = document.querySelector('nav');
    if (!nav) return { found: false };
    const btns = Array.from(nav.querySelectorAll('button')).map(btn => ({
      text: btn.textContent?.trim().substring(0,25),
      visible: btn.getBoundingClientRect().height > 0
    })).filter(b => b.visible);
    const navRect = nav.getBoundingClientRect();
    return { found: true, width: Math.round(navRect.width), height: Math.round(navRect.height), buttons: btns };
  });
  
  console.log('Sidebar:', JSON.stringify(sidebarInfo));
  
  if (!sidebarInfo.found) {
    bug('critical','functional','No <nav> element in DOM','/','Load dashboard','<nav> element present','Not found');
  } else {
    const texts = sidebarInfo.buttons.map(b => b.text.toLowerCase());
    console.log(`Nav items: ${texts.join(' | ')}`);
    ['pipelines','documents','activity','chat'].forEach(item => {
      if (!texts.some(t => t.includes(item))) {
        bug('major','functional',`"${item}" missing from sidebar nav`,'/sidebar',`Check nav buttons: [${texts.join(', ')}]`,`"${item}" present`,'Not found');
      }
    });
  }
  
  // ═══ 8. DOCUMENTS ════════════════════════════════════════════════════════
  console.log('\n=== 8. DOCUMENTS ===');
  const docsBtn = page.locator('nav button').filter({ hasText: /^documents$/i }).first();
  if (await docsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await docsBtn.click();
    await page.waitForTimeout(3000);
    await shot(page, '08-documents');
    
    const tiptapVis = await page.locator('.tiptap, .ProseMirror, [contenteditable="true"]').first().isVisible({ timeout: 2000 }).catch(() => false);
    const pageHtml = await page.content();
    const hasTiptap = pageHtml.includes('ProseMirror') || pageHtml.includes('tiptap');
    console.log(`TipTap editor: visible=${tiptapVis}, in HTML=${hasTiptap}`);
    
    if (!tiptapVis && !hasTiptap) {
      bug('major','functional','Documents panel: TipTap editor not visible after clicking documents nav + 3s wait',
        '/documents panel','1. Click documents in sidebar 2. Wait 3s','contenteditable editor visible','No editor found');
    }
    
    // Check for new document button
    const newBtn = page.locator('button').filter({ hasText: /new|create/i }).first();
    console.log(`New doc button: ${await newBtn.isVisible({ timeout: 1000 }).catch(() => false)}`);
  }
  
  // ═══ 9. ACTIVITY ═════════════════════════════════════════════════════════
  console.log('\n=== 9. ACTIVITY ===');
  const actBtn = page.locator('nav button').filter({ hasText: /^activity$/i }).first();
  if (await actBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await actBtn.click();
    await page.waitForTimeout(3000);
    await shot(page, '09-activity');
    const actContent = await page.locator('[class*="activity"]').first().isVisible({ timeout: 1000 }).catch(() => false);
    console.log(`Activity panel content visible: ${actContent}`);
  }
  
  // ═══ 10. CHAT ════════════════════════════════════════════════════════════
  console.log('\n=== 10. CHAT ===');
  const chatBtn = page.locator('nav button').filter({ hasText: /^chat$/i }).first();
  if (await chatBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await chatBtn.click();
    await page.waitForTimeout(3000);
    await shot(page, '10-chat');
    
    const msgInput = page.locator([
      'input[placeholder*="message" i]',
      'input[placeholder*="type" i]',
      'input[placeholder*="ask" i]',
      'textarea[placeholder*="message" i]'
    ].join(', ')).first();
    
    const msgVis = await msgInput.isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`Message input: ${msgVis}`);
    if (!msgVis) {
      bug('major','functional','Chat panel: message input not visible after loading',
        '/chat panel','Click chat nav, wait 3s','Message input field visible','No input found');
    }
  }
  
  // ═══ 11. PIPELINES ═══════════════════════════════════════════════════════
  console.log('\n=== 11. PIPELINES ===');
  const pipBtn = page.locator('nav button').filter({ hasText: /^pipelines$/i }).first();
  if (await pipBtn.isVisible().catch(() => false)) await pipBtn.click();
  await page.waitForTimeout(1500);
  await shot(page, '11-pipelines');
  
  // View toggles
  const viewBtns = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).filter(btn => {
      const t = (btn.textContent || '').toLowerCase().trim();
      return t === 'kanban' || t === 'overview' || t === 'list';
    }).map(btn => btn.textContent?.trim());
  });
  console.log('View toggle buttons:', viewBtns);
  
  // Kanban view
  const kanbanBtn = page.locator('button').filter({ hasText: /^kanban$/i }).first();
  if (await kanbanBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await kanbanBtn.click();
    await page.waitForTimeout(2500);
    await shot(page, '11b-kanban');
    const colVisible = await page.locator('[class*="column"], [class*="kanban"]').first().isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`Kanban columns visible: ${colVisible}`);
  }
  
  // Overview
  const overviewBtn = page.locator('button').filter({ hasText: /^overview$/i }).first();
  if (await overviewBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await overviewBtn.click();
    await page.waitForTimeout(2500);
    await shot(page, '11c-overview');
    const ovPanel = await page.locator('[class*="overview"], [class*="metric"]').first().isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`Overview panel visible: ${ovPanel}`);
  }
  
  // Back to list
  await page.locator('button').filter({ hasText: /^list$/i }).first().click().catch(() => {});
  await page.waitForTimeout(1000);
  
  // ═══ 12. STAGE CARDS ══════════════════════════════════════════════════════
  console.log('\n=== 12. STAGE CARDS ===');
  
  // Check claim buttons exist
  const claimBtns = await page.locator('button').filter({ hasText: /claim/i }).count();
  console.log(`Claim buttons: ${claimBtns}`);
  
  if (claimBtns > 0) {
    const firstClaim = page.locator('button').filter({ hasText: /\+ claim/i }).first();
    if (await firstClaim.isVisible({ timeout: 1000 }).catch(() => false)) {
      await firstClaim.click();
      await page.waitForTimeout(1000);
      await shot(page, '12-claimed');
      console.log('Claimed a stage');
    }
  }
  
  // ═══ 13. MOBILE ═══════════════════════════════════════════════════════════
  console.log('\n=== 13. MOBILE 375px ===');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(1500);
  await shot(page, '13-mobile');
  
  const scrollInfo = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth
  }));
  console.log(`Mobile: scrollW=${scrollInfo.scrollW} clientW=${scrollInfo.clientW} diff=${scrollInfo.scrollW - scrollInfo.clientW}`);
  
  if (scrollInfo.scrollW > scrollInfo.clientW + 5) {
    bug('major','layout',`Horizontal scroll on mobile (${scrollInfo.scrollW - scrollInfo.clientW}px excess)`,
      '/ at 375px','Set viewport 375px wide, load /',
      'No horizontal scroll','scrollWidth > clientWidth by ' + (scrollInfo.scrollW - scrollInfo.clientW) + 'px');
  }
  
  const mobileNavBox = await page.locator('nav').first().boundingBox().catch(() => null);
  console.log(`Mobile nav box: ${JSON.stringify(mobileNavBox)}`);
  if (mobileNavBox && mobileNavBox.width > 60) {
    bug('major','layout','Sidebar visible on mobile (should be hidden below 768px)',
      '/ at 375px', 'Set 375px viewport',
      'Sidebar hidden', `Sidebar visible width=${Math.round(mobileNavBox.width)}px`);
  }
  
  const overflows = await page.evaluate(() => {
    const ov = [];
    document.querySelectorAll('button, h1, h2, h3, header, [class*="header"]').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.right > window.innerWidth + 5 && r.height > 0) {
        ov.push(`${el.tagName}:"${(el.textContent||'').substring(0,20)}" right=${Math.round(r.right)}`);
      }
    });
    return ov.slice(0, 8);
  });
  console.log(`Overflow elements: ${overflows.length}: ${overflows.join('; ')}`);
  if (overflows.length > 0) {
    bug('major','layout',`${overflows.length} element(s) overflow right edge on mobile`,
      '/ at 375px','Set 375px viewport, check element bounds',
      'All elements within viewport', overflows.slice(0,3).join('; '));
  }
  
  // Restore
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(DASHBOARD);
  await page.waitForTimeout(4000);
  await dismissModal(page);
  
  // ═══ 14. DESIGN DETAILS ══════════════════════════════════════════════════
  console.log('\n=== 14. DESIGN DETAILS ===');
  
  // Icon consistency check in sidebar
  const navIconTypes = await page.evaluate(() => {
    const nav = document.querySelector('nav');
    if (!nav) return [];
    return Array.from(nav.querySelectorAll('button')).map(btn => {
      const hasSvg = !!btn.querySelector('svg');
      const text = btn.textContent || '';
      const hasEmoji = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{1F000}-\u{1F02F}]/u.test(text);
      return { text: text.trim().substring(0,25), hasSvg, hasEmoji };
    }).filter(b => b.text);
  });
  console.log('Nav icon types:', JSON.stringify(navIconTypes));
  
  // Check for mixed emoji+svg in same nav level
  const topNavItems = navIconTypes.slice(0, 4); // First 4 = pipelines/docs/activity/chat
  const hasAnyEmoji = topNavItems.some(i => i.hasEmoji);
  const hasAnySvg = topNavItems.some(i => i.hasSvg);
  if (hasAnyEmoji && hasAnySvg) {
    bug('minor','design','Sidebar top nav mixes emoji icons and SVG icons across items',
      '/sidebar nav',
      'Inspect the 4 main nav buttons (pipelines, documents, activity, chat)',
      'Consistent icon style — either all emoji or all SVG',
      'Mix found: ' + topNavItems.map(i => `${i.text}(emoji=${i.hasEmoji},svg=${i.hasSvg})`).join(', ')
    );
  }
  
  // Font check
  const fontData = await page.evaluate(() => {
    const fonts = {};
    ['h1','h2','h3','p','button','span'].forEach(tag => {
      document.querySelectorAll(tag).forEach(el => {
        const ff = window.getComputedStyle(el).fontFamily;
        const first = ff.split(',')[0].replace(/['"]/g,'').trim();
        if (first.length > 2) fonts[first] = (fonts[first] || 0) + 1;
      });
    });
    return Object.entries(fonts).sort((a,b) => b[1]-a[1]).slice(0,8);
  });
  console.log('Font usage:', fontData.map(([f,c]) => `${f}(${c})`).join(', '));
  
  // Check for non-Geist/DM fonts being used
  const unexpectedFonts = fontData.filter(([f]) => 
    !f.toLowerCase().includes('geist') &&
    !f.toLowerCase().includes('dm') &&
    !f.toLowerCase().includes('system') &&
    !f.toLowerCase().includes('sans') &&
    !f.toLowerCase().includes('mono') &&
    !f.toLowerCase().includes('serif') &&
    !f.toLowerCase().includes('helvetica') &&
    !f.toLowerCase().includes('arial') &&
    !f.toLowerCase().includes('courier')
  );
  if (unexpectedFonts.length > 0) {
    console.log('Unexpected fonts:', unexpectedFonts);
    bug('minor','design','Unexpected fonts detected (non-Geist, non-DM)',
      '/','Check computed fontFamily on elements',
      'Only Geist Sans + Geist Mono used',
      `Found: ${unexpectedFonts.map(([f])=>f).join(', ')}`
    );
  }
  
  // ═══ FINAL SCREENSHOT ════════════════════════════════════════════════════
  await shot(page, '15-final');
  await page.screenshot({ path: '/tmp/audit-15b-full.png', fullPage: true });
  shots.push('/tmp/audit-15b-full.png');
  
  // ═══ REPORT ══════════════════════════════════════════════════════════════
  console.log('\n=== CONSOLE ERRORS ===');
  console.log(`Count: ${consoleErrors.length}`);
  consoleErrors.slice(0,15).forEach(e => console.log(`  ${e.substring(0,200)}`));
  
  console.log('\n=== NETWORK ERRORS ===');
  console.log(`Count: ${networkErrors.length}`);
  networkErrors.slice(0,20).forEach(e => console.log(`  ${e}`));
  
  const results = { bugs, consoleErrors, networkErrors, screenshots: shots };
  fs.writeFileSync('/tmp/audit-results.json', JSON.stringify(results, null, 2));
  
  console.log('\n=== BUG SUMMARY ===');
  console.log(`TOTAL: ${bugs.length}`);
  bugs.forEach((b,i) => console.log(`  ${i+1}. [${b.severity.toUpperCase()}] ${b.category}: ${b.desc}`));
  
  expect(true).toBe(true);
});
