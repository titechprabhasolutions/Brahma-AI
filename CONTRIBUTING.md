# Contributing to Brahma AI

Thanks for your interest in contributing.

## Setup

1. Install Node.js 18+ and Python 3.10+
2. Install dependencies:

```bash
npm install
python -m pip install -r requirements.txt
```

3. Copy and fill API keys:

```bash
copy config\\api_keys.example.json config\\api_keys.json
```

## Development

Run locally:

```bash
npm start
```

## Pull Requests

- Keep changes focused and well described
- Update documentation if behavior changes
- Avoid committing build artifacts (`dist/`, `release/`, `bk/`, `*.exe`)

## Code Style

- Prefer clear, explicit naming
- Avoid large refactors in unrelated PRs
