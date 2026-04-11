import readline from 'node:readline';
import { BrowserController } from './browser.js';
import { MemoryStore } from './memory.js';
import { ActionEngine } from './actions.js';
import { BrowserAgent } from './agent.js';
import { ProfileManager } from './profiles.js';
import { Logger } from './logger.js';

const allowlist = (process.env.BRAHMA_BROWSER_ALLOWLIST || 'google.com,youtube.com,discord.com')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const logger = new Logger({ debug: false });
const memory = new MemoryStore();
const profiles = new ProfileManager({ logger });
const browser = new BrowserController(profiles, { logger });
const actions = new ActionEngine(browser, memory, allowlist, logger);
const agent = new BrowserAgent(browser, memory, actions, logger, allowlist);

let ready = false;

async function ensureReady(profile = 'brahma') {
  if (ready) return;
  await browser.launch({ headless: false, userDataDir: './profiles/brahma', profile });
  ready = true;
}

async function handleCommand(message) {
  await ensureReady(message.profile || 'brahma');
  const text = String(message.text || '').trim();
  const result = await agent.processUserCommand(text);
  const activePage = browser.getActivePage();
  let url = '';
  try {
    url = activePage.url();
  } catch {
    url = '';
  }
  const tabs = await browser.listTabs();
  memory.updateTabs(tabs, browser.activePageId);
  return {
    ok: true,
    plan: result.plan,
    results: result.results,
    url,
    tabs,
    snapshot: memory.lastSnapshot,
  };
}

async function handleSnapshot() {
  await ensureReady();
  const snapshot = await agent.getPageSnapshot();
  return { ok: true, snapshot };
}

async function handleTabs() {
  await ensureReady();
  const tabs = await browser.listTabs();
  return { ok: true, tabs };
}

async function handleClose() {
  await browser.close();
  ready = false;
  return { ok: true };
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });

rl.on('line', async (line) => {
  let payload = null;
  try {
    payload = JSON.parse(line);
  } catch {
    process.stdout.write(JSON.stringify({ ok: false, error: 'invalid_json' }) + '\n');
    return;
  }

  try {
    let response = { ok: false, error: 'unknown_command' };
    if (payload.type === 'command') {
      response = await handleCommand(payload);
    } else if (payload.type === 'snapshot') {
      response = await handleSnapshot();
    } else if (payload.type === 'tabs') {
      response = await handleTabs();
    } else if (payload.type === 'close') {
      response = await handleClose();
    }
    process.stdout.write(JSON.stringify(response) + '\n');
  } catch (error) {
    process.stdout.write(JSON.stringify({ ok: false, error: error?.message || 'failed' }) + '\n');
  }
});
