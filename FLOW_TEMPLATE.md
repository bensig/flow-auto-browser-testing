# How to Create a Flow

Describe your test flow in plain English. Claude Code will convert it to a YAML flow file.

---

## Quick Reference: HTML → Flow Description

| Your HTML | How to describe it |
|-----------|-------------------|
| `<input id="email">` | "Enter 'test@example.com' in the #email field" |
| `<input name="password">` | "Enter 'secret' in the password field" |
| `<input type="email">` | "Enter 'test@example.com' in the email input" |
| `<button>Sign In</button>` | "Click 'Sign In'" |
| `<button id="submit-btn">` | "Click the #submit-btn button" |
| `<a href="/pricing">Pricing</a>` | "Click 'Pricing' link" |
| `<div class="modal">` | "Wait for .modal to appear" |
| `<h1>Welcome</h1>` | "Should see 'Welcome' text" |

---

## Template

```
FLOW NAME: [Name your test]

BASE URL: [Your app URL, e.g., http://localhost:5175]

STEPS:
1. Go to [path]
2. Enter "[value]" in [field description]
3. Click [element description]
4. Wait for / Should see [expectation]
```

---

## Example: Login Form

**Your HTML:**
```html
<form>
  <input id="email" type="email" placeholder="Email">
  <input id="password" type="password" placeholder="Password">
  <button type="submit">Log In</button>
</form>
```

**Your description:**
```
FLOW NAME: User Login

BASE URL: http://localhost:5175

STEPS:
1. Go to /login
2. Enter "testuser@example.com" in the #email field
3. Enter "mypassword123" in the #password field
4. Click "Log In"
5. Wait for URL to contain /dashboard
6. Should see "Welcome" text
```

**Generated YAML:**
```yaml
name: "User Login"

config:
  baseUrl: "http://localhost:5175"

steps:
  - type: goto
    path: "/login"

  - type: fill
    selector: "#email"
    value: "testuser@example.com"

  - type: fill
    selector: "#password"
    value: "mypassword123"

  - type: click
    text: "Log In"

  - type: wait-for-url
    contains: "/dashboard"

  - type: assert-text
    selector: "body"
    text: "Welcome"
```

---

## Example: Checkout with Multiple Fields

**Your HTML:**
```html
<input id="name" placeholder="Full Name">
<input id="email" placeholder="Email">
<input name="address" placeholder="Address">
<select id="country">...</select>
<button class="checkout-btn">Complete Purchase</button>
<div id="confirmation">Thank you for your order!</div>
```

**Your description:**
```
FLOW NAME: Checkout Flow

BASE URL: http://localhost:3000

STEPS:
1. Go to /checkout
2. Enter "John Smith" in the #name field
3. Enter "john@example.com" in the #email field
4. Enter "123 Main St" in the address field (name="address")
5. Select "United States" in the #country dropdown
6. Click the .checkout-btn button
7. Wait for #confirmation to appear
8. Should see "Thank you" in #confirmation
9. Take screenshot
```

**Generated YAML:**
```yaml
name: "Checkout Flow"

config:
  baseUrl: "http://localhost:3000"

steps:
  - type: goto
    path: "/checkout"

  - type: fill
    selector: "#name"
    value: "John Smith"

  - type: fill
    selector: "#email"
    value: "john@example.com"

  - type: fill
    selector: 'input[name="address"]'
    value: "123 Main St"

  - type: fill
    selector: "#country"
    value: "United States"

  - type: click
    selector: ".checkout-btn"

  - type: wait-for-selector
    selector: "#confirmation"

  - type: assert-text
    selector: "#confirmation"
    text: "Thank you"

  - type: screenshot
    path: "screenshots/checkout-complete.png"
```

---

## How to Describe Fields

### By ID (most reliable)
```
HTML:  <input id="email">
Say:   "Enter 'test@test.com' in the #email field"
YAML:  selector: "#email"
```

### By name attribute
```
HTML:  <input name="username">
Say:   "Enter 'john' in the username field (name='username')"
YAML:  selector: 'input[name="username"]'
```

### By type
```
HTML:  <input type="password">
Say:   "Enter 'secret' in the password field"
YAML:  selector: 'input[type="password"]'
```

### By class
```
HTML:  <input class="search-input">
Say:   "Enter 'query' in the .search-input field"
YAML:  selector: ".search-input"
```

### By placeholder
```
HTML:  <input placeholder="Enter your email">
Say:   "Enter 'test@test.com' in the field with placeholder 'Enter your email'"
YAML:  selector: 'input[placeholder="Enter your email"]'
```

---

## How to Describe Buttons/Links

### By text (simplest)
```
HTML:  <button>Submit</button>
Say:   "Click 'Submit'"
YAML:  text: "Submit"
```

### By ID
```
HTML:  <button id="login-btn">Log In</button>
Say:   "Click the #login-btn button"
YAML:  selector: "#login-btn"
```

### By class
```
HTML:  <button class="primary-btn">Continue</button>
Say:   "Click the .primary-btn button"
YAML:  selector: ".primary-btn"
```

---

## How to Describe Waits/Assertions

### Wait for URL change
```
Say:   "Wait for URL to contain /dashboard"
YAML:  type: wait-for-url
       contains: "/dashboard"
```

### Wait for element to appear
```
Say:   "Wait for #loading to disappear" or "Wait for .modal to appear"
YAML:  type: wait-for-selector
       selector: ".modal"
```

### Assert text exists
```
Say:   "Should see 'Welcome back' on the page"
YAML:  type: assert-text
       selector: "body"
       text: "Welcome back"

Say:   "Should see 'Success' in the #message div"
YAML:  type: assert-text
       selector: "#message"
       text: "Success"
```

---

## Stripe Checkout Fields

For Stripe embedded forms, always describe like this:

```
STEPS:
...
7. Enter "4242424242424242" in Stripe card number field
8. Enter "12/34" in Stripe expiry field
9. Enter "123" in Stripe CVC field
10. Enter "90210" in Stripe ZIP field
11. Click "Pay" button
12. Should see "Payment successful"
```

---

## Running with Debug Output

Always run tests with `--verbose` for debugging:

```bash
node /Users/nobi/Projects/AI/auto-browser-testing/run.js flows/myflow.yaml --verbose
```

If a test fails, the output shows:
- Current page URL
- The exact step that failed
- Browser console errors
- Diagnosis hints

---

## Your Turn

Describe your flow:

```
FLOW NAME:

BASE URL:

STEPS:
1.
2.
3.
4.
5.

```

Then tell Claude Code: **"Create a YAML flow from this description and save it to flows/[name].yaml"**
