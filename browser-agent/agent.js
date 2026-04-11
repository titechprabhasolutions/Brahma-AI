import { safeString } from './utils.js';
import { buildSnapshot, refreshSnapshotIfInvalid } from './snapshot.js';
import { WaitEngine } from './wait.js';

export class BrowserAgent {
  constructor(browser, memory, actionEngine, logger, allowlist = []) {
    this.browser = browser;
    this.memory = memory;
    this.actionEngine = actionEngine;
    this.logger = logger;
    this.allowlist = allowlist;
    this.maxSteps = 12;
  }

  async getPageSnapshot() {
    const page = this.browser.getActivePage();
    const snapshot = await buildSnapshot(page);
    this.memory.setSnapshot(snapshot);
    this.memory.updateTabSnapshot(this.browser.activePageId, snapshot);
    return snapshot;
  }

  async executeAction(action) {
    if (!action || !action.type) {
      throw new Error('Invalid action');
    }
    const type = action.type;
    let result = '';
    if (type === 'navigate') {
      result = await this.actionEngine.navigate(action.url);
    } else if (type === 'click') {
      result = await this.actionEngine.click(action.target);
    } else if (type === 'type') {
      result = await this.actionEngine.type(action.target, action.text || '');
    } else if (type === 'scroll') {
      result = await this.actionEngine.scroll(action.direction || 'down');
    } else if (type === 'go_back') {
      result = await this.actionEngine.goBack();
    } else if (type === 'switch_tab') {
      await this.browser.switchTab(action.tabId);
      result = `Switched to tab ${action.tabId}`;
    } else if (type === 'focus_tab') {
      await this.browser.focusTab(action.tabId);
      result = `Focused tab ${action.tabId}`;
    } else if (type === 'new_tab') {
      const tabId = await this.browser.newTab(action.url || 'about:blank');
      result = `Opened new tab ${tabId}`;
    } else if (type === 'close_tab') {
      await this.browser.closeTab(action.tabId);
      result = `Closed tab ${action.tabId}`;
    } else if (type === 'get_cookies') {
      result = await this.actionEngine.getCookies();
    } else if (type === 'set_cookies') {
      result = await this.actionEngine.setCookies(action.cookies || []);
    } else if (type === 'clear_cookies') {
      result = await this.actionEngine.clearCookies();
    } else if (type === 'get_storage') {
      result = await this.actionEngine.getStorage();
    } else if (type === 'set_storage') {
      result = await this.actionEngine.setStorage(action.payload || {});
    } else if (type === 'clear_storage') {
      result = await this.actionEngine.clearStorage();
    } else {
      throw new Error(`Unsupported action type: ${type}`);
    }
    this.memory.recordAction(action, result);
    this.memory.pushStep({ action, result });
    return result;
  }

  async processUserCommand(command) {
    const text = safeString(command, '').toLowerCase();
    if (!text) return { plan: [], results: [] };

    const plan = this._simplePlanner(text);
    const searchStep = plan.find((step) => step.type === 'type' && step.target === 'search-input');
    if (searchStep?.text) {
      this.memory.activeWorkflow = {
        intent: 'search',
        query: searchStep.text,
        ts: Date.now(),
      };
    }
    const results = [];

    let stepCount = 0;
    for (const step of plan) {
      if (stepCount > this.maxSteps) {
        results.push('Stopped: step limit reached.');
        break;
      }
      stepCount += 1;
      let snapshot = await this.getPageSnapshot();
      if (step.type === 'click' && step.target === 'first-result') {
        const candidate = snapshot.find((item) => item.role.includes('link') && item.text);
        if (candidate) step.target = candidate.id;
      }
      if (step.type === 'click' && step.target === 'channel-result') {
        const query = String(this.memory.activeWorkflow?.query || '').trim();
        const candidate = snapshot.find((item) =>
          item.role.includes('link') &&
          item.text &&
          (!query || item.text.toLowerCase().includes(query.toLowerCase()))
        );
        if (candidate) step.target = candidate.id;
      }
      if (step.type === 'click' && step.target === 'search-button') {
        const candidate = snapshot.find((item) => item.role.includes('button') && /search|go|find/i.test(item.text || ''));
        if (candidate) step.target = candidate.id;
      }
      if (step.type === 'click' && step.target === 'subscribe-button') {
        const candidate = snapshot.find((item) => item.role.includes('button') && /subscribe/i.test(item.text || ''));
        if (candidate) step.target = candidate.id;
      }
      if (step.type === 'type' && step.target === 'search-input') {
        const candidate = snapshot.find((item) =>
          item.role.includes('textbox') &&
          /search|query|find/i.test((item.placeholder || item.text || '').toLowerCase())
        );
        if (candidate) step.target = candidate.id;
      }
      const attempt = await this._executeWithRetry(step, snapshot);
      results.push(attempt);
    }

    return { plan, results };
  }

  _simplePlanner(command) {
    const steps = [];
    if (command.includes('go back')) {
      steps.push({ type: 'go_back' });
      return steps;
    }
    if (command.includes('retry last') || command.includes('retry step') || command.includes('repeat last')) {
      if (this.memory.lastAction?.action) {
        steps.push(this.memory.lastAction.action);
        return steps;
      }
    }
    if (command.includes('continue')) {
      if (this.memory.lastAction?.action) {
        steps.push(this.memory.lastAction.action);
        return steps;
      }
    }
    if (command.includes('open') || command.includes('go to') || command.includes('navigate') || command.includes('browse')) {
      const urlMatch = command.match(/(https?:\/\/[^\s]+)/i);
      if (urlMatch) {
        steps.push({ type: 'navigate', url: urlMatch[1] });
      } else if (command.includes('youtube')) {
        steps.push({ type: 'navigate', url: 'https://www.youtube.com' });
      } else if (command.includes('google')) {
        steps.push({ type: 'navigate', url: 'https://www.google.com' });
      }
    }
    if (command.includes('search') || command.includes('youtube')) {
      const stopWords = new Set([
        'browse', 'open', 'go', 'to', 'navigate', 'youtube', 'channel',
        'subscribe', 'and', 'the', 'for', 'on', 'in', 'search', 'please',
      ]);
      const tokens = command
        .split(/[^a-z0-9]+/i)
        .map((t) => t.trim())
        .filter((t) => t && !stopWords.has(t.toLowerCase()));
      const query = tokens.join(' ').trim();
      if (query) {
        steps.push({ type: 'type', target: 'search-input', text: query });
        steps.push({ type: 'click', target: 'search-button' });
      }
    }
    if (command.includes('open channel') || command.includes('open the channel')) {
      steps.push({ type: 'click', target: 'channel-result' });
    }
    if (command.includes('subscribe')) {
      steps.push({ type: 'click', target: 'subscribe-button' });
    }
    if (command.includes('open first')) {
      steps.push({ type: 'click', target: 'first-result' });
    }
    if (!steps.length) {
      steps.push({ type: 'scroll', direction: 'down' });
    }
    return steps;
  }

  async _executeWithRetry(step, snapshot) {
    const page = this.browser.getActivePage();
    const wait = new WaitEngine(page);
    let attempt = 0;
    let lastError = null;
    while (attempt < 2) {
      try {
        if (['click', 'type'].includes(step.type) && Number.isFinite(step.target)) {
          snapshot = await refreshSnapshotIfInvalid(page, snapshot, step.target);
          this.memory.setSnapshot(snapshot);
        }
        await wait.waitForLoadState('domcontentloaded', 8000);
        const result = await this.executeAction(step);
        return result;
      } catch (error) {
        lastError = error;
        this.logger?.warn(`Action failed, retrying: ${step.type}`, { error: error?.message });
        await wait.waitForLoadState('domcontentloaded', 5000);
        attempt += 1;
      }
    }
    throw lastError || new Error('Action failed');
  }
}
