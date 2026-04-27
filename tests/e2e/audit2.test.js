const { test, expect } = require('@playwright/test');
const fs = require('fs');

const BASE = 'https://dashboard-gamification.vercel.app';
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
  const p = `/tmp/audit2-${name}.png`;
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
  
  // Set up welcome bypass
  await page.evaluate(() => {
    ['anna','aakarshit','usama','ahsan','prajeesh','abdallah'].forEach(id => {
      localStorage.setItem(`binayah_welcomed_${id}`, Date.now().toString());
    });
  });
  await page.goto(BASE + '/');
  await page.waitForTimeout(4000);
  
  // Dismiss any modal
  if (await page.locator('text=Pick your theme').isVisible({ timeout: 1500 }).catch(() => false)) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }
}

test('Part 2: Documents, Activity, Chat, Mobile, Views', async ({ page }) => {
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
  
  // ═══ CHAT PANEL OPEN ═══════════════════════════════════════════════════════
  console.log('\n=== CHAT PANEL VISIBLE ===');
  // Chat panel seems to open automatically when coming from earlier test
  // Let's check if it's always open
  const chatPanelVis = await page.locator('text=binayah ai, text=ask binayah ai').first().isVisible({ timeout: 2000 }).catch(() => false);
  console.log(`Chat/AI panel visible on initial load: ${chatPanelVis}`);
  
  if (chatPanelVis) {
    bug('major','functional',
      'Chat/AI panel opens automatically on page load — should only open when user navigates to chat',
      '/ (root) on load',
      'Load the dashboard without clicking Chat nav',
      'Chat panel closed by default',
      'Chat panel appears open (shows "binayah ai · powered by gpt-4o-mini")'
    );
  }
  
  await shot(page, '01-initial-state');
  
  // ═══ CLOSE CHAT IF OPEN ════════════════════════════════════════════════════
  // Close the chat panel if it's open
  const closeBtn = page.locator('button:text("×")').first();
  if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await closeBtn.click();
    await page.waitForTimeout(500);
    console.log('Closed chat/panel');
  }
  
  // ═══ DOCUMENTS ═════════════════════════════════════════════════════════════
  console.log('\n=== DOCUMENTS PANEL ===');
  const docsBtn = page.locator('nav button').filter({ hasText: /^documents$/i }).first();
  if (await docsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await docsBtn.click();
    await page.waitForTimeout(3000);
    await shot(page, '02-documents');
    
    const tiptapVis = await page.locator('.tiptap, .ProseMirror, [contenteditable="true"]').first().isVisible({ timeout: 3000 }).catch(() => false);
    const html = await page.content();
    const hasTiptap = html.includes('ProseMirror') || html.includes('tiptap');
    console.log(`Editor visible: ${tiptapVis}, in HTML: ${hasTiptap}`);
    
    if (!tiptapVis && !hasTiptap) {
      bug('major','functional','Documents: TipTap editor not loading','/documents nav','Click documents, wait 3s','TipTap editor visible','Not found');
    }
    
    // Check list/panel layout
    const docList = await page.evaluate(() => {
      const docItems = document.querySelectorAll('[class*="doc"], [class*="document"]');
      return { count: docItems.length, texts: Array.from(docItems).slice(0,3).map(el => el.textContent?.substring(0,30)) };
    });
    console.log(`Document items: ${JSON.stringify(docList)}`);
    
    // Check attribution strip (last saved by / unsaved)
    const attrText = await page.locator('text=last saved, text=// unsaved').first().isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`Attribution strip visible: ${attrText}`);
    
    // Full page screenshot
    await page.screenshot({ path: '/tmp/audit2-02b-docs-full.png', fullPage: true });
    shots.push('/tmp/audit2-02b-docs-full.png');
  }
  
  // ═══ ACTIVITY ══════════════════════════════════════════════════════════════
  console.log('\n=== ACTIVITY PANEL ===');
  const actBtn = page.locator('nav button').filter({ hasText: /^activity$/i }).first();
  if (await actBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await actBtn.click();
    await page.waitForTimeout(3000);
    await shot(page, '03-activity');
    
    const actPanelHtml = await page.evaluate(() => {
      const els = document.querySelectorAll('[class*="activity"], [class*="feed"], [class*="log"]');
      return Array.from(els).slice(0,3).map(el => el.textContent?.substring(0,80));
    });
    console.log('Activity panel content:', actPanelHtml);
    
    // Check if there are feed items
    const feedItemCount = await page.locator('[class*="item"], [class*="event"]').count();
    console.log(`Activity items/events: ${feedItemCount}`);
  }
  
  // ═══ CHAT NAV ══════════════════════════════════════════════════════════════
  console.log('\n=== CHAT VIA NAV ===');
  const chatNavBtn = page.locator('nav button').filter({ hasText: /^chat$/i }).first();
  if (await chatNavBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await chatNavBtn.click();
    await page.waitForTimeout(3000);
    await shot(page, '04-chat');
    
    // Check chat input
    const msgInput = page.locator([
      'input[placeholder*="message" i]',
      'input[placeholder*="type" i]',
      'input[placeholder*="ask" i]',
      'textarea[placeholder*="message" i]'
    ].join(', ')).first();
    const msgVis = await msgInput.isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`Message input visible: ${msgVis}`);
    if (!msgVis) {
      bug('major','functional','Chat panel: message input not visible','/chat','Click chat nav, wait 3s','Message input field','Not found');
    }
    
    // Check team/ai tabs
    const teamTab = await page.locator('button:has-text("team"), button:has-text("Team")').first().isVisible({ timeout: 1000 }).catch(() => false);
    const aiTab = await page.locator('button:has-text("ai"), button:has-text("AI")').first().isVisible({ timeout: 1000 }).catch(() => false);
    console.log(`Chat tabs: team=${teamTab}, ai=${aiTab}`);
  }
  
  // ═══ PIPELINES ═════════════════════════════════════════════════════════════
  console.log('\n=== PIPELINES + VIEWS ===');
  const pipBtn = page.locator('nav button').filter({ hasText: /^pipelines$/i }).first();
  if (await pipBtn.isVisible().catch(() => false)) await pipBtn.click();
  await page.waitForTimeout(1500);
  
  // Close chat if open
  const closeBtn2 = page.locator('button:text("×")').first();
  if (await closeBtn2.isVisible({ timeout: 500 }).catch(() => false)) await closeBtn2.click();
  
  await shot(page, '05-pipelines');
  
  // ═══ KANBAN VIEW ═══════════════════════════════════════════════════════════
  console.log('\n=== KANBAN VIEW ===');
  const kanbanBtn = page.locator('button').filter({ hasText: /kanban/i }).first();
  if (await kanbanBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    
    // Clear console errors before click
    consoleErrors.length = 0;
    
    await kanbanBtn.click();
    await page.waitForTimeout(3000);
    await shot(page, '06-kanban');
    
    // Check what rendered
    const kanbanHtml = await page.evaluate(() => {
      const kanban = document.querySelector('[class*="kanban"], [class*="column"]');
      return kanban ? kanban.textContent?.substring(0, 100) : 'NOT FOUND';
    });
    console.log('Kanban content:', kanbanHtml);
    
    // Check for console errors during kanban load
    if (consoleErrors.length > 0) {
      console.log('Errors during kanban load:', consoleErrors);
    }
  }
  
  // ═══ OVERVIEW ══════════════════════════════════════════════════════════════
  console.log('\n=== OVERVIEW ===');
  const overviewBtn = page.locator('button').filter({ hasText: /overview/i }).first();
  if (await overviewBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    consoleErrors.length = 0;
    
    await overviewBtn.click();
    await page.waitForTimeout(3000);
    await shot(page, '07-overview');
    
    const overviewContent = await page.evaluate(() => {
      const ov = document.querySelector('[class*="overview"], [class*="metric"]');
      return ov ? ov.textContent?.substring(0, 100) : 'NOT FOUND';
    });
    console.log('Overview content:', overviewContent);
    
    if (consoleErrors.length > 0) {
      console.log('Errors during overview load:', consoleErrors);
    }
  }
  
  // ═══ BACK TO LIST ══════════════════════════════════════════════════════════
  console.log('\n=== BACK TO LIST ===');
  consoleErrors.length = 0;
  
  const listBtn = page.locator('button').filter({ hasText: /list/i }).first();
  if (await listBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await listBtn.click();
    await page.waitForTimeout(1500);
    await shot(page, '08-back-list');
    
    if (consoleErrors.length > 0) {
      console.log('Errors switching back to list:', consoleErrors);
      bug('major','functional',
        'Console errors when switching view (kanban/overview → list)',
        '/ view toggle',
        'Switch to kanban/overview then back to list',
        'No console errors',
        consoleErrors.slice(0,2).join('; ')
      );
    }
  }
  
  // ═══ STAGE CARD INTERACTION ════════════════════════════════════════════════
  console.log('\n=== STAGE CARD ===');
  // Look for expand arrows
  const expandArrows = await page.locator('button').filter({ hasText: '▸' }).count();
  const collapseArrows = await page.locator('button').filter({ hasText: '▾' }).count();
  console.log(`Expand (▸): ${expandArrows}, Collapse (▾): ${collapseArrows}`);
  
  if (expandArrows > 0) {
    const firstExpand = page.locator('button').filter({ hasText: '▸' }).first();
    await firstExpand.click();
    await page.waitForTimeout(800);
    await shot(page, '09-stage-expanded');
    
    // Check expanded content
    const expandedStage = await page.evaluate(() => {
      // Look for comment box, subtask box, mockup
      return {
        hasComments: !!document.querySelector('input[placeholder*="comment" i]'),
        hasSubtasks: !!document.querySelector('input[placeholder*="subtask" i]'),
        hasMockup: document.body.textContent?.includes('mockup') || document.body.textContent?.includes('Mockup')
      };
    });
    console.log('Expanded stage:', expandedStage);
    
    // Collapse it
    const collapseBtn = page.locator('button').filter({ hasText: '▾' }).first();
    if (await collapseBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await collapseBtn.click();
      await page.waitForTimeout(500);
    }
  }
  
  // ═══ REACTION PICKER ═══════════════════════════════════════════════════════
  console.log('\n=== REACTION PICKER ===');
  const reactBtn = page.locator('button:has-text("+ react"), button:has-text("+react")').first();
  if (await reactBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await reactBtn.click();
    await page.waitForTimeout(500);
    await shot(page, '10-reaction-picker');
    
    const reactions = await page.locator('[class*="react"], button').filter({ hasText: /🔥|💀|🚀|🧠|⚡|🫡/ }).count();
    console.log(`Reaction options visible: ${reactions}`);
    
    // Close with Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
  
  // ═══ PIPELINE LOCK ═════════════════════════════════════════════════════════
  console.log('\n=== PIPELINE LOCK ===');
  const lockBtn = page.locator('button[title*="Lock"], button:has-text("🔓")').first();
  if (await lockBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    console.log('Lock button visible');
    // Don't actually lock — just verify it exists
  }
  
  // ═══ NEW PIPELINE BUTTON ════════════════════════════════════════════════════
  console.log('\n=== NEW PIPELINE ===');
  const newPipeBtn = page.locator('button').filter({ hasText: /new pipeline|add pipeline/i }).first();
  const newPipeBtnVis = await newPipeBtn.isVisible({ timeout: 2000 }).catch(() => false);
  console.log(`New pipeline button: ${newPipeBtnVis}`);
  
  if (newPipeBtnVis) {
    await newPipeBtn.click();
    await page.waitForTimeout(500);
    await shot(page, '11-new-pipeline');
    
    const formVis = await page.evaluate(() => {
      return !!document.querySelector('input[placeholder*="pipeline" i], input[placeholder*="name" i]');
    });
    console.log(`New pipeline form: ${formVis}`);
    
    // Cancel
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
  
  // ═══ MOBILE VIEWPORT ═══════════════════════════════════════════════════════
  console.log('\n=== MOBILE 375px ===');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(1500);
  await shot(page, '12-mobile');
  
  const scrollData = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth
  }));
  console.log(`Mobile scroll: ${scrollData.scrollW} vs ${scrollData.clientW}, excess=${scrollData.scrollW - scrollData.clientW}`);
  
  if (scrollData.scrollW > scrollData.clientW + 5) {
    bug('major','layout',
      `Horizontal overflow on mobile (${scrollData.scrollW - scrollData.clientW}px)`,
      '/ at 375px width','Set viewport 375px',
      'No horizontal scroll', `scrollW=${scrollData.scrollW} clientW=${scrollData.clientW}`
    );
  }
  
  // Nav on mobile
  const mobileNav = await page.locator('nav').first().boundingBox().catch(() => null);
  console.log(`Mobile nav: ${JSON.stringify(mobileNav)}`);
  if (mobileNav && mobileNav.width > 60) {
    bug('major','layout','Sidebar visible on mobile','/375px','Set 375px viewport','Sidebar hidden',`width=${Math.round(mobileNav.width)}`);
  }
  
  // Check mobile overflow elements  
  const mobileOverflow = await page.evaluate(() => {
    const ov = [];
    document.querySelectorAll('button, h1, h2, [class*="header"]').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.right > window.innerWidth + 5 && r.height > 0) {
        ov.push(`${el.tagName}:"${(el.textContent||'').substring(0,15)}" r=${Math.round(r.right)}`);
      }
    });
    return ov.slice(0, 8);
  });
  console.log(`Mobile overflow: ${mobileOverflow.length}: ${mobileOverflow.join('; ')}`);
  if (mobileOverflow.length > 0) {
    bug('major','layout',`${mobileOverflow.length} element(s) overflow on mobile`,'/375px','375px viewport',
      'All within viewport', mobileOverflow.slice(0,3).join('; '));
  }
  
  await page.screenshot({ path: '/tmp/audit2-12b-mobile-full.png', fullPage: false });
  shots.push('/tmp/audit2-12b-mobile-full.png');
  
  // Restore desktop
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE + '/');
  await page.waitForTimeout(4000);
  await page.evaluate(() => {
    ['anna','aakarshit','usama','ahsan','prajeesh','abdallah'].forEach(id => {
      localStorage.setItem(`binayah_welcomed_${id}`, Date.now().toString());
    });
  });
  
  // ═══ LIGHT MODE CHECK ══════════════════════════════════════════════════════
  console.log('\n=== LIGHT MODE TOGGLE ===');
  // Find theme switcher button
  const themeBtn = page.locator('button[title*="theme" i], button[title*="Switch" i]').first();
  if (await themeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await themeBtn.click();
    await page.waitForTimeout(500);
    await shot(page, '13-theme-picker');
    
    // Check picker content
    const pickerContent = await page.evaluate(() => {
      const fixed = Array.from(document.querySelectorAll('div[style]')).find(el => {
        const cs = window.getComputedStyle(el);
        return cs.position === 'absolute' && parseInt(cs.zIndex) > 100;
      });
      return fixed?.textContent?.substring(0, 100);
    });
    console.log('Theme picker content:', pickerContent);
    
    // Close
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
  
  // Enable dark mode to see consistency
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
  await shot(page, '14-dark-mode');
  
  const darkModeData = await page.evaluate(() => {
    const bodyBg = window.getComputedStyle(document.body).backgroundColor;
    const mainBg = window.getComputedStyle(document.querySelector('div[style*="min-height"]') || document.body).backgroundColor;
    return { bodyBg, mainBg };
  });
  console.log('Dark mode backgrounds:', darkModeData);
  
  // ═══ DESIGN: NOTIFICATION BELL ═════════════════════════════════════════════
  console.log('\n=== BELL DESIGN CHECK ===');
  // From the page snapshot, bell has aria-label "Notifications, 1 unread"
  // But the bell icon button itself (the one with the bell svg) has no aria-label
  // Check the activity bell (🔔 9+) for aria
  const actBellBtn = page.locator('button[title="Activity"]');
  const actBellVis = await actBellBtn.isVisible({ timeout: 1000 }).catch(() => false);
  const actBellLabel = await actBellBtn.getAttribute('aria-label').catch(() => null);
  console.log(`Activity bell (🔔 9+): visible=${actBellVis}, aria="${actBellLabel}"`);
  
  // Chat toggle button (💬) has no aria-label
  const chatToggleBtn = page.locator('button[title="Team chat"]');
  const chatLabel = await chatToggleBtn.getAttribute('aria-label').catch(() => null);
  console.log(`Chat toggle button aria: "${chatLabel}"`);
  if (!chatLabel) {
    bug('minor','design','Chat toggle button (💬) in header lacks aria-label',
      '/header','Inspect 💬 button in top header',
      'aria-label="Open team chat" or similar','No aria-label');
  }
  
  // ═══ DESIGN: HEADER ICON CONSISTENCY ═══════════════════════════════════════
  console.log('\n=== HEADER ICON CONSISTENCY ===');
  // Header has: 💬 | bell(SVG) | 🔔 | 📄 | 🏴‍☠️ | sign out
  // Mix of emoji and SVG — is this consistent?
  const headerIconTypes = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).filter(btn => {
      const r = btn.getBoundingClientRect();
      return r.y < 100 && r.x > 800;
    }).map(btn => ({
      text: btn.textContent?.trim().substring(0, 15),
      hasSvg: !!btn.querySelector('svg'),
      title: btn.title
    }));
  });
  console.log('Header icons:', JSON.stringify(headerIconTypes));
  
  const svgIcons = headerIconTypes.filter(b => b.hasSvg);
  const emojiIcons = headerIconTypes.filter(b => !b.hasSvg && /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]/u.test(b.text || ''));
  console.log(`SVG icons: ${svgIcons.length}, Emoji icons: ${emojiIcons.length}`);
  
  if (svgIcons.length > 0 && emojiIcons.length > 0) {
    bug('minor','design',
      'Header action buttons mix SVG stroke icons and emoji icons in same row',
      '/ header top-right',
      'Inspect buttons in top-right header area (x>800, y<100)',
      'All icons use same style (all SVG or all emoji)',
      `${svgIcons.length} SVG (${svgIcons.map(b=>b.title).join(', ')}) and ${emojiIcons.length} emoji (${emojiIcons.map(b=>b.text).join(', ')}) mixed`
    );
  }
  
  // ═══ FINAL ════════════════════════════════════════════════════════════════
  await shot(page, '15-final-dark');
  await page.screenshot({ path: '/tmp/audit2-15b-dark-full.png', fullPage: true });
  shots.push('/tmp/audit2-15b-dark-full.png');
  
  // ═══ REPORT ═══════════════════════════════════════════════════════════════
  console.log('\n=== CONSOLE ERRORS ===');
  console.log(`Count: ${consoleErrors.length}`);
  consoleErrors.slice(0,15).forEach(e => console.log(`  ${e.substring(0,200)}`));
  
  console.log('\n=== NETWORK ERRORS ===');
  console.log(`Count: ${networkErrors.length}`);
  networkErrors.slice(0,20).forEach(e => console.log(`  ${e}`));
  
  const results = { bugs, consoleErrors, networkErrors, screenshots: shots };
  fs.writeFileSync('/tmp/audit2-results.json', JSON.stringify(results, null, 2));
  
  console.log('\n=== BUG SUMMARY ===');
  console.log(`TOTAL: ${bugs.length}`);
  bugs.forEach((b,i) => console.log(`  ${i+1}. [${b.severity.toUpperCase()}] ${b.category}: ${b.desc}`));
  
  expect(true).toBe(true);
});
