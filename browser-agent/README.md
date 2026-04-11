# Browser Agent

Agentic browser automation system using Node.js + Playwright.

## Setup
1. `cd browser-agent`
2. `npm install`
3. `npm run install:playwright`

## Run
`npm start`

## Run (Server Mode)
`npm run server`

## Sample Commands
- `open youtube`
- `search youtube for AI tools`
- `open first result`

## Structure
- `main.js` - entry point
- `agent.js` - AI layer + planning
- `browser.js` - Playwright control
- `actions.js` - action execution
- `memory.js` - continuous memory
- `utils.js` - helpers
