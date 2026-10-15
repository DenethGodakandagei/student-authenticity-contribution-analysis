"""
FastAPI Microservice for Intelligent Document Evolution and Revision Analytics
Component 3: Intelligent Document Evolution and Revision Analytics using Machine Learning
Author: R.R.S. Ranadewa (IT23217522)
B.Sc. (Hons) in Information Technology Specializing in Software Engineering
Department of Software Engineering, SLIIT
"""

import os
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

from ml_engine import classify_intent_and_significance, calculate_cohens_kappa

app = FastAPI(
    title="Intelligent Document Evolution & Revision Analytics ML Service",
    description="Machine Learning Microservice for Component 3 - Classifies revision intent, significance, and semantic distance.",
    version="1.0.0"
)

# Enable CORS for Next.js frontend and Node.js backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Schemas
class RevisionRequest(BaseModel):
    before_text: str = Field(..., description="Document content before revision")
    after_text: str = Field(..., description="Document content after revision")
    section: Optional[str] = Field("General", description="Document section/heading")

class BatchRevisionRequest(BaseModel):
    revisions: List[RevisionRequest]

class AgreementEvaluationRequest(BaseModel):
    rater1: List[str] = Field(..., description="Labels from primary annotator")
    rater2: List[str] = Field(..., description="Labels from secondary annotator or ML model")

# Endpoints
@app.get("/")
def read_root():
    return {
        "service": "Component 3: Intelligent Document Evolution and Revision Analytics ML Service",
        "author": "R.R.S. Ranadewa (IT23217522)",
        "project": "Transparent Multi-Modal Student Work Tracking",
        "status": "online",
        "model_version": "v1.0-rules-ml-ensemble",
        "endpoints": [
            "/api/v1/ml/classify-revision",
            "/api/v1/ml/batch-classify",
            "/api/v1/ml/evaluate-agreement",
            "/api/v1/ml/model-info"
        ]
    }

@app.get("/api/v1/ml/model-info")
def get_model_info():
    """Returns the taxonomy and criteria specified in the project proposal."""
    return {
        "model_version": "v1.0-rules-ml-ensemble",
        "intent_taxonomy_table_3_1": [
            {"intent": "Language Correction", "operational_meaning": "Grammar, spelling, punctuation or wording correction with minimal content change"},
            {"intent": "Paraphrasing", "operational_meaning": "Expressing substantially the same idea in different wording"},
            {"intent": "Content Addition", "operational_meaning": "Introducing new explanatory or substantive information"},
            {"intent": "Evidence/Citation Addition", "operational_meaning": "Adding supporting evidence, source attribution or citation linked material"},
            {"intent": "Content Removal", "operational_meaning": "Removing substantive text or claims"},
            {"intent": "Structural Reorganization", "operational_meaning": "Changing the organization or placement of content"}
        ],
        "significance_criteria_table_3_2": [
            {"significance": "Minor", "criterion": "Local changes with little or no effect on the document's meaning, argument, evidence, or structure."},
            {"significance": "Moderate", "criterion": "Meaningful change that improves, expands, removes, or reorganizes part of the content without substantially altering the section's central purpose."},
            {"significance": "Major", "criterion": "Substantial changes to content, evidence, reasoning, or structure that materially changes how a section develops or supports the report."}
        ],
        "evaluation_metrics": ["Precision", "Recall", "Macro F1-Score", "Confusion Matrix", "Cohen's Kappa"]
    }

@app.post("/api/v1/ml/classify-revision")
def classify_single_revision(req: RevisionRequest):
    """Classifies a single revision pair into intent and significance."""
    try:
        result = classify_intent_and_significance(
            before_text=req.before_text,
            after_text=req.after_text,
            section=req.section or "General"
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/ml/batch-classify")
def batch_classify_revisions(req: BatchRevisionRequest):
    """Batch classifies multiple revision pairs."""
    results = []
    for rev in req.revisions:
        res = classify_intent_and_significance(
            before_text=rev.before_text,
            after_text=rev.after_text,
            section=rev.section or "General"
        )
        results.append(res)
    return {"total": len(results), "classifications": results}

@app.post("/api/v1/ml/evaluate-agreement")
def evaluate_inter_annotator_agreement(req: AgreementEvaluationRequest):
    """Computes Cohen's Kappa for inter-annotator agreement (Section 3.6)."""
    return calculate_cohens_kappa(req.rater1, req.rater2)

# Backward-Compatibility Mock Endpoints for previous frontend tests
@app.get("/api/v1/documents/{doc_id}/timeline")
def get_mock_timeline(doc_id: str):
    return [
        {"id": "rev_1", "author": "Alice", "timestamp": "2023-10-01T10:00:00Z", "message": "Initial document setup", "words_added": 250},
        {"id": "rev_2", "author": "Bob", "timestamp": "2023-10-02T14:30:00Z", "message": "Drafted methodology", "words_added": 400},
        {"id": "rev_3", "author": "Charlie", "timestamp": "2023-10-03T09:15:00Z", "message": "Added results section", "words_added": 600},
        {"id": "rev_4", "author": "Alice", "timestamp": "2023-10-04T11:20:00Z", "message": "Refined introduction and abstract", "words_added": 150},
        {"id": "rev_5", "author": "Bob", "timestamp": "2023-10-05T16:45:00Z", "message": "Formatting and references", "words_added": 50}
    ]

@app.get("/api/v1/documents/{doc_id}/heatmap")
def get_mock_heatmap(doc_id: str):
    return {
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

@app.get("/api/v1/documents/{doc_id}/growth")
def get_mock_growth(doc_id: str):
    return [
        {"date": "2023-10-01", "Alice": 250, "Bob": 0, "Charlie": 0},
        {"date": "2023-10-02", "Alice": 250, "Bob": 400, "Charlie": 0},
        {"date": "2023-10-03", "Alice": 250, "Bob": 400, "Charlie": 600},
        {"date": "2023-10-04", "Alice": 400, "Bob": 400, "Charlie": 600},
        {"date": "2023-10-05", "Alice": 400, "Bob": 450, "Charlie": 600},
    ]

@app.get("/api/v1/documents/{doc_id}/anomalies")
def get_mock_anomalies(doc_id: str):
    return [
        {
            "id": "burst_1",
            "author": "Charlie",
            "timestamp": "2023-10-03T09:15:00Z",
            "words_added": 600,
            "duration_seconds": 30,
            "flag": "Paste Event Detected",
            "disclaimer": "Heuristic growth flag for reviewer inspection; does not constitute automated proof of misconduct."
        }
    ]

if __name__ == '__main__':
    port = int(os.environ.get("ML_PORT", 8002))
    print(f"Starting FastAPI ML Revision Analytics Server on port {port}...")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
