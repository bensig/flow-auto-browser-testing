Here’s a clean, agent-friendly document. No meta words. No fluff. Straight specification.

---

# Web Flow Runner – Specification Document

## Purpose

Create a local command-line program that reads a plain text flow file and drives a real browser using Playwright. The program executes login flows, checkout flows, Stripe test payments, and reports results in the console.

---

## Core Concept

The app accepts a YAML or JSON “flow file.” Each file describes a sequence of steps:

* open a URL
* fill form fields
* click buttons by selector or text
* wait for URL or text
* fill Stripe iframe fields
* assert success conditions

The app uses Playwright + Node.js to run these steps in Chromium.

---

## System Requirements

* macOS (Intel or ARM)
* Node.js LTS
* npm or yarn
* Playwright installed with Chromium

Install commands:

```
npm init -y
npm install playwright js-yaml
npx playwright install chromium
```

---

## Folder Structure

```
play-tests/
  package.json
  run.js
  config.json
  flows/
    example.yaml
  screenshots/
  reports/
```

---

## Config File

`config.json` contains environment settings.

Example:

```json
{
  "envs": {
    "local": { "baseUrl": "http://localhost:5175" },
    "staging": { "baseUrl": "https://staging.myapp.com" }
  },
  "defaultEnv": "local",
  "defaultTimeoutMs": 15000
}
```

---

## Flow File Format (YAML)

A flow defines:

* name
* optional config overrides
* steps array

Example:

```yaml
name: "Login and Stripe flow"

config:
  baseUrl: "http://localhost:5175"
  timeoutMs: 15000

steps:
  - type: goto
    path: "/login"

  - type: fill
    selector: 'input[type="email"]'
    value: 'test@example.com'

  - type: fill
    selector: 'input[type="password"]'
    value: 'password123'

  - type: click
    text: "Login"

  - type: wait-for-url
    contains: "/dashboard"

  - type: click
    text: "Buy now"

  - type: wait-for-url
    contains: "stripe"

  - type: iframe-fill
    iframeSelector: 'iframe[name^="__privateStripeFrame"]'
    selector: 'input[name="cardnumber"]'
    value: '4242424242424242'

  - type: iframe-fill
    iframeSelector: 'iframe[name^="__privateStripeFrame"]'
    selector: 'input[name="exp-date"]'
    value: '12/34'

  - type: iframe-fill
    iframeSelector: 'iframe[name^="__privateStripeFrame"]'
    selector: 'input[name="cvc"]'
    value: '123'

  - type: iframe-fill
    iframeSelector: 'iframe[name^="__privateStripeFrame"]'
    selector: 'input[name="postal"]'
    value: '90210'

  - type: click
    text: "Pay"

  - type: wait-for-text
    selector: "body"
    text: "Payment successful"
```

---

## Supported Step Types

### Navigation

* `goto`

  * fields: `url` or `path`

### Form Input

* `fill`

  * fields: `selector`, `value`

### Clicks

* `click`

  * fields: `selector` OR `text`

### Waiting

* `wait-for-url`

  * fields: `contains` OR `equals`
* `wait-for-selector`

  * fields: `selector`, optional `state`
* `wait-for-text`

  * fields: `selector`, `text`
* `wait`

  * fields: `ms`

### Iframe Actions (Stripe)

* `iframe-fill`

  * fields: `iframeSelector`, `selector`, `value`

### Assertions

* `assert-text`

  * fields: `selector`, `text`
* `assert-url`

  * fields: `contains` OR `equals`

### Utility

* `screenshot`

  * fields: `path`

---

## CLI Runner Behavior

Command:

```
node run.js flows/example.yaml
```

CLI options:

* `--env=local|staging|prod`
* `--headless=true|false`
* `--slowmo=ms`
* `--report=json`

Execution flow:

1. Parse CLI arguments
2. Load `config.json`
3. Select environment
4. Load flow file
5. Launch Playwright (headless or visible)
6. Execute steps in order
7. Log each step
8. On failure:

   * log error
   * save screenshot
   * exit with code 1
9. On success:

   * log success
   * exit with code 0

---

## Console Output Format

Example:

```
STEP 1: goto /login
STEP 2: fill input[type="email"]
STEP 3: fill input[type="password"]
STEP 4: click text="Login"
STEP 5: wait-for-url contains "/dashboard"
STEP 6: click text="Buy now"
STEP 7: iframe-fill cardnumber
STEP 8: iframe-fill exp-date
STEP 9: iframe-fill cvc
STEP 10: iframe-fill postal
STEP 11: click text="Pay"
STEP 12: wait-for-text "Payment successful"
Flow completed successfully.
```

On failure:

```
ERROR: step 7 (iframe-fill) - selector not found
Screenshot saved to screenshots/flow_step-7.png
```

---

## Success Criteria

* Able to run login flows against localhost or staging.
* Able to complete Stripe test card checkout in embedded iframes.
* Able to output pass/fail reliably in console.
* Able to generate optional JSON reports.
* Extensible step types without rewriting core logic.



