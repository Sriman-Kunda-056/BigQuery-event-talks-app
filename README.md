# BigQuery Release Pulse

BigQuery Release Pulse is a modern, light, and responsive web application that aggregates, categorizes, and searches the Google Cloud BigQuery Release Notes feed. It includes an interactive X (Twitter) Post Composer that features a real-time post preview, character limit validation, and a smart-shorten template.

![Routes](https://img.shields.io/badge/Flask_routes-2-2563eb)
![Categories](https://img.shields.io/badge/update_categories-4-7c3aed)
![Composer](https://img.shields.io/badge/post_limit-280_chars-0ea5e9)
![Feed modes](https://img.shields.io/badge/feed_modes-live_%2B_cache-2ea44f)
![Tests](https://img.shields.io/badge/automated_tests-0-f59e0b)

## Evidence at a glance

| Verified behavior | Value |
| --- | ---: |
| Flask routes | **2** |
| Release-note categories | **4** |
| X composer limit | **280 characters** |
| Upstream timeout | **10 seconds** |
| External Python dependencies | **1** |

## Preview

No reviewed browser capture is tracked yet. The GitHub-rendered data flow below
shows the implemented live-feed and offline-cache behavior.

## Architecture

```mermaid
flowchart LR
    F["Official BigQuery Atom feed"] --> P["Flask fetch + XML parser"]
    P --> C["Local cache fallback"]
    P --> API["/api/feed JSON"]
    C --> API
    API --> UI["Searchable release dashboard"]
    UI --> X["280-character X composer"]
```

> **Prototype status:** the feed parser and UI currently have no automated
> tests. The direct development entry point also enables Flask debug mode, so
> use a production WSGI server for deployment.

---

## What it does

* **Live Feed & Offline Resilience**: Fetches the official Google Cloud BigQuery RSS Feed in real-time. Automatically saves cache files locally, allowing the system to operate offline seamlessly.
* **Granular Segmentation**: Parses the feed HTML to separate entries by update types (`Feature`, `Change`, `Deprecation`, `General`) so they can be read, searched, or shared individually.
* **Search & Filters**: Instant, client-side keyword search and category filters with update count pills.
* **Twitter/X Mockup Composer**:
  - Live preview formatted as an X post.
  - Interactive textarea with characters remaining.
  - Circular SVG indicator that turns amber and red as limits approach.
  - "Smart-Shorten" template button that optimizes character length to fit within the 280-character limit.
  - Immediate integration with Twitter's Web Intent portal for posting.

---

## Repository layout

```
BigQuery-event-talks-app/
├── static/
│   ├── app.js          # Client state, fetching, search, filter, composer logic
│   └── style.css       # Layout grids, glassmorphism design system, shimmers
├── templates/
│   └── index.html      # Structural HTML & mockup widgets
├── app.py              # Flask server, feed fetcher, XML parser & cache manager
├── requirements.txt    # Application requirements (Flask)
└── .gitignore          # Git exclusion rules
```

---

## Quick start

### Prerequisites

* **Python 3.8+** (installed on your system)
* **pip** (Python package installer)

### Setup & Execution

1. Clone this repository and navigate to the project directory:
   ```bash
   git clone https://github.com/Sriman-Kunda-056/BigQuery-event-talks-app.git
   cd BigQuery-event-talks-app
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Start the Flask server:
   ```bash
   python app.py
   ```

4. Open your web browser and navigate to:
   👉 **[http://localhost:5000](http://localhost:5000)**

---

## 🛠️ Tech Stack

* **Backend**: Python, Flask, `xml.etree.ElementTree` (Standard library XML parser)
* **Frontend**: HTML5 (Semantic structure), Vanilla Javascript (ES6), Vanilla CSS3 (Custom design system with CSS grid & variables)

## Tests and validation

No automated test suite is tracked. A local presentation check should cover:

1. Start `python app.py` and open the dashboard.
2. Confirm `/api/feed` returns categorized entries.
3. Search and filter the rendered feed.
4. Confirm the composer enforces its 280-character limit.
5. Temporarily disconnect the upstream feed and verify the cache fallback.

## Limitations

- Parsing depends on the structure and availability of Google's upstream Atom
  feed and may require maintenance when that structure changes.
- The cache is local to one process and has no shared invalidation strategy.
- The development entry point enables Flask debug mode.
- There is no authentication, monitoring, rate limiting, or automated test
  coverage for a production deployment.

## Numbered commit history

1. `Initial` - import the Flask feed dashboard and composer.
2. `01` - add verified metrics, architecture, and offline-cache documentation.
3. `02` - standardize the evidence-first GitHub README format.

## Suggested GitHub topics

`bigquery` `google-cloud` `flask` `python` `atom-feed`
`release-notes` `javascript` `data-engineering`

## License and attribution

No repository-wide license file is included. BigQuery and Google Cloud names are
used only to describe the official public release-note feed consumed by the app;
the project is not an official Google product.
