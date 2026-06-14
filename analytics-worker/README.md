# Visitor statistics

This Cloudflare Worker stores country-level aggregate visit counts in D1. It
does not store IP addresses, user agents, or device fingerprints.

## Deploy

1. Install dependencies and authenticate Wrangler:

   ```bash
   npm install
   npx wrangler login
   ```

2. Create the D1 database:

   ```bash
   npx wrangler d1 create j1shen-visitor-stats
   ```

3. Put the returned database ID in `wrangler.toml`.

4. Create the schema and deploy:

   ```bash
   npx wrangler d1 execute j1shen-visitor-stats --remote --file=./schema.sql
   npx wrangler deploy
   ```

5. Set the deployed Worker URL on the `<body>` element in `index.html`:

   ```html
   <body data-stats-api="https://j1shen-visitor-stats.YOUR-SUBDOMAIN.workers.dev">
   ```

The browser counts at most once per tab session. Regions with fewer than five
visits are grouped into `Other`, and the public statistics response is cached
for five minutes.
