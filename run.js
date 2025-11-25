const { chromium } = require('playwright');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    flowFile: null,
    env: null,
    headless: true,
    slowmo: 0,
    report: null,
    verbose: false,
  };

  for (const arg of args) {
    if (arg.startsWith('--env=')) {
      options.env = arg.split('=')[1];
    } else if (arg.startsWith('--headless=')) {
      options.headless = arg.split('=')[1] === 'true';
    } else if (arg.startsWith('--slowmo=')) {
      options.slowmo = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--report=')) {
      options.report = arg.split('=')[1];
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (!arg.startsWith('--')) {
      options.flowFile = arg;
    }
  }

  return options;
}

// Load config.json
function loadConfig() {
  const configPath = path.join(__dirname, 'config.json');
  if (!fs.existsSync(configPath)) {
    return { envs: {}, defaultEnv: 'local', defaultTimeoutMs: 15000 };
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

// Load and parse flow file
function loadFlow(flowFile) {
  const flowPath = path.resolve(flowFile);
  if (!fs.existsSync(flowPath)) {
    throw new Error(`Flow file not found: ${flowPath}`);
  }

  const content = fs.readFileSync(flowPath, 'utf8');
  if (flowPath.endsWith('.yaml') || flowPath.endsWith('.yml')) {
    return yaml.load(content);
  } else if (flowPath.endsWith('.json')) {
    return JSON.parse(content);
  }
  throw new Error('Flow file must be .yaml, .yml, or .json');
}

// Merge config: global config < env config < flow config
function mergeConfig(globalConfig, envName, flowConfig) {
  const env = envName || globalConfig.defaultEnv || 'local';
  const envConfig = globalConfig.envs[env] || {};

  return {
    baseUrl: flowConfig?.baseUrl || envConfig.baseUrl || 'http://localhost:3000',
    timeoutMs: flowConfig?.timeoutMs || globalConfig.defaultTimeoutMs || 15000,
  };
}

// Format step for logging
function formatStep(step, index) {
  const num = index + 1;
  switch (step.type) {
    case 'goto':
      return `STEP ${num}: goto ${step.path || step.url}`;
    case 'fill':
      return `STEP ${num}: fill ${step.selector}`;
    case 'click':
      return `STEP ${num}: click ${step.selector ? step.selector : `text="${step.text}"`}`;
    case 'wait-for-url':
      return `STEP ${num}: wait-for-url ${step.contains ? `contains "${step.contains}"` : `equals "${step.equals}"`}`;
    case 'wait-for-selector':
      return `STEP ${num}: wait-for-selector ${step.selector}`;
    case 'wait-for-text':
      return `STEP ${num}: wait-for-text "${step.text}"`;
    case 'wait':
      return `STEP ${num}: wait ${step.ms}ms`;
    case 'iframe-fill':
      return `STEP ${num}: iframe-fill ${step.selector}`;
    case 'assert-text':
      return `STEP ${num}: assert-text "${step.text}"`;
    case 'assert-url':
      return `STEP ${num}: assert-url ${step.contains ? `contains "${step.contains}"` : `equals "${step.equals}"`}`;
    case 'screenshot':
      return `STEP ${num}: screenshot ${step.path}`;
    default:
      return `STEP ${num}: ${step.type}`;
  }
}

// Execute a single step
async function executeStep(page, step, config) {
  switch (step.type) {
    case 'goto': {
      const url = step.url || `${config.baseUrl}${step.path}`;
      await page.goto(url);
      break;
    }

    case 'fill': {
      await page.locator(step.selector).fill(step.value);
      break;
    }

    case 'click': {
      if (step.selector) {
        await page.locator(step.selector).click();
      } else if (step.text) {
        await page.getByText(step.text, { exact: false }).click();
      } else {
        throw new Error('click step requires selector or text');
      }
      break;
    }

    case 'wait-for-url': {
      if (step.contains) {
        await page.waitForURL((url) => url.toString().includes(step.contains));
      } else if (step.equals) {
        await page.waitForURL(step.equals);
      } else {
        throw new Error('wait-for-url requires contains or equals');
      }
      break;
    }

    case 'wait-for-selector': {
      const state = step.state || 'visible';
      await page.locator(step.selector).waitFor({ state });
      break;
    }

    case 'wait-for-text': {
      await page.locator(step.selector).filter({ hasText: step.text }).waitFor();
      break;
    }

    case 'wait': {
      await page.waitForTimeout(step.ms);
      break;
    }

    case 'iframe-fill': {
      // Wait for iframe to be available
      const iframeLocator = page.locator(step.iframeSelector);
      await iframeLocator.waitFor({ state: 'attached' });

      // Get the frame from the iframe element
      const iframeHandle = await iframeLocator.elementHandle();
      const frame = await iframeHandle.contentFrame();

      if (!frame) {
        throw new Error(`Could not access frame content for ${step.iframeSelector}`);
      }

      // Retry logic for Stripe fields which can be slow to become interactive
      const maxRetries = 3;
      let lastError;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          await frame.locator(step.selector).fill(step.value);
          lastError = null;
          break;
        } catch (err) {
          lastError = err;
          if (attempt < maxRetries) {
            await page.waitForTimeout(500);
          }
        }
      }

      if (lastError) {
        throw lastError;
      }
      break;
    }

    case 'assert-text': {
      // Milestone 5: assertions
      const element = page.locator(step.selector);
      const text = await element.textContent();
      if (!text || !text.includes(step.text)) {
        throw new Error(`Expected text "${step.text}" not found in ${step.selector}`);
      }
      break;
    }

    case 'assert-url': {
      // Milestone 5: assertions
      const currentUrl = page.url();
      if (step.contains && !currentUrl.includes(step.contains)) {
        throw new Error(`URL does not contain "${step.contains}". Current: ${currentUrl}`);
      }
      if (step.equals && currentUrl !== step.equals) {
        throw new Error(`URL does not equal "${step.equals}". Current: ${currentUrl}`);
      }
      break;
    }

    case 'screenshot': {
      // Milestone 5: screenshots
      const screenshotPath = path.resolve(step.path);
      const dir = path.dirname(screenshotPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      await page.screenshot({ path: screenshotPath });
      break;
    }

    default:
      throw new Error(`Unknown step type: ${step.type}`);
  }
}

// Save screenshot on error
async function saveErrorScreenshot(page, stepIndex, flowName) {
  const screenshotDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  const filename = `${flowName || 'flow'}_step-${stepIndex + 1}.png`;
  const filepath = path.join(screenshotDir, filename);
  await page.screenshot({ path: filepath });
  return filepath;
}

// Main runner
async function run() {
  const startTime = Date.now();
  const cliOptions = parseArgs();

  // Validate flow file argument
  if (!cliOptions.flowFile) {
    console.error('Usage: node run.js <flow-file> [options]');
    console.error('Options:');
    console.error('  --env=local|staging|prod');
    console.error('  --headless=true|false');
    console.error('  --slowmo=<ms>');
    console.error('  --report=json');
    console.error('  --verbose, -v    Show detailed debug info on failure');
    process.exit(1);
  }

  // Load config and flow
  const globalConfig = loadConfig();
  let flow;
  try {
    flow = loadFlow(cliOptions.flowFile);
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
    process.exit(1);
  }

  const config = mergeConfig(globalConfig, cliOptions.env, flow.config);

  console.log(`Running flow: ${flow.name || cliOptions.flowFile}`);
  console.log(`Environment: ${cliOptions.env || globalConfig.defaultEnv}`);
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`Headless: ${cliOptions.headless}`);
  console.log('---');

  // Launch browser
  const browser = await chromium.launch({
    headless: cliOptions.headless,
    slowMo: cliOptions.slowmo,
  });

  const context = await browser.newContext();
  context.setDefaultTimeout(config.timeoutMs);
  const page = await context.newPage();

  // Capture browser console logs
  const consoleLogs = [];
  page.on('console', (msg) => {
    consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
    });
  });

  // Capture page errors
  const pageErrors = [];
  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });

  // Execute steps
  const results = [];
  let success = true;

  for (let i = 0; i < flow.steps.length; i++) {
    const step = flow.steps[i];
    console.log(formatStep(step, i));

    const stepResult = {
      index: i + 1,
      type: step.type,
      status: 'passed',
      error: null,
    };

    try {
      await executeStep(page, step, config);
      stepResult.status = 'passed';
    } catch (err) {
      stepResult.status = 'failed';
      stepResult.error = err.message;
      success = false;

      console.error(`\nERROR: step ${i + 1} (${step.type}) - ${err.message}`);

      // Capture page state for debugging
      let pageState = {};
      try {
        pageState = {
          url: page.url(),
          title: await page.title(),
        };
      } catch (e) {
        pageState = { url: 'unknown', title: 'unknown' };
      }

      try {
        const screenshotPath = await saveErrorScreenshot(page, i, flow.name);
        console.error(`Screenshot saved to ${screenshotPath}`);
        stepResult.screenshot = screenshotPath;
      } catch (screenshotErr) {
        console.error(`Failed to save screenshot: ${screenshotErr.message}`);
      }

      // Verbose output for debugging
      if (cliOptions.verbose) {
        console.error('\n--- DEBUG INFO ---');
        console.error(`Flow file: ${path.resolve(cliOptions.flowFile)}`);
        console.error(`Current URL: ${pageState.url}`);
        console.error(`Page title: ${pageState.title}`);
        console.error(`\nFailed step definition:`);
        console.error(yaml.dump(step, { indent: 2 }));
        console.error('--- DIAGNOSIS ---');

        // Provide diagnosis hints
        if (err.message.includes('Timeout')) {
          console.error('LIKELY CAUSE: Element not found on page');
          console.error('CHECK: Is the selector correct? Is the element visible?');
          console.error('TRY: Run with --headless=false to watch the browser');
        } else if (err.message.includes('not found')) {
          console.error('LIKELY CAUSE: Text or element does not exist');
          console.error('CHECK: Verify the page content matches expectations');
        }

        // Show console errors/warnings
        const errorLogs = consoleLogs.filter(l => l.type === 'error' || l.type === 'warning');
        if (errorLogs.length > 0) {
          console.error('\n--- BROWSER CONSOLE ERRORS ---');
          errorLogs.slice(-10).forEach(l => {
            console.error(`[${l.type}] ${l.text}`);
          });
        }

        if (pageErrors.length > 0) {
          console.error('\n--- PAGE ERRORS ---');
          pageErrors.slice(-5).forEach(e => {
            console.error(e);
          });
        }

        console.error('\nTO FIX:');
        console.error('- If selector is wrong: Update the flow YAML file');
        console.error('- If page is wrong: Check your app\'s behavior');
        console.error('- If runner is wrong: File issue at auto-browser-testing repo');
        console.error('------------------\n');
      }

      // Add debug info to result for JSON report
      stepResult.debug = {
        pageUrl: pageState.url,
        pageTitle: pageState.title,
        stepDefinition: step,
        consoleLogs: consoleLogs.slice(-20),
        pageErrors: pageErrors,
      };

      results.push(stepResult);
      break;
    }

    results.push(stepResult);
  }

  // Cleanup
  await browser.close();

  const duration = Date.now() - startTime;

  // Output result
  if (success) {
    console.log('---');
    console.log('Flow completed successfully.');
  }

  // Generate report if requested
  if (cliOptions.report === 'json') {
    const report = {
      flow: flow.name || cliOptions.flowFile,
      env: cliOptions.env || globalConfig.defaultEnv,
      success,
      duration,
      steps: results,
      timestamp: new Date().toISOString(),
    };

    const reportsDir = path.join(__dirname, 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportName = `report_${Date.now()}.json`;
    const reportPath = path.join(reportsDir, reportName);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`Report saved to ${reportPath}`);
  }

  process.exit(success ? 0 : 1);
}

run().catch((err) => {
  console.error(`FATAL: ${err.message}`);
  process.exit(1);
});
