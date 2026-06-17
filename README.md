# BigQuery Release Notes Board & X Share

A premium, high-fidelity developer dashboard built using Python Flask, plain vanilla HTML5, CSS3, and JavaScript. The application fetches, parses, caches, and visualizes the Google Cloud BigQuery release notes, enabling users to search, filter, select, and instantly customize and post tweets about specific updates to X (formerly Twitter).

## Features

- **Automated RSS/Atom Synchronization**: Periodically fetches and parses the live XML feed from Google Cloud.
- **Smart Update Splitter**: Atom entries are split into individual, categorized items (e.g. Features, Announcements, Breaking, Changes, Deprecations) using lookahead parsing.
- **High-Fidelity UI/UX**:
  - Implements a modern midnight dark theme with rich HSL colors, glassmorphic layout components, and custom typography.
  - Interactive categorization tags, glowing selection indicators, and micro-animations for hover states.
  - Search functionality matching keywords across titles, descriptions, and categories.
  - Categorization filter chips to quickly drill down to specific categories.
- **Advanced X (Twitter) Share System**:
  - Pre-composed tweets matching X's 280-character limit automatically.
  - Live character circular progress indicator (changes colors under warning thresholds).
  - Hashtag shortcut chips to easily append or remove `#BigQuery`, `#GoogleCloud`, `#DataEngineering`, etc.
  - Integrated copy-to-clipboard functionality with custom toast alerts.
  - Quick share opening Twitter's Web Intent composer directly in a new tab.

## File Structure

```text
bq-releases-notes/
├── app.py                  # Main Flask application & feed parser
├── requirements.txt        # Python library dependencies
├── README.md               # Documentation
├── templates/
│   └── index.html          # Main HTML5 semantic dashboard structure
└── static/
    ├── css/
    │   └── styles.css      # CSS styles (Custom design system)
    └── js/
        └── app.js          # JavaScript logic (Filters, Character counting, Sharing)
```

## Setup & Running Local Server

1. **Install Dependencies**:
   Ensure you have Python 3.8+ installed, then run:
   ```bash
   pip install -r requirements.txt
   ```

2. **Start the Flask Server**:
   ```bash
   python app.py
   ```

3. **Access the App**:
   Open your browser and navigate to `http://localhost:5000`.
