# Deployment Guide - save20k.com

How this site was deployed using Claude Code + Cloudflare.

## Prerequisites

- Domain purchased on Cloudflare (save20k.com)
- Cloudflare account
- Node.js installed

## Step 1: Install Wrangler CLI

```bash
npm install -g wrangler
```

## Step 2: Login to Cloudflare

```bash
wrangler login
# Opens browser for OAuth - approve the request
```

Verify login:
```bash
wrangler whoami
```

## Step 3: Create Pages Project

```bash
# Set your account ID (find it in Cloudflare dashboard or from `wrangler whoami`)
export CLOUDFLARE_ACCOUNT_ID="your-account-id"

# Create the project
wrangler pages project create save20k --production-branch main
```

## Step 4: Deploy the Site

```bash
# Deploy the docs folder
wrangler pages deploy ./docs --project-name=save20k
```

You'll get a URL like: `https://abc123.save20k.pages.dev`

The production URL will be: `https://save20k.pages.dev`

## Step 5: Add Custom Domain (API)

```bash
# Store your OAuth token (from ~/.wrangler/config/default.toml)
cat ~/Library/Preferences/.wrangler/config/default.toml | grep oauth_token | cut -d'"' -f2 > ~/.cf_token

# Add custom domain
TOKEN=$(cat ~/.cf_token)
curl -X POST "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/save20k/domains" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"save20k.com"}'

# Add www subdomain
curl -X POST "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/save20k/domains" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"www.save20k.com"}'
```

## Step 6: Configure DNS Records

The OAuth token from wrangler doesn't have DNS write permissions, so add these manually:

1. Go to https://dash.cloudflare.com
2. Select save20k.com domain
3. Go to DNS → Records
4. Add these CNAME records:

| Type | Name | Content | Proxy Status |
|------|------|---------|--------------|
| CNAME | @ | save20k.pages.dev | Proxied |
| CNAME | www | save20k.pages.dev | Proxied |

## Step 7: Verify Deployment

```bash
# Check DNS propagation
nslookup save20k.com

# Check domain status via API
TOKEN=$(cat ~/.cf_token)
curl -s "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/save20k/domains" \
  -H "Authorization: Bearer $TOKEN" | jq '.result[] | {name, status}'
```

## Redeploying Updates

After making changes to `docs/index.html`:

```bash
wrangler pages deploy ./docs --project-name=save20k
```

## Quick Reference

```bash
# Account ID
export CLOUDFLARE_ACCOUNT_ID="0ffc4efae9a7228d5c527edf81195ad3"

# Project URLs
# - Production: https://save20k.pages.dev
# - Custom: https://save20k.com

# Useful commands
wrangler whoami                           # Check login status
wrangler pages project list               # List all projects
wrangler pages deployment list save20k    # List deployments
```

## Files

- `~/.cf_token` - Cloudflare OAuth token (auto-refreshes via wrangler)
- `~/Library/Preferences/.wrangler/config/default.toml` - Wrangler config

## Troubleshooting

### Token expired
```bash
wrangler login
cat ~/Library/Preferences/.wrangler/config/default.toml | grep oauth_token | cut -d'"' -f2 > ~/.cf_token
```

### DNS not resolving
1. Check DNS records in Cloudflare dashboard
2. Wait 1-5 minutes for propagation
3. Try `nslookup save20k.com 1.1.1.1` (Cloudflare DNS)

### Domain stuck on "pending"
- Usually means CNAME records not set
- Check: `curl -s "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/save20k/domains" -H "Authorization: Bearer $(cat ~/.cf_token)"`
