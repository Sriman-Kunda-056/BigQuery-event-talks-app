import os
import re
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_FILE = os.path.join(os.path.dirname(__file__), "feed_cache.xml")

def fetch_feed_xml():
    """Fetches the RSS feed XML, falling back to local cache if offline or error."""
    try:
        # User-agent header to avoid getting blocked by generic scraper filters
        req = urllib.request.Request(
            FEED_URL, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()
            # Save to cache
            with open(CACHE_FILE, "wb") as f:
                f.write(xml_data)
            return xml_data, False
    except Exception as e:
        print(f"Error fetching feed: {e}")
        # Try to load from cache
        if os.path.exists(CACHE_FILE):
            with open(CACHE_FILE, "rb") as f:
                return f.read(), True
        return None, True

def parse_feed_to_updates(xml_str):
    """Parses the Atom XML feed into a structured list of individual updates."""
    if not xml_str:
        return []
    
    try:
        root = ET.fromstring(xml_str)
    except Exception as e:
        print(f"XML Parsing Error: {e}")
        return []
        
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    updates = []
    
    for entry in root.findall('atom:entry', ns):
        date_str = entry.find('atom:title', ns).text
        updated_str = entry.find('atom:updated', ns).text if entry.find('atom:updated', ns) is not None else ""
        entry_id = entry.find('atom:id', ns).text if entry.find('atom:id', ns) is not None else ""
        
        content_elem = entry.find('atom:content', ns)
        content_html = content_elem.text if content_elem is not None else ""
        
        # Segment content by <h3> headers (e.g. <h3>Feature</h3>, <h3>Change</h3>, etc.)
        # Using a regex split that keeps the delimiters (h3 tags)
        parts = re.split(r'(<h3>.*?</h3>)', content_html)
        
        if len(parts) <= 1:
            # If no <h3> subheaders exist, treat the entire content as a single update
            clean_text = re.sub(r'<[^>]+>', ' ', content_html).strip()
            # Collapse multiple spaces
            clean_text = re.sub(r'\s+', ' ', clean_text)
            updates.append({
                'date': date_str,
                'type': 'General',
                'raw_html': content_html,
                'plain_text': clean_text,
                'id': entry_id
            })
        else:
            # Structure will be ['', '<h3>Feature</h3>', ' <p>description</p> ', '<h3>Change</h3>', ...]
            # We skip the first element if it's empty (pre-delimiter text)
            for i in range(1, len(parts), 2):
                h3_tag = parts[i]
                type_text = re.sub(r'<[^>]+>', '', h3_tag).strip() # Extract "Feature", "Change", etc.
                content_text = parts[i+1] if i+1 < len(parts) else ""
                
                if content_text.strip():
                    item_html = h3_tag + content_text
                    clean_text = re.sub(r'<[^>]+>', ' ', content_text).strip()
                    clean_text = re.sub(r'\s+', ' ', clean_text)
                    
                    # Create a deterministic sub-id
                    sub_id = f"{entry_id}#{i}"
                    
                    updates.append({
                        'date': date_str,
                        'type': type_text,
                        'raw_html': item_html,
                        'plain_text': clean_text,
                        'id': sub_id
                    })
                    
    return updates

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/feed')
def get_feed():
    from datetime import datetime
    xml_data, is_cached = fetch_feed_xml()
    if xml_data is None:
        return jsonify({
            'success': False,
            'error': 'Failed to fetch release notes and no cached version exists.',
            'updates': []
        }), 500
        
    cache_time_str = None
    if os.path.exists(CACHE_FILE):
        mtime = os.path.getmtime(CACHE_FILE)
        cache_time_str = datetime.fromtimestamp(mtime).strftime("%b %d, %Y %I:%M %p")

    updates = parse_feed_to_updates(xml_data)
    return jsonify({
        'success': True,
        'cached': is_cached,
        'cache_time': cache_time_str,
        'updates': updates
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
