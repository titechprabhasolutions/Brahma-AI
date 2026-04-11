import { BrowserController } from './browser.js';
import { MemoryStore } from './memory.js';
import { ActionEngine } from './actions.js';
import { BrowserAgent } from './agent.js';
import { ProfileManager } from './profiles.js';
import { Logger } from './logger.js';

const allowlist = ['google.com', 'youtube.com', 'discord.com'];
const logger = new Logger({ debug: true });
const memory = new MemoryStore();
const profiles = new ProfileManager({ logger });
const browser = new BrowserController(profiles, { logger });
const actions = new ActionEngine(browser, memory, allowlist, logger);
const agent = new BrowserAgent(browser, memory, actions, logger, allowlist);

async function run() {
  await browser.launch({ headless: false, userDataDir: './profiles/brahma' });
  console.log('Browser agent ready.');
  const sampleCommands = [
    'open youtube',
    'search youtube for AI tools',
    'open first result',
  ];

  for (const command of sampleCommands) {
    console.log(`\n> ${command}`);
    const { plan, results } = await agent.processUserCommand(command);
    console.log('Plan:', plan);
    console.log('Results:', results);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
