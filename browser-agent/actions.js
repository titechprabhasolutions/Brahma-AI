import { withinAllowlist } from './utils.js';
import { SafetyEngine } from './safety.js';
import { WaitEngine } from './wait.js';

export class ActionEngine {
  constructor(browser, memory, allowlist = [], logger = null) {
    this.browser = browser;
    this.memory = memory;
    this.allowlist = allowlist;
    this.logger = logger;
    this.safety = new SafetyEngine({ allowlist });
  }

  async navigate(url) {
    if (!withinAllowlist(url, this.allowlist) || !this.safety.isAllowed(url)) {
      throw new Error(`Blocked by allowlist: ${url}`);
    }
    const target = await this.browser.openUrl(url);
    this.memory.currentPage = target;
    return target;
  }

  async click(targetId) {
    const snapshot = this.memory.lastSnapshot || [];
    const node = snapshot.find((item) => item.id === Number(targetId));
    if (!node || !node.selector) throw new Error('Target not found in snapshot.');
    const page = this.browser.getActivePage();
    const wait = new WaitEngine(page);
    await wait.waitForSelector(node.selector, 8000);
    await page.click(node.selector, { timeout: 8000 });
    return `Clicked ${node.text || node.role || node.selector}`;
  }

  async type(targetId, text) {
    const snapshot = this.memory.lastSnapshot || [];
    const node = snapshot.find((item) => item.id === Number(targetId));
    if (!node || !node.selector) throw new Error('Target not found in snapshot.');
    const page = this.browser.getActivePage();
    const wait = new WaitEngine(page);
    await wait.waitForSelector(node.selector, 8000);
    await page.fill(node.selector, '');
    await page.type(node.selector, text, { delay: 40 });
    return `Typed into ${node.placeholder || node.text || node.selector}`;
  }

  async scroll(direction = 'down') {
    const page = this.browser.getActivePage();
    const delta = direction === 'up' ? -640 : 640;
    await page.mouse.wheel(0, delta);
    return `Scrolled ${direction}`;
  }

  async goBack() {
    const page = this.browser.getActivePage();
    await page.goBack({ waitUntil: 'domcontentloaded' });
    return 'Went back';
  }

  async getCookies() {
    return this.browser.getCookies();
  }

  async setCookies(cookies) {
    await this.browser.setCookies(cookies);
    return 'Cookies updated';
  }

  async clearCookies() {
    await this.browser.clearCookies();
    return 'Cookies cleared';
  }

  async getStorage() {
    return this.browser.getStorage();
  }

  async setStorage(payload) {
    await this.browser.setStorage(payload);
    return 'Storage updated';
  }

  async clearStorage() {
    await this.browser.clearStorage();
    return 'Storage cleared';
  }
}
