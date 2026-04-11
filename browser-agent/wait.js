export class WaitEngine {
  constructor(page) {
    this.page = page;
  }

  async waitForSelector(selector, timeout = 10000) {
    return this.page.waitForSelector(selector, { timeout });
  }

  async waitForText(text, timeout = 10000) {
    return this.page.waitForFunction(
      (needle) => document.body && document.body.innerText.includes(needle),
      text,
      { timeout }
    );
  }

  async waitForURL(pattern, timeout = 10000) {
    return this.page.waitForURL(pattern, { timeout });
  }

  async waitForLoadState(state = 'domcontentloaded', timeout = 15000) {
    return this.page.waitForLoadState(state, { timeout });
  }
}
