# Web Flow Runner

A CLI tool that runs browser automation flows defined in YAML files using Playwright. Built for testing login flows, checkout flows, and Stripe payments.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Install browser
npx playwright install chromium

# 3. Run a test flow
node run.js flows/example.yaml
```

## Configuration

### Environment Config (`config.json`)

Define your environments and default settings:

```json
{
  "envs": {
    "local": { "baseUrl": "http://localhost:5175" },
    "staging": { "baseUrl": "https://staging.myapp.com" },
    "prod": { "baseUrl": "https://myapp.com" }
  },
  "defaultEnv": "local",
  "defaultTimeoutMs": 15000
}
```

### CLI Options

```bash
node run.js <flow-file> [options]

Options:
  --env=local|staging|prod    Select environment (default: from config)
  --headless=true|false       Run browser visibly (default: true)
  --slowmo=<ms>               Slow down actions for debugging
  --report=json               Generate JSON report in reports/
  --verbose, -v               Show detailed debug info on failure
```

**Examples:**

```bash
# Run with visible browser
node run.js flows/login.yaml --headless=false

# Run against staging with slow motion
node run.js flows/checkout.yaml --env=staging --slowmo=100

# Generate JSON report for CI
node run.js flows/checkout.yaml --report=json

# Debug a failing test (shows page URL, step YAML, console errors)
node run.js flows/checkout.yaml --verbose
```

## Writing Flow Files

Flow files are YAML with three sections: `name`, `config` (optional), and `steps`.

### Basic Structure

```yaml
name: "My Flow"

config:
  baseUrl: "http://localhost:3000"  # Override env baseUrl
  timeoutMs: 30000                   # Override default timeout

steps:
  - type: goto
    path: "/login"

  - type: fill
    selector: 'input[name="email"]'
    value: "user@example.com"

  - type: click
    text: "Submit"
```

### Environment Variables

Use `${VAR_NAME}` syntax to inject environment variables into your flows:

```yaml
name: "Login with env vars"

steps:
  - type: goto
    path: "/login"

  - type: fill
    selector: "#email"
    value: "${TEST_EMAIL}"

  - type: fill
    selector: "#password"
    value: "${TEST_PASSWORD}"

  - type: click
    text: "Sign In"
```

Run with environment variables:

```bash
TEST_EMAIL="user@example.com" TEST_PASSWORD="secret123" node run.js flows/login.yaml
```

Or export them first:

```bash
export TEST_EMAIL="user@example.com"
export TEST_PASSWORD="secret123"
node run.js flows/login.yaml
```

### Optional Steps

Mark steps as `optional: true` to continue the flow even if they fail. Useful for dismissing popups or cookies banners that may or may not appear:

```yaml
steps:
  - type: goto
    path: "/"

  # This won't fail the flow if the popup doesn't exist
  - type: click
    text: "Accept Cookies"
    optional: true

  # This won't fail if dismiss button isn't found
  - type: click
    selector: ".modal-dismiss"
    optional: true

  # Continue with the actual test...
  - type: fill
    selector: "#email"
    value: "test@example.com"
```

Optional steps that fail show as "skipped" in the output:

```
STEP 2: click text="Accept Cookies"
  (optional step skipped: Timeout 15000ms exceeded)
STEP 3: fill #email
```

### Step Reference

#### Navigation

```yaml
# Go to URL (relative to baseUrl)
- type: goto
  path: "/dashboard"

# Go to absolute URL
- type: goto
  url: "https://example.com/page"
```

#### Form Input

```yaml
- type: fill
  selector: 'input[type="email"]'
  value: "test@example.com"
```

#### Clicking

```yaml
# Click by CSS selector
- type: click
  selector: "#submit-btn"

# Click by visible text
- type: click
  text: "Sign In"
```

#### Waiting

```yaml
# Wait for URL to contain string
- type: wait-for-url
  contains: "/dashboard"

# Wait for exact URL
- type: wait-for-url
  equals: "https://myapp.com/success"

# Wait for element to appear
- type: wait-for-selector
  selector: ".loading-spinner"
  state: hidden  # visible (default), attached, hidden

# Wait for text in element
- type: wait-for-text
  selector: "body"
  text: "Welcome back"

# Static delay (use sparingly)
- type: wait
  ms: 1000
```

#### Assertions

```yaml
# Assert text exists in element
- type: assert-text
  selector: "h1"
  text: "Dashboard"

# Assert current URL
- type: assert-url
  contains: "/success"
```

#### Screenshots

```yaml
- type: screenshot
  path: "screenshots/final-state.png"
```

#### Stripe Iframe Fields

```yaml
# Fill card number
- type: iframe-fill
  iframeSelector: 'iframe[name^="__privateStripeFrame"]'
  selector: 'input[name="cardnumber"]'
  value: "4242424242424242"

# Fill expiry
- type: iframe-fill
  iframeSelector: 'iframe[name^="__privateStripeFrame"]'
  selector: 'input[name="exp-date"]'
  value: "12/34"

# Fill CVC
- type: iframe-fill
  iframeSelector: 'iframe[name^="__privateStripeFrame"]'
  selector: 'input[name="cvc"]'
  value: "123"

# Fill postal code
- type: iframe-fill
  iframeSelector: 'iframe[name^="__privateStripeFrame"]'
  selector: 'input[name="postal"]'
  value: "90210"
```

## Example Flows

### Login Flow

```yaml
name: "User Login"

steps:
  - type: goto
    path: "/login"

  - type: fill
    selector: 'input[type="email"]'
    value: "test@example.com"

  - type: fill
    selector: 'input[type="password"]'
    value: "password123"

  - type: click
    text: "Log In"

  - type: wait-for-url
    contains: "/dashboard"

  - type: assert-text
    selector: "h1"
    text: "Welcome"
```

### Stripe Checkout Flow

```yaml
name: "Purchase Flow"

config:
  timeoutMs: 30000

steps:
  - type: goto
    path: "/checkout"

  - type: iframe-fill
    iframeSelector: 'iframe[name^="__privateStripeFrame"]'
    selector: 'input[name="cardnumber"]'
    value: "4242424242424242"

  - type: iframe-fill
    iframeSelector: 'iframe[name^="__privateStripeFrame"]'
    selector: 'input[name="exp-date"]'
    value: "12/34"

  - type: iframe-fill
    iframeSelector: 'iframe[name^="__privateStripeFrame"]'
    selector: 'input[name="cvc"]'
    value: "123"

  - type: click
    text: "Pay"

  - type: wait-for-text
    selector: "body"
    text: "Payment successful"

  - type: screenshot
    path: "screenshots/payment-success.png"
```

## Output

### Console Output

```
Running flow: User Login
Environment: local
Base URL: http://localhost:5175
Headless: true
---
STEP 1: goto /login
STEP 2: fill input[type="email"]
STEP 3: fill input[type="password"]
STEP 4: click text="Log In"
STEP 5: wait-for-url contains "/dashboard"
STEP 6: assert-text "Welcome"
---
Flow completed successfully.
```

### On Failure

```
STEP 4: click text="Log In"
ERROR: step 4 (click) - locator.click: Timeout 15000ms exceeded
Screenshot saved to screenshots/User Login_step-4.png
```

### JSON Report (`--report=json`)

```json
{
  "flow": "User Login",
  "env": "local",
  "success": true,
  "duration": 1234,
  "steps": [
    { "index": 1, "type": "goto", "status": "passed", "error": null },
    { "index": 2, "type": "fill", "status": "passed", "error": null }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Tips

### Finding Selectors

Run with `--headless=false --slowmo=500` to watch the browser and inspect elements:

```bash
node run.js flows/myflow.yaml --headless=false --slowmo=500
```

### Stripe Test Cards

| Card Number | Scenario |
|-------------|----------|
| 4242424242424242 | Success |
| 4000000000000002 | Declined |
| 4000000000009995 | Insufficient funds |

Use any future expiry date, any 3-digit CVC, any postal code.

### Debugging Failures

1. Check the auto-saved screenshot in `screenshots/`
2. Run with `--headless=false` to watch
3. Add `wait` steps if elements load slowly
4. Increase `timeoutMs` in flow config

### CI Integration

```bash
# Returns exit code 0 on success, 1 on failure
node run.js flows/smoke-test.yaml --report=json

# Check exit code
if [ $? -eq 0 ]; then
  echo "Tests passed"
else
  echo "Tests failed"
  exit 1
fi
```
