# 🚀 BigQuery Release Board & X Share

A premium, high-fidelity developer dashboard built using Python Flask, HTML5, Vanilla CSS3, and JavaScript. The application fetches, parses, caches, and visualizes the Google Cloud BigQuery release notes, enabling users to search, filter, select, and instantly customize and post tweets about specific updates to X (formerly Twitter).

---

## 🌟 Key Features

* **Automated RSS/Atom Synchronization:** Periodically fetches and parses the live XML feed from Google Cloud.
* **Smart Update Splitter:** Segmentizes Atom entries into individual, categorized items (e.g. *Features, Announcements, Breaking, Changes, Deprecations, Fixed*) using lookahead parsing.
* **High-Fidelity UI/UX:**
  * Implements a modern midnight dark theme with rich HSL colors, glassmorphic layout components, and custom typography.
  * Interactive categorization tags, glowing selection indicators, and micro-animations for hover states.
  * Instant search matching keywords across titles, descriptions, and categories.
  * Filter chips to quickly drill down to specific categories.
* **Advanced X (Twitter) Share System:**
  * Pre-composed tweets matching X's 280-character limit automatically.
  * Live character circular progress indicator (changes colors under warning thresholds).
  * Hashtag shortcut chips to easily append or remove `#BigQuery`, `#GoogleCloud`, `#DataEngineering`, etc.
  * Integrated copy-to-clipboard functionality with custom toast alerts.
  * Quick share opening Twitter's Web Intent composer directly in a new tab.

---

## 📂 File Structure

```text
bq-releases-notes/
├── .gitignore              # Git ignore configuration
├── app.py                  # Main Flask application & feed parser
├── requirements.txt        # Python library dependencies
├── README.md               # Main project documentation
├── templates/
│   └── index.html          # Main HTML5 semantic dashboard structure
└── static/
    ├── css/
    │   └── styles.css      # CSS design tokens & layouts
    └── js/
        └── app.js          # JavaScript logic (state, composer, count)
```

---

## 🛠️ Setup & Local Development

### 1. Prerequisites
Ensure you have **Python 3.8+** installed on your system.

### 2. Install Dependencies
Run the following command to install the required libraries listed in [requirements.txt](file:///C:/agy-cli-projects/bq-releases-notes/requirements.txt):
```bash
pip install -r requirements.txt
```

### 3. Start the Flask Server
Launch the development server by executing [app.py](file:///C:/agy-cli-projects/bq-releases-notes/app.py):
```bash
python app.py
```

### 4. Access the Dashboard
Open your browser and navigate to:
```text
http://localhost:5000
```

---

## 🏗️ Architecture & Flow

For a comprehensive architectural analysis, sequence diagrams, and class descriptions, see our **[project_architecture.md](file:///C:/Users/basem/.gemini/antigravity-cli/brain/bdeb6035-776f-4715-896b-c6fe9b59bb59/project_architecture.md)** documentation.
