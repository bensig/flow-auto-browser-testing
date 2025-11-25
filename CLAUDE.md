# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Web Flow Runner - A CLI tool that executes browser automation flows defined in YAML/JSON files using Playwright. Designed for testing login flows, checkout flows, and Stripe test payments.

## Build & Run Commands

```bash
# Install dependencies
npm install

# Install Playwright browser
npx playwright install chromium

# Run a flow
node run.js flows/example.yaml

# CLI options
node run.js flows/example.yaml --env=staging --headless=false --slowmo=100 --report=json
```

## Architecture

Single-file runner (`run.js`) with YAML flow definitions:

- **run.js** - CLI entry point (~330 lines). Handles argument parsing, config merging, flow loading, Playwright execution, and reporting.
- **config.json** - Environment configs (baseUrl, timeouts). Flow configs override these.
- **flows/*.yaml** - Step sequences. See `flows/stripe-checkout.yaml` for Stripe example.

### Config Precedence

`global config` → `env config` → `flow config` (later overrides earlier)

### Step Types (in executeStep switch)

| Type | Required Fields | Notes |
|------|-----------------|-------|
| `goto` | `path` or `url` | path is relative to baseUrl |
| `fill` | `selector`, `value` | |
| `click` | `selector` OR `text` | text uses getByText |
| `wait-for-url` | `contains` OR `equals` | |
| `wait-for-selector` | `selector`, optional `state` | state: visible/attached/hidden |
| `wait-for-text` | `selector`, `text` | |
| `wait` | `ms` | static delay |
| `iframe-fill` | `iframeSelector`, `selector`, `value` | has retry logic for Stripe |
| `assert-text` | `selector`, `text` | throws if text not found |
| `assert-url` | `contains` OR `equals` | |
| `screenshot` | `path` | |

### Adding New Step Types

Add case to `executeStep()` switch in run.js:102. Follow pattern: use Playwright locators, throw on failure. Error screenshots are automatic.
