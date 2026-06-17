import os
import re
import urllib.request
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

# Feed URL
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache
cache = {
    "data": None,
    "last_updated": 0
}
CACHE_DURATION = 300  # 5 minutes in seconds

class HTMLTextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.result = []

    def handle_starttag(self, tag, attrs):
        # Add space for block elements to avoid running text together
        if tag in ['p', 'br', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'tr', 'td']:
            self.result.append(" ")

    def handle_data(self, d):
        self.result.append(d)

    def get_text(self):
        text = "".join(self.result)
        # Normalize whitespace (replace multiple spaces/newlines with a single space)
        text = re.sub(r'\s+', ' ', text)
        return text.strip()

def strip_html_tags(html_content):
    if not html_content:
        return ""
    extractor = HTMLTextExtractor()
    extractor.feed(html_content)
    return extractor.get_text()

def clean_update_type(type_str):
    # Standardize types and strip whitespace/html tags if any
    clean_type = strip_html_tags(type_str).strip()
    # Normalize cases
    return clean_type.capitalize()

def parse_release_notes():
    headers = {'User-Agent': 'Mozilla/5.0'}
    req = urllib.request.Request(FEED_URL, headers=headers)
    
    with urllib.request.urlopen(req) as response:
        xml_data = response.read()
        
    root = ET.fromstring(xml_data)
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    entries = root.findall('atom:entry', ns)
    parsed_updates = []
    
    for entry in entries:
        entry_id = entry.find('atom:id', ns).text
        date_str = entry.find('atom:title', ns).text
        updated_iso = entry.find('atom:updated', ns).text
        content_element = entry.find('atom:content', ns)
        
        content_html = content_element.text if content_element is not None else ""
        
        # Split content into individual updates by looking for <h3> tags
        # Using lookahead to keep the <h3> tag in each chunk
        chunks = re.split(r'(?=<h3[^>]*>)', content_html)
        chunks = [c.strip() for c in chunks if c.strip()]
        
        for idx, chunk in enumerate(chunks):
            # Extract update type from the <h3> tag
            type_match = re.match(r'<h3[^>]*>(.*?)</h3>', chunk, re.DOTALL | re.IGNORECASE)
            
            if type_match:
                update_type = clean_update_type(type_match.group(1))
                # Content is everything after the </h3> tag
                content_body = chunk[type_match.end():].strip()
            else:
                update_type = "Update"
                content_body = chunk
                
            # Strip tags for raw text representation (used for tweets)
            raw_text = strip_html_tags(content_body)
            
            # Generate a unique ID for this update
            # Replace invalid ID characters
            safe_date_id = re.sub(r'[^a-zA-Z0-9]', '_', date_str)
            update_id = f"{safe_date_id}_{idx}"
            
            parsed_updates.append({
                "id": update_id,
                "date": date_str,
                "iso_date": updated_iso,
                "type": update_type,
                "content_html": chunk,  # Include the <h3> tag for rich rendering
                "content_body_html": content_body,  # Only the body HTML
                "raw_text": raw_text
            })
            
    return parsed_updates

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    import time
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    current_time = time.time()
    
    if force_refresh or not cache["data"] or (current_time - cache["last_updated"] > CACHE_DURATION):
        try:
            updates = parse_release_notes()
            cache["data"] = updates
            cache["last_updated"] = current_time
            return jsonify({
                "status": "success",
                "source": "live" if force_refresh or not cache["data"] else "cache_refreshed",
                "updates": updates
            })
        except Exception as e:
            # If live fetch fails but we have cached data, return cached data with warning
            if cache["data"]:
                return jsonify({
                    "status": "warning",
                    "message": f"Failed to refresh feed: {str(e)}. Displaying cached data.",
                    "source": "cache",
                    "updates": cache["data"]
                })
            else:
                return jsonify({
                    "status": "error",
                    "message": f"Failed to fetch release notes: {str(e)}",
                    "updates": []
                }), 500
    else:
        return jsonify({
            "status": "success",
            "source": "cache",
            "updates": cache["data"]
        })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
