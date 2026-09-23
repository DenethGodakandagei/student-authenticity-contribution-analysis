import json
from http.server import HTTPServer, BaseHTTPRequestHandler
import datetime

MOCK_DOC_ID = "doc_12345"

class SimpleHTTPRequestHandler(BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200, "ok")
        self.end_headers()

    def do_GET(self):
        # Determine the route
        if self.path == "/":
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "Function 3 Backend is running"}).encode('utf-8'))
            
        elif self.path == f"/api/v1/documents/{MOCK_DOC_ID}/timeline":
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            data = [
                {"id": "rev_1", "author": "Alice", "timestamp": "2023-10-01T10:00:00Z", "message": "Initial document setup", "words_added": 250},
                {"id": "rev_2", "author": "Bob", "timestamp": "2023-10-02T14:30:00Z", "message": "Drafted methodology", "words_added": 400},
                {"id": "rev_3", "author": "Charlie", "timestamp": "2023-10-03T09:15:00Z", "message": "Added results section", "words_added": 600},
                {"id": "rev_4", "author": "Alice", "timestamp": "2023-10-04T11:20:00Z", "message": "Refined introduction and abstract", "words_added": 150},
                {"id": "rev_5", "author": "Bob", "timestamp": "2023-10-05T16:45:00Z", "message": "Formatting and references", "words_added": 50}
            ]
            self.wfile.write(json.dumps(data).encode('utf-8'))
            
        elif self.path == f"/api/v1/documents/{MOCK_DOC_ID}/heatmap":
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            data = {
                "authors": ["Alice", "Bob", "Charlie"],
                "sections": ["Abstract", "Introduction", "Methodology", "Results", "Conclusion"],
                "data": [
                    {"author": "Alice", "section": "Abstract", "value": 80},
                    {"author": "Alice", "section": "Introduction", "value": 75},
                    {"author": "Alice", "section": "Methodology", "value": 10},
                    {"author": "Alice", "section": "Results", "value": 5},
                    {"author": "Alice", "section": "Conclusion", "value": 60},
                    {"author": "Bob", "section": "Abstract", "value": 10},
                    {"author": "Bob", "section": "Introduction", "value": 20},
                    {"author": "Bob", "section": "Methodology", "value": 85},
                    {"author": "Bob", "section": "Results", "value": 15},
                    {"author": "Bob", "section": "Conclusion", "value": 30},
                    {"author": "Charlie", "section": "Abstract", "value": 10},
                    {"author": "Charlie", "section": "Introduction", "value": 5},
                    {"author": "Charlie", "section": "Methodology", "value": 5},
                    {"author": "Charlie", "section": "Results", "value": 80},
                    {"author": "Charlie", "section": "Conclusion", "value": 10},
                ]
            }
            self.wfile.write(json.dumps(data).encode('utf-8'))
            
        elif self.path == f"/api/v1/documents/{MOCK_DOC_ID}/growth":
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            data = [
                {"date": "2023-10-01", "Alice": 250, "Bob": 0, "Charlie": 0},
                {"date": "2023-10-02", "Alice": 250, "Bob": 400, "Charlie": 0},
                {"date": "2023-10-03", "Alice": 250, "Bob": 400, "Charlie": 600},
                {"date": "2023-10-04", "Alice": 400, "Bob": 400, "Charlie": 600},
                {"date": "2023-10-05", "Alice": 400, "Bob": 450, "Charlie": 600},
            ]
            self.wfile.write(json.dumps(data).encode('utf-8'))
            
        elif self.path == f"/api/v1/documents/{MOCK_DOC_ID}/anomalies":
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            data = [
                {
                    "id": "burst_1",
                    "author": "Charlie",
                    "timestamp": "2023-10-03T09:15:00Z",
                    "words_added": 600,
                    "duration_seconds": 30,
                    "flag": "Paste Event Detected"
                }
            ]
            self.wfile.write(json.dumps(data).encode('utf-8'))
            
        else:
            self.send_response(404)
            self.end_headers()

if __name__ == '__main__':
    port = 8000
    server_address = ('', port)
    httpd = HTTPServer(server_address, SimpleHTTPRequestHandler)
    print(f"Server running on port {port} without any external dependencies...")
    httpd.serve_forever()
