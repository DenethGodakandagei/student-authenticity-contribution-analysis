"""
INCODE — Live Full-Stack Showcase Server (serve_dashboard.py)
============================================================
Launches a lightweight local server connecting the interactive web
dashboard to the REAL trained XGBoost machine learning model.

Run:
    python serve_dashboard.py
"""

import os
import sys
import json
import webbrowser
from http.server import HTTPServer, SimpleHTTPRequestHandler
import pandas as pd

try:
    from config import (
        MODEL_SAVE_PATH,
        FEATURE_COLUMNS,
        DEFAULT_DATA_PATH
    )
    from predict import predict_authenticity, load_model_bundle
except ImportError:
    from .config import (
        MODEL_SAVE_PATH,
        FEATURE_COLUMNS,
        DEFAULT_DATA_PATH
    )
    from .predict import predict_authenticity, load_model_bundle

DEFAULT_PORT = 8000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
HTML_PATH = os.path.join(BASE_DIR, "continuous_scoring_showcase.html")
CSV_PATH = os.path.join(BASE_DIR, "preprocessed_features.csv")
if not os.path.exists(CSV_PATH):
    CSV_PATH = DEFAULT_DATA_PATH

# Preload ML model bundle
print("[1/2] Loading trained ML model...", flush=True)
MODEL_BUNDLE = load_model_bundle(MODEL_SAVE_PATH)
print(f"      Model: {MODEL_BUNDLE.get('model_name', 'XGBoost')}", flush=True)

# Preload real dataset
print("[2/2] Loading real telemetry dataset...", flush=True)
DATASET = []
if os.path.exists(CSV_PATH):
    df = pd.read_csv(CSV_PATH)
    for idx, row in df.iterrows():
        rec = {col: row.get(col, 0) for col in FEATURE_COLUMNS}
        rec["row_index"] = idx
        rec["student_id"] = str(row.get("student_id", f"Student_{idx}"))
        rec["authenticity_label"] = int(row.get("authenticity_label", 0))
        DATASET.append(rec)
    print(f"      Loaded {len(DATASET)} real student activity windows.", flush=True)


class AuthenticityDashboardHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS and disable cache
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        if self.path == "/api/dataset":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(DATASET).encode("utf-8"))
            return

        if self.path == "/" or self.path.startswith("/continuous_scoring_showcase.html"):
            if os.path.exists(HTML_PATH):
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.end_headers()
                with open(HTML_PATH, "rb") as f:
                    self.wfile.write(f.read())
                return

        super().do_GET()

    def do_POST(self):
        if self.path == "/api/predict":
            content_length = int(self.headers.get("Content-Length", 0))
            post_body = self.rfile.read(content_length)
            try:
                data = json.loads(post_body.decode("utf-8"))
                
                # Run real ML inference with predict_authenticity
                prediction = predict_authenticity(data, model_bundle=MODEL_BUNDLE)

                response = {
                    "status": "success",
                    "input_features": {k: data.get(k, 0) for k in FEATURE_COLUMNS},
                    "prediction": prediction
                }
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps(response).encode("utf-8"))
            except Exception as e:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode("utf-8"))
            return

CANDIDATE_PORTS = [8000, 5000, 8088, 8501, 8888, 3000, 0]


def find_available_server(candidate_ports=CANDIDATE_PORTS, preferred_port=None):
    ports_to_try = [preferred_port] if preferred_port else []
    ports_to_try += [p for p in candidate_ports if p != preferred_port]

    for port in ports_to_try:
        try:
            server_address = ("127.0.0.1", port)
            httpd = HTTPServer(server_address, AuthenticityDashboardHandler)
            actual_port = httpd.server_port
            return httpd, actual_port
        except (PermissionError, OSError) as e:
            # Port is forbidden or in use, try next
            continue
    raise RuntimeError("Could not find any available port to bind the server.")


def start_server(preferred_port=None):
    httpd, port = find_available_server(preferred_port=preferred_port)
    url = f"http://127.0.0.1:{port}/"
    print("\n" + "=" * 70, flush=True)
    print("  INCODE LIVE ML DASHBOARD SERVER IS RUNNING", flush=True)
    print(f"  URL: {url}", flush=True)
    print("  Press Ctrl+C to stop.", flush=True)
    print("=" * 70 + "\n", flush=True)

    try:
        webbrowser.open(url)
    except Exception:
        pass

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        httpd.server_close()


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="INCODE Live Dashboard Server")
    parser.add_argument("--port", type=int, default=None, help="Preferred port number")
    args = parser.parse_args()

    start_server(preferred_port=args.port)
