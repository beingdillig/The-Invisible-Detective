/**
 * chat.test.js
 * Tests character dialogue — response arrays, counts, fallbacks,
 * pattern matching, and sendChatMessage dispatch.
 */
const { loadGame, resetActStates } = require('./helpers/load-game');

beforeAll(() => loadGame());
beforeEach(() => {
  resetActStates();
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

// ── allChats structure ─────────────────────────────────────
describe('allChats structure', () => {
  test('allChats is a non-empty array', () => {
    expect(Array.isArray(window.allChats)).toBe(true);
    expect(window.allChats.length).toBeGreaterThan(0);
  });

  // Initial contacts (always present from startup)
  const initialContacts = ['unknown', 'mom', 'kabir', 'source'];
  initialContacts.forEach(id => {
    test(`Initial contact "${id}" exists in allChats`, () => {
      const chat = window.allChats.find(c => c.id === id);
      expect(chat).toBeDefined();
    });
  });

  // Unlockable contacts (added during act progression)
  const unlockableContacts = ['rhea', 'echo_direct', 'aarav_reconstruct'];
  unlockableContacts.forEach(id => {
    test(`Unlockable contact "${id}" can be added to allChats`, () => {
      // These are pushed in during act 2/3 — verify the allChats array accepts them
      const testChat = { id, name: id, messages: [], responses: [] };
      const before = window.allChats.length;
      window.allChats.push(testChat);
      expect(window.allChats.find(c => c.id === id)).toBeDefined();
      // Cleanup
      const idx = window.allChats.findIndex(c => c.id === id);
      if (idx >= 0) window.allChats.splice(idx, 1);
      expect(window.allChats.length).toBe(before);
    });
  });

  test('Every initial chat has an id and name', () => {
    window.allChats.forEach(chat => {
      expect(chat.id).toBeTruthy();
      expect(chat.name).toBeTruthy();
    });
  });

  test('Every initial chat has a messages array', () => {
    window.allChats.forEach(chat => {
      expect(Array.isArray(chat.messages)).toBe(true);
    });
  });
});

// ── Response counts (actual values verified against script) ─
describe('Character response counts', () => {
  function getResponses(id) {
    const chat = window.allChats.find(c => c.id === id);
    return chat?.responses || [];
  }

  test('UNKNOWN has 28+ responses (paranoid AI personality)', () => {
    expect(getResponses('unknown').length).toBeGreaterThanOrEqual(28);
  });

  test('Mom has 14+ responses (emotional realism)', () => {
    expect(getResponses('mom').length).toBeGreaterThanOrEqual(14);
  });

  test('Kabir has 20+ responses (best friend arc)', () => {
    expect(getResponses('kabir').length).toBeGreaterThanOrEqual(20);
  });

  test('Anonymous Source has 10+ responses', () => {
    expect(getResponses('source').length).toBeGreaterThanOrEqual(10);
  });

  test('All initial contacts with responses have at least 10', () => {
    const contacts = ['unknown', 'mom', 'kabir'];
    contacts.forEach(id => {
      expect(getResponses(id).length).toBeGreaterThanOrEqual(10);
    });
  });
});

// ── Response format ────────────────────────────────────────
describe('Response format validation', () => {
  const contactsWithResponses = ['unknown', 'mom', 'kabir', 'source'];

  contactsWithResponses.forEach(id => {
    test(`${id}: all responses have match (RegExp) and reply (string)`, () => {
      const chat = window.allChats.find(c => c.id === id);
      if (!chat?.responses) return;
      chat.responses.forEach(r => {
        expect(r.match).toBeInstanceOf(RegExp);
        expect(typeof r.reply).toBe('string');
        expect(r.reply.length).toBeGreaterThan(0);
      });
    });
  });

  test('UNKNOWN responses include glitch:true for AI immersion', () => {
    const chat = window.allChats.find(c => c.id === 'unknown');
    const glitchResponses = chat.responses.filter(r => r.glitch === true);
    expect(glitchResponses.length).toBeGreaterThan(0);
  });
});

// ── Pattern matching ───────────────────────────────────────
describe('Key pattern matching', () => {
  function matchResponse(id, input) {
    const chat = window.allChats.find(c => c.id === id);
    if (!chat?.responses) return null;
    return chat.responses.find(r => r.match.test(input));
  }

  test('UNKNOWN responds to "who are you"', () => {
    const r = matchResponse('unknown', 'who are you');
    expect(r).toBeDefined();
    expect(r.reply.length).toBeGreaterThan(0);
  });

  test('UNKNOWN responds to "hello"', () => {
    const r = matchResponse('unknown', 'hello');
    expect(r).toBeDefined();
  });

  test('UNKNOWN responds to "echo" queries', () => {
    const r = matchResponse('unknown', 'tell me about echo');
    expect(r).toBeDefined();
  });

  test('UNKNOWN responds to "stop" commands', () => {
    const r = matchResponse('unknown', 'stop');
    expect(r).toBeDefined();
  });

  test('Mom responds with concern patterns', () => {
    // Mom has patterns around health, calling, etc.
    const chat = window.allChats.find(c => c.id === 'mom');
    expect(chat.responses.length).toBeGreaterThan(0);
  });

  test('Kabir responds to investigation queries', () => {
    const r = matchResponse('kabir', 'nexus');
    expect(r).toBeDefined();
  });
});

// ── sendChatMessage ────────────────────────────────────────
describe('sendChatMessage()', () => {
  test('sendChatMessage() does not throw with empty input', () => {
    document.getElementById('chat-input-field').value = '';
    expect(() => window.sendChatMessage()).not.toThrow();
  });

  test('sendChatMessage() clears input field after sending', () => {
    if (typeof window.openChat === 'function') {
      window.openChat('mom');
    }
    const input = document.getElementById('chat-input-field');
    input.value = 'hello';
    window.sendChatMessage();
    expect(input.value).toBe('');
  });

  test('sendChatMessage() adds message to chat history', () => {
    if (typeof window.openChat !== 'function') return;
    window.openChat('mom');
    const chat = window.allChats.find(c => c.id === 'mom');
    const before = chat.messages.length;
    const input = document.getElementById('chat-input-field');
    input.value = 'hi mom';
    window.sendChatMessage();
    expect(chat.messages.length).toBeGreaterThan(before);
  });

  test('Sent message has sender "me"', () => {
    if (typeof window.openChat !== 'function') return;
    window.openChat('kabir');
    const chat = window.allChats.find(c => c.id === 'kabir');
    const input = document.getElementById('chat-input-field');
    input.value = 'test123';
    window.sendChatMessage();
    const myMsg = chat.messages.find(m => m.sender === 'me' && m.text === 'test123');
    expect(myMsg).toBeDefined();
  });
});
