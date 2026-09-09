"""FastAPI service for ManakMitra recommendations.

The model + index are built once at startup (lifespan), never per request.
"""
from __future__ import annotations

import os
import sys
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))

from data_pipeline.normalize import normalize_standard_number
from retrieval.search import RetrievalIndex
from retrieval.identifiers import split_identifier_from_text
from audit.tender_audit import audit_specification
from translation.service import TranslationService
from translation.env import load_dotenv

# Load backend/.env if present, so ALLOWED_ORIGINS can be set in a file
# rather than remembered as a shell export on every run. Real environment
# variables still win (load_dotenv uses setdefault), so a platform-injected
# ALLOWED_ORIGINS overrides the file.
load_dotenv()

# Confirmed by reading frontend/indian-standards-frontend/vite.config.ts
# (server.port: 3000) -- not the Vite default 5173.
DEV_SERVER_ORIGIN = "http://localhost:3000"

# Deployed frontend origin(s) -- comma-separated exact origins, set via the
# ALLOWED_ORIGINS env var (e.g. "https://manakmitra.vercel.app"). Kept
# separate from DEV_SERVER_ORIGIN so local dev always keeps working
# regardless of what's deployed.
_extra_origins = [
    o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()
]
ALLOWED_ORIGINS = [DEV_SERVER_ORIGIN, *_extra_origins]

# Vercel preview deployments get a fresh subdomain per branch/PR
# (https://<project>-<hash>-<team>.vercel.app) -- a fixed origin list can't
# cover those, so also allow any *.vercel.app origin via regex. Tighten or
# drop this if that's too permissive for your use case.
ALLOWED_ORIGIN_REGEX = r"https://.*\.vercel\.app"


class RecommendedStandard(BaseModel):
    standard_number: str
    title: str
    similarity_score: float   # dense cosine similarity -- the honest confidence value
    fusion_rank_score: float  # RRF score used for ordering; debugging only, NEVER shown as confidence
    category: str
    certification_badge: str  # verbatim certification_type value, e.g. "Not determined" -- never remapped
    year_published: Optional[int] = None
    scope_description: Optional[str] = None
    scope_source: Optional[str] = None
    latest_version: Optional[str] = None
    version_source: Optional[str] = None
    amendment_count: Optional[int] = None
    mandatory: Optional[bool] = None  # tri-state, never defaulted to false
    certification_source: Optional[str] = None
    qco_reference: Optional[str] = None
    confidence: Optional[str] = None
    source: Optional[str] = None
    source_url: Optional[str] = None
    match_type: str
    retrieval_mode: str  # "exact_identifier" | "hybrid" | "dense_only" -- see Part A, conditional fusion


class AlliedStandard(BaseModel):
    standard_number: str
    title: str
    relationship_type: str
    description: Optional[str] = None
    is_mandatory: Optional[bool] = None  # no source data for this field -- always null


class AlliedStandardsGrouped(BaseModel):
    test_method: list[AlliedStandard] = []
    safety: list[AlliedStandard] = []
    terminology: list[AlliedStandard] = []
    installation: list[AlliedStandard] = []
    normative_reference: list[AlliedStandard] = []


class RecommendRequest(BaseModel):
    query: str
    top_k: int = 5
    source_lang: Optional[str] = None  # taken from the request, never auto-detected


class RecommendResponse(BaseModel):
    results: list[RecommendedStandard]
    # Dense-cosine confidence signal for the whole query (see
    # RetrievalIndex.compute_confidence) -- independent of RRF, which
    # cannot express "no good match" (data/eval/RESULTS.md).
    confidence_signal: float
    confidence_band: str  # "high" | "moderate" | "low"
    abstained: bool  # kept for compatibility; True only when confidence_band == "low"
    abstain_reason: Optional[str] = None
    original_query: Optional[str] = None
    translated_query: Optional[str] = None
    translation_provider: Optional[str] = None


class TranslateRequest(BaseModel):
    # The frontend sends both {text, source_lang} and {query, source_language}
    # aliases -- accept either rather than requiring it to pick one.
    text: Optional[str] = None
    query: Optional[str] = None
    source_lang: Optional[str] = None
    source_language: Optional[str] = None


class TranslateResponse(BaseModel):
    translated_text: str
    source_lang: str
    provider: str
    cached: bool
    failed: bool


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    corpus_size: int
    index_build_seconds: float


class AuditRequest(BaseModel):
    spec_text: str


class MissingNormativeRef(BaseModel):
    cited_standard: str
    missing_standard: Optional[str] = None
    relationship_type: Optional[str] = None
    note: Optional[str] = None


class ClauseFinding(BaseModel):
    clause_text: str
    cited_standards: list[str]
    suggested_standards: list[RecommendedStandard]
    abstained: bool
    abstain_reason: Optional[str] = None
    missing_normative_refs: list[MissingNormativeRef]
    edition_notes: list[str]


class AuditSummary(BaseModel):
    clauses_total: int
    clauses_cited: int
    clauses_uncited: int
    missing_normative_refs_total: int
    edition_mismatches_total: int


class AuditResponse(BaseModel):
    clauses: list[ClauseFinding]
    summary: AuditSummary


@asynccontextmanager
async def lifespan(app: FastAPI):
    t0 = time.monotonic()
    app.state.index = RetrievalIndex.build()
    app.state.index_build_seconds = time.monotonic() - t0
    app.state.translator = TranslationService()
    yield


app = FastAPI(title="ManakMitra Retrieval API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=ALLOWED_ORIGIN_REGEX,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/recommend", response_model=RecommendResponse)
def recommend(req: RecommendRequest):
    index: RetrievalIndex = app.state.index
    translator: TranslationService = app.state.translator

    search_query = req.query
    original_query = None
    translated_query = None
    translation_provider = None
    if req.source_lang and req.source_lang != "en":
        # Exact-identifier detection runs on the ORIGINAL text, before any
        # translation call -- NLLB translates short bare identifiers
        # unreliably regardless of script (see identifiers.py), so this
        # path must not depend on translation quality at all.
        identifier_match, remainder = split_identifier_from_text(req.query)
        if identifier_match is not None and len(remainder) <= 2:
            # Query is (essentially) just the identifier -- skip translation
            # entirely. index.search() re-runs identifier detection itself
            # and resolves it via the exact-identifier path.
            original_query = req.query
            translated_query = identifier_match.normalized.standard_number
            translation_provider = "identifier-detection"
            search_query = req.query
        elif identifier_match is not None:
            # Mixed query: identifier plus real descriptive text. Resolve
            # the identifier directly and translate only the remainder.
            result = translator.translate(remainder, req.source_lang)
            original_query = req.query
            translated_query = f"{identifier_match.normalized.standard_number} {result.translated_text}"
            translation_provider = f"identifier-detection+{result.provider}"
            search_query = translated_query
        else:
            result = translator.translate(req.query, req.source_lang)
            original_query = req.query
            translated_query = result.translated_text
            translation_provider = result.provider
            search_query = result.translated_text

    results = index.search(search_query, top_k=req.top_k)
    confidence_signal, confidence_band, abstained, abstain_reason = index.compute_confidence(search_query, results)
    # Still return the ranked results in every band -- a procurement
    # officer may want to see the near-misses even at "low" -- just flagged
    # at the response level rather than silently presented as confident.
    return RecommendResponse(
        results=[RecommendedStandard(**index.to_wire(r)) for r in results],
        confidence_signal=confidence_signal,
        confidence_band=confidence_band,
        abstained=abstained,
        abstain_reason=abstain_reason,
        original_query=original_query,
        translated_query=translated_query,
        translation_provider=translation_provider,
    )


@app.post("/translate", response_model=TranslateResponse)
def translate(req: TranslateRequest):
    translator: TranslationService = app.state.translator
    text = req.text or req.query or ""
    source_lang = req.source_lang or req.source_language or "en"

    if source_lang != "en":
        identifier_match, remainder = split_identifier_from_text(text)
        if identifier_match is not None and len(remainder) <= 2:
            # Pure identifier query -- the canonical form IS the correct
            # "translation" and is more accurate than anything NLLB would
            # produce for a bare acronym+number string. Skip NLLB entirely.
            return TranslateResponse(
                translated_text=identifier_match.normalized.standard_number,
                source_lang=source_lang,
                provider="identifier-detection",
                cached=False,
                failed=False,
            )
        if identifier_match is not None:
            result = translator.translate(remainder, source_lang)
            return TranslateResponse(
                translated_text=f"{identifier_match.normalized.standard_number} {result.translated_text}",
                source_lang=source_lang,
                provider=f"identifier-detection+{result.provider}",
                cached=result.cached,
                failed=result.failed,
            )

    result = translator.translate(text, source_lang)
    return TranslateResponse(
        translated_text=result.translated_text,
        source_lang=result.source_lang,
        provider=result.provider,
        cached=result.cached,
        failed=result.failed,
    )


@app.get("/allied/{standard_number}", response_model=AlliedStandardsGrouped)
def allied(standard_number: str):
    index: RetrievalIndex = app.state.index
    parsed = normalize_standard_number(standard_number)
    grouped = index.allied_for(parsed.is_number, parsed.part)
    return AlliedStandardsGrouped(**grouped)


@app.post("/audit", response_model=AuditResponse)
def audit(req: AuditRequest):
    index: RetrievalIndex = app.state.index
    result = audit_specification(req.spec_text, index)
    return AuditResponse(**result)


@app.get("/health", response_model=HealthResponse)
def health():
    index: RetrievalIndex = app.state.index
    return HealthResponse(
        status="ok",
        model_loaded=True,
        corpus_size=len(index.df),
        index_build_seconds=app.state.index_build_seconds,
    )


# --- Static frontend (optional) ------------------------------------------
# When a built frontend is present at ROOT/static, serve it from "/" so the
# whole app lives on one origin (used by the Hugging Face Space deployment).
# Without this, "/" returns FastAPI's {"detail":"Not Found"}.
#
# MUST be registered last: Starlette matches routes in registration order, so
# mounting at "/" before the API routes above would shadow every one of them.
# Absent (normal local dev, where Vite serves the frontend on :3000) this is
# simply skipped, so nothing changes.
STATIC_DIR = ROOT / "static"
if STATIC_DIR.is_dir():
    from fastapi.staticfiles import StaticFiles

    # html=True serves index.html for "/" and for directory paths.
    app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="frontend")
