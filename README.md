# Junyi Shen's academic website

Source for [j1shen.github.io](https://j1shen.github.io/).

The site is plain HTML, CSS, and JavaScript and can be previewed with any static
file server:

```bash
python3 -m http.server 8000
```

## Visitor statistics

The optional country-level visitor counter lives in `analytics-worker/`.
Deploy it following that directory's README, then set the Worker URL in
`index.html`:

```html
<body data-stats-api="https://j1shen-visitor-stats.YOUR-SUBDOMAIN.workers.dev">
```

Until an endpoint is configured, the visitor statistics block remains hidden.
