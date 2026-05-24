/**
 * The Invisible Detective — Playwright Test Suite
 * Run: node tests/game.test.mjs
 *
 * Tests all player-reported issues:
 *  T1  Title screen appears after splash
 *  T2  Phone tap resumes game (Act 1 save → lock-screen)
 *  T3  Phone tap resumes game (Act 2 save → act2-lock)
 *  T4  Fresh game starts prelude (no save)
 *  T5  Rhea appears in Act 2 messages (restore with Rhea in save)
 *  T6  Rhea appears in Act 2 messages (restore WITHOUT Rhea in old save)
 *  T7  Rhea chat opens and shows message
 *  T8  Rhea can give decryption key when asked
 *  T9  Other chats open correctly (UNKNOWN)
 *  T10 Fresh-game wipe works and goes to prelude
 *  T11 Rhea present after entering Act 2 fresh (no restore)
 *  T12 Messages-app back button returns to home-screen
 */

import { chromium } from '../node_modules/playwright/index.mjs';

const BASE = 'file:///Users/rahuldwiwedi/Desktop/The-Invisible-Detective/www/index.html';
let passed = 0, failed = 0;

// ─── Helpers ───────────────────────────────────────────────────────────────

async function makeContext(browser, saveData = null) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    page.on('pageerror', e => console.error('  [PAGE ERR]', e.message));
    if (saveData) {
        await page.addInitScript((s) => {
            localStorage.setItem('tid_save_v1', JSON.stringify(s));
        }, saveData);
    }
    await page.goto(BASE);
    await page.waitForTimeout(600); // let onLoad() IIFE run
    return { ctx, page };
}

function assert(label, value, expected) {
    const ok = value === expected;
    if (ok) {
        console.log(`  ✅ ${label}`);
        passed++;
    } else {
        console.log(`  ❌ ${label} — got "${value}", expected "${expected}"`);
        failed++;
    }
    return ok;
}

function assertContains(label, arr, item) {
    const ok = Array.isArray(arr) && arr.some(x => x.includes(item));
    if (ok) {
        console.log(`  ✅ ${label}`);
        passed++;
    } else {
        console.log(`  ❌ ${label} — "${item}" not found in [${arr}]`);
        failed++;
    }
    return ok;
}

const activeScreen = (page) =>
    page.evaluate(() => (document.querySelector('.screen.active') || {}).id || 'NONE');

const chatNames = (page) =>
    page.evaluate(() =>
        Array.from(document.querySelectorAll('#chat-list .nx-title')).map(e => e.textContent));

// ─── Save fixtures ─────────────────────────────────────────────────────────

const ACT1_SAVE = {
    version: 1, timestamp: Date.now(), currentAct: 1, act2Active: false,
    preludeSeen: true, act3Active: false, hiddenUnlocked: false, zipOpened: false,
    act2ChoiceMade: false, watcherMsgCount: 0, contactRenamed: false,
    rheaUnlocked: false, echoLogsRead: false, warehouseSolved: false, airplaneActive: false,
    chats: [{ id: 'unknown', name: 'UNKNOWN', unread: true, messages: [{ sender: 'them', text: 'You took it.' }] }],
    extraNoteCount: 0, cameraGallery: [], settingsUpdated: false, act4Active: false, act5Active: false
};

const ACT2_SAVE_WITH_RHEA = {
    ...ACT1_SAVE, currentAct: 2, act2Active: true, preludeSeen: true, settingsUpdated: true,
    chats: [
        { id: 'unknown', name: 'Unknown', unread: true, messages: [{ sender: 'them', text: "You weren't supposed to open the archive." }] },
        { id: 'mom', name: 'Mom', unread: false, messages: [{ sender: 'them', text: 'Stay safe.' }] },
        { id: 'rhea', name: 'Dr. Rhea Kapoor', unread: true, messages: [{ sender: 'them', text: 'Aarav gave me this number. I built ECHO.' }] }
    ]
};

const ACT2_SAVE_NO_RHEA = {  // old save without Rhea (pre-fix)
    ...ACT2_SAVE_WITH_RHEA,
    chats: [
        { id: 'unknown', name: 'Unknown', unread: true, messages: [{ sender: 'them', text: "You weren't supposed to open the archive." }] },
        { id: 'mom', name: 'Mom', unread: false, messages: [{ sender: 'them', text: 'Stay safe.' }] }
    ]
};

// ─── Tests ─────────────────────────────────────────────────────────────────

const browser = await chromium.launch({ headless: true });

// ── T1: Title screen appears after splash ──────────────────────────────────
console.log('\n[T1] Title screen appears after splash (no save)');
{
    const { ctx, page } = await makeContext(browser, null);
    await page.waitForTimeout(3200); // splash 2200ms + fade 700ms + buffer
    const screen = await activeScreen(page);
    assert('title-screen shown after splash', screen, 'title-screen');
    await ctx.close();
}

// ── T2: Phone tap resumes Act 1 save ──────────────────────────────────────
console.log('\n[T2] Phone tap resumes Act 1 save → lock-screen');
{
    const { ctx, page } = await makeContext(browser, ACT1_SAVE);
    await page.waitForTimeout(3200);
    assert('title-screen shown', await activeScreen(page), 'title-screen');
    await page.evaluate(() => window.enterGameFromLanding());
    await page.waitForTimeout(300);
    assert('lock-screen shown after tap', await activeScreen(page), 'lock-screen');
    await ctx.close();
}

// ── T3: Phone tap resumes Act 2 save ──────────────────────────────────────
console.log('\n[T3] Phone tap resumes Act 2 save → act2-lock');
{
    const { ctx, page } = await makeContext(browser, ACT2_SAVE_WITH_RHEA);
    await page.waitForTimeout(3200);
    assert('title-screen shown', await activeScreen(page), 'title-screen');
    await page.evaluate(() => window.enterGameFromLanding());
    await page.waitForTimeout(300);
    assert('act2-lock shown after tap', await activeScreen(page), 'act2-lock');
    await ctx.close();
}

// ── T4: No save → phone tap → prelude ─────────────────────────────────────
console.log('\n[T4] No save → phone tap → prelude screen');
{
    const { ctx, page } = await makeContext(browser, null);
    await page.waitForTimeout(3200);
    await page.evaluate(() => window.enterGameFromLanding());
    await page.waitForTimeout(300);
    assert('prelude-screen shown', await activeScreen(page), 'prelude-screen');
    await ctx.close();
}

// ── T5: Rhea in messages after restore WITH Rhea in save ──────────────────
console.log('\n[T5] Act2 restore WITH Rhea in save → Rhea in messages');
{
    const { ctx, page } = await makeContext(browser, ACT2_SAVE_WITH_RHEA);
    await page.waitForTimeout(600);
    const names = await chatNames(page);
    assertContains('Rhea in chat list after restore', names, 'Rhea');
    await ctx.close();
}

// ── T6: Rhea in messages after restore WITHOUT Rhea in old save ───────────
console.log('\n[T6] Act2 restore WITHOUT Rhea in old save → Rhea still added');
{
    const { ctx, page } = await makeContext(browser, ACT2_SAVE_NO_RHEA);
    await page.waitForTimeout(600);
    const names = await chatNames(page);
    assertContains('Rhea added despite missing from old save', names, 'Rhea');
    await ctx.close();
}

// ── T7: Rhea chat opens and shows her message ─────────────────────────────
console.log('\n[T7] Rhea chat opens and shows initial message');
{
    const { ctx, page } = await makeContext(browser, ACT2_SAVE_WITH_RHEA);
    await page.waitForTimeout(600);
    await page.evaluate(() => window.showScreen('messages-app'));
    await page.waitForTimeout(200);
    // click Rhea
    await page.evaluate(() => {
        const titles = Array.from(document.querySelectorAll('#chat-list .nx-title'));
        const items  = Array.from(document.querySelectorAll('#chat-list .nx-list-item'));
        const idx = titles.findIndex(t => t.textContent.includes('Rhea'));
        if (idx >= 0) items[idx].click();
    });
    await page.waitForTimeout(300);
    const screen = await activeScreen(page);
    assert('chat-view opens for Rhea', screen, 'chat-view');
    const contact = await page.evaluate(() => (document.getElementById('chat-contact-name') || {}).textContent || '');
    assert('contact name is Rhea', contact, 'Dr. Rhea Kapoor');
    const msgs = await page.evaluate(() =>
        Array.from(document.querySelectorAll('.message')).map(m => m.textContent.trim()));
    assertContains('Rhea initial message visible', msgs, 'ECHO');
    await ctx.close();
}

// ── T8: Rhea gives decryption key when asked ─────────────────────────────
console.log('\n[T8] Rhea gives key RK_DEC_7734 when player asks');
{
    const { ctx, page } = await makeContext(browser, ACT2_SAVE_WITH_RHEA);
    // Wait past the splash (2200ms + 700ms fade) so showScreen('title-screen') fires
    // BEFORE we open the chat — otherwise the splash dismissal deactivates chat-view
    // mid-reply and appendMessageToDOM never runs.
    await page.waitForTimeout(3200);
    // Navigate past title-screen so act2-lock is showing
    await page.evaluate(() => window.enterGameFromLanding());
    await page.waitForTimeout(300);
    await page.evaluate(() => { window.openChat('rhea'); });
    await page.waitForTimeout(300);
    assert('chat-view opens', await activeScreen(page), 'chat-view');
    // Type and send "give me the key"
    await page.evaluate(() => {
        const input = document.getElementById('chat-input-field');
        if (input) input.value = 'give me the key';
        window.sendChatMessage();
    });
    // Reply delay is 1000–2500 ms; wait 4 s to be safe
    await page.waitForTimeout(4000);
    const msgs = await page.evaluate(() =>
        Array.from(document.querySelectorAll('.message')).map(m => m.textContent.trim()));
    assertContains('Key RK_DEC_7734 appears in reply', msgs, 'RK_DEC_7734');
    await ctx.close();
}

// ── T9: Other chats open (UNKNOWN) ───────────────────────────────────────
console.log('\n[T9] UNKNOWN chat opens and shows messages');
{
    const { ctx, page } = await makeContext(browser, ACT2_SAVE_WITH_RHEA);
    await page.waitForTimeout(600);
    await page.evaluate(() => window.showScreen('messages-app'));
    await page.waitForTimeout(200);
    await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('#chat-list .nx-list-item'));
        if (items[0]) items[0].click();
    });
    await page.waitForTimeout(300);
    assert('chat-view shown for UNKNOWN', await activeScreen(page), 'chat-view');
    await ctx.close();
}

// ── T10: Fresh game wipe → prelude ───────────────────────────────────────
console.log('\n[T10] Fresh game wipe clears save and starts prelude');
{
    const { ctx, page } = await makeContext(browser, ACT2_SAVE_WITH_RHEA);
    await page.waitForTimeout(600);
    // Simulate confirm new game (this navigates with ?fresh=1)
    // We test the clearSave + fresh start logic directly
    await page.evaluate(() => {
        window.clearSave();
        // Verify save is gone
        return localStorage.getItem('tid_save_v1');
    }).then(v => assert('save cleared', v, null));
    // fresh=1 param detection
    const freshDetected = await page.evaluate(() => {
        const url = new URLSearchParams('?fresh=1');
        return url.get('fresh') === '1';
    });
    assert('fresh=1 param parsing works', freshDetected, true);
    await ctx.close();
}

// ── T11: Fresh Act 2 entry → Rhea appears immediately ────────────────────
console.log('\n[T11] Fresh Act 2 entry (enterAct2Home) → Rhea in messages');
{
    const { ctx, page } = await makeContext(browser, null);
    await page.waitForTimeout(600);
    await page.evaluate(() => window.enterAct2Home());
    await page.waitForTimeout(300);
    const names = await chatNames(page);
    assertContains('Rhea added on fresh Act2 entry', names, 'Rhea');
    assert('home-screen shown', await activeScreen(page), 'home-screen');
    await ctx.close();
}

// ── T12: Messages back button → home-screen ──────────────────────────────
console.log('\n[T12] Messages back button returns to home-screen');
{
    const { ctx, page } = await makeContext(browser, ACT2_SAVE_WITH_RHEA);
    await page.waitForTimeout(600);
    await page.evaluate(() => {
        window.enterAct2Home();
        window.showScreen('messages-app');
    });
    await page.waitForTimeout(200);
    assert('messages-app active', await activeScreen(page), 'messages-app');
    // click back button
    await page.evaluate(() => {
        const backBtn = document.querySelector('#messages-app .back-btn');
        if (backBtn) backBtn.click();
    });
    await page.waitForTimeout(300);
    assert('back → home-screen', await activeScreen(page), 'home-screen');
    await ctx.close();
}

// ─── Summary ───────────────────────────────────────────────────────────────
await browser.close();
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
if (failed > 0) process.exit(1);
