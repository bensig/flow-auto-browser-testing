# Implementation Plan - Web Flow Runner

## Milestone 1: Project Setup
- [ ] Initialize npm project with package.json
- [ ] Install dependencies (playwright, js-yaml)
- [ ] Install Playwright Chromium browser
- [ ] Create folder structure (flows/, screenshots/, reports/)
- [ ] Create config.json with local/staging environments

**Deliverable:** Empty project scaffold that can be run without errors

---

## Milestone 2: Core Runner Framework
- [ ] Create run.js entry point
- [ ] Implement CLI argument parsing (--env, --headless, --slowmo, --report)
- [ ] Load and merge config.json with flow config overrides
- [ ] Load and parse YAML flow files
- [ ] Set up Playwright browser launch with configurable options
- [ ] Implement step execution loop with logging (STEP 1: goto /login...)
- [ ] Add basic error handling with exit codes

**Deliverable:** Runner that loads flows and iterates steps (no step execution yet)

---

## Milestone 3: Basic Step Types
- [ ] `goto` - Navigate to URL or path (relative to baseUrl)
- [ ] `fill` - Fill form field by selector
- [ ] `click` - Click by selector OR text
- [ ] `wait-for-url` - Wait for URL contains/equals
- [ ] `wait-for-selector` - Wait for element with optional state
- [ ] `wait-for-text` - Wait for text content in selector
- [ ] `wait` - Static delay in ms

**Deliverable:** Can run simple login flows (goto → fill → click → wait-for-url)

---

## Milestone 4: Iframe & Stripe Support
- [ ] `iframe-fill` - Locate iframe by selector, then fill field inside
- [ ] Handle Stripe's dynamic iframe naming pattern
- [ ] Add retry logic for iframe field availability

**Deliverable:** Can complete Stripe test checkout with 4242 card

---

## Milestone 5: Assertions & Screenshots
- [ ] `assert-text` - Verify text exists in selector
- [ ] `assert-url` - Verify current URL contains/equals
- [ ] `screenshot` - Save screenshot to path
- [ ] Auto-screenshot on step failure

**Deliverable:** Full assertion support, failure diagnostics with screenshots

---

## Milestone 6: Reporting & Polish
- [ ] JSON report output (--report=json)
- [ ] Report includes: flow name, steps executed, pass/fail, duration, errors
- [ ] Save reports to reports/ folder with timestamp
- [ ] Final console output formatting

**Deliverable:** Production-ready CLI with reporting

---

## Example Flow for Testing

Create `flows/example.yaml` during Milestone 1 for iterative testing:

```yaml
name: "Simple Navigation Test"
config:
  baseUrl: "https://example.com"
steps:
  - type: goto
    path: "/"
  - type: wait-for-selector
    selector: "h1"
  - type: assert-text
    selector: "h1"
    text: "Example Domain"
  - type: screenshot
    path: "screenshots/example.png"
```

---

## Suggested Order of Implementation

1. **Milestone 1** → Get project runnable
2. **Milestone 2** → Framework before features
3. **Milestone 3** → Core value (basic flows work)
4. **Milestone 4** → Stripe support (key differentiator per spec)
5. **Milestone 5** → Assertions (testing confidence)
6. **Milestone 6** → Reporting (CI/CD integration)

Each milestone builds on the previous and results in a testable deliverable.
