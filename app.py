import copy
import os
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from config.settings import SUBJECT_TYPES, DEFAULT_CLASS_SIZES
from routes.schedule_routes import schedule_bp
from routes.analytics_routes import analytics_bp

# Initialize Flask pointing to the root directory for static files
app = Flask(__name__, static_folder=".", static_url_path="")
CORS(app)

# ── Runtime-mutable stores ────────────────────────────────────────────────────
class_sizes_store = copy.deepcopy(DEFAULT_CLASS_SIZES)
faculty_runtime_list: list = []   # populated on each /run-ga call for analytics re-compute

# ── Register blueprints ───────────────────────────────────────────────────────
app.register_blueprint(schedule_bp)
app.register_blueprint(analytics_bp)

# ── Frontend Static File Routing ──────────────────────────────────────────────

@app.route("/")
def serve_index():
    """Serves the main landing page (index.html)."""
    return send_from_directory(".", "index.html")

@app.route("/<path:path>")
def serve_static_or_pages(path):
    """Serves sub-pages (pages/, faculty/), assets, and static root files."""
    if os.path.exists(path):
        return send_from_directory(".", path)
    # Fallback to index.html if route isn't a direct file match
    return send_from_directory(".", "index.html")

# ── Static data endpoints ─────────────────────────────────────────────────────

@app.route("/rooms", methods=["GET"])
def get_rooms():
    import config.settings as _cfg
    return jsonify({
        "lecture_rooms":     list(_cfg.LECTURE_ROOMS),
        "laboratory_rooms": list(_cfg.LABORATORY_ROOMS),
        "all_rooms":        list(_cfg.ALL_ROOMS),
    })

@app.route("/subject-types", methods=["GET"])
def get_subject_types():
    return jsonify({"success": True, "data": {"subject_types": SUBJECT_TYPES},
                    "metrics": {}, "warnings": []})

@app.route("/class-sizes", methods=["GET"])
def get_class_sizes():
    return jsonify(class_sizes_store)

@app.route("/class-sizes", methods=["POST"])
def update_class_sizes():
    data = request.get_json() or {}
    for key, val in data.items():
        if key in class_sizes_store:
            if isinstance(val, dict):
                class_sizes_store[key].update(val)
            elif isinstance(val, int):
                class_sizes_store[key]["size"] = val
        else:
            class_sizes_store[key] = val
    return jsonify({"success": True, "data": {"class_sizes": class_sizes_store},
                    "metrics": {}, "warnings": []})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)