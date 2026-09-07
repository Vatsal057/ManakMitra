"""Task 4 — FastAPI backend for the Indian Standards recommendation engine.

Endpoints
---------
``GET  /health``                    readiness plus dataset and backend diagnostics
``POST /recommend``                 free text -> ranked Indian Standards
``GET  /allied/{standard_number}``  allied / normative standards for a standard
``POST /translate``                 translate text (graceful stub without an API key)
``GET  /languages``                 language codes the UI can offer
``GET  /demo-queries``              curated demo queries for the frontend
``GET  /standards/{standard_number}`` single standard lookup

Run it::

    .venv/bin/python -m uvicorn api.main:app --reload --port 8000

Docs at http://127.0.0.1:8000/docs

Security note: these endpoints are unauthenticated and rate-limit free, which is
fine for a local hackathon demo but must not be exposed publicly as-is. Anyone
who can reach the port can run unlimited queries against the model.
"""

from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Path, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api import translation
from api.schemas import (
    AlliedResponse,
    ErrorResponse,
    HealthResponse,
    RecommendRequest,
    RecommendResponse,
    TranslateRequest,
    TranslateResponse,
    TranslationInfo,
)

logger = logging.getLogger("api")

API_VERSION = "0.1.0"

# Vite, CRA and a couple of common alternates. Not "*", because credentialed
# requests with a wildcard origin are rejected by browsers anyway and a explicit
# list documents what the frontend actually runs on.
ALLOWED_ORIGINS = [
    "http://localhost:3000", "http://127.0.0.1:3000",
    "http://localhost:5173", "http://127.0.0.1:5173",
    "http://localhost:4173", "http://127.0.0.1:4173",
    "http://localhost:8080", "http://127.0.0.1:8080",
]

# Populated during startup. Kept as module state so failures are reportable via
# /health rather than crashing the process.
_state: Dict[str, Any] = {
    "recommender": None,
    "allied": None,
    "error": None,
}


def _load_engine() -> None:
    """Build the retrieval pipeline and allied index.

    The two are loaded independently on purpose: the allied mapping is just
    JSON, so ``/allied`` should keep working even if the embedding model or the
    standards dataset is unavailable. Errors are recorded for ``/health``, never
    raised.
    """
    started = time.perf_counter()

    try:
        from ml.retrieval_pipeline import get_recommender

        _state["recommender"] = get_recommender()
        _state["error"] = None
        logger.info(
            "Retrieval pipeline ready in %.1fs (%d standards)",
            time.perf_counter() - started,
            len(_state["recommender"].standards),
        )
    except Exception as exc:  # noqa: BLE001 - surfaced through /health
        _state["recommender"] = None
        _state["error"] = f"{type(exc).__name__}: {exc}"
        logger.exception("Failed to initialise the retrieval pipeline")

    try:
        from ml.allied import get_allied_index

        _state["allied"] = get_allied_index()
    except Exception as exc:  # noqa: BLE001
        _state["allied"] = None
        _state["allied_error"] = f"{type(exc).__name__}: {exc}"
        logger.exception("Failed to load the allied standards mapping")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm up at startup so the first user request is not the one that pays the
    # model-loading cost.
    _load_engine()
    yield
    _state.clear()


app = FastAPI(
    title="ManakMitra — Indian Standards Recommendation API",
    description=(
        "Recommends applicable Indian Standards (IS) for procurement "
        "specifications using semantic search, and surfaces allied/normative "
        "standards and certification requirements. SIH26108, Task 4."
    ),
    version=API_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #

def _require_recommender():
    """Return the recommender or raise a 503 that explains how to fix it."""
    recommender = _state.get("recommender")
    if recommender is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "pipeline_unavailable",
                "detail": _state.get("error") or "The retrieval pipeline is not loaded.",
                "hint": (
                    "Check the server logs. Usually this means the standards "
                    "dataset is missing or dependencies are not installed "
                    "(pip install -r requirements.txt)."
                ),
            },
        )
    return recommender


def _require_allied():
    allied = _state.get("allied")
    if allied is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "allied_index_unavailable",
                "detail": _state.get("allied_error")
                or "The allied standards mapping is not loaded.",
                "hint": "Ensure data/allied_standards_mapping.json exists.",
            },
        )
    return allied


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Return a consistent error envelope whether detail is a string or a dict."""
    detail = exc.detail
    if isinstance(detail, dict):
        body = {
            "error": detail.get("error", "error"),
            "detail": detail.get("detail", ""),
            "hint": detail.get("hint"),
        }
    else:
        body = {"error": "error", "detail": str(detail), "hint": None}
    return JSONResponse(status_code=exc.status_code, content=body)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "internal_error",
            "detail": f"{type(exc).__name__}: {exc}",
            "hint": "See the server logs for the traceback.",
        },
    )


# --------------------------------------------------------------------------- #
# Endpoints
# --------------------------------------------------------------------------- #

@app.get("/", include_in_schema=False)
async def root() -> Dict[str, Any]:
    return {
        "service": "ManakMitra Indian Standards Recommendation API",
        "version": API_VERSION,
        "docs": "/docs",
        "endpoints": ["/health", "/recommend", "/allied/{standard_number}", "/translate",
                      "/languages", "/demo-queries", "/standards/{standard_number}"],
    }


@app.get("/health", response_model=HealthResponse, tags=["ops"])
async def health() -> HealthResponse:
    """Readiness check with dataset and backend diagnostics.

    Always returns 200 so a monitor can distinguish "reachable but degraded"
    from "unreachable". Look at ``status`` and ``pipeline_ready``.
    """
    recommender = _state.get("recommender")
    allied = _state.get("allied")

    if recommender is None:
        # Still report what *is* working, so a partial outage is diagnosable.
        return HealthResponse(
            status="error",
            detail=_state.get("error") or "pipeline not loaded",
            pipeline_ready=False,
            allied_mappings=len(allied.entries) if allied else 0,
            flagship_products=len(allied.flagship) if allied else 0,
            translation_provider=translation.provider_name(),
            version=API_VERSION,
        )

    info = recommender.info()
    degraded = info["retrieval_mode"] != "semantic"
    return HealthResponse(
        status="degraded" if degraded else "ok",
        detail=(
            "Running on the lexical fallback backend; install sentence-transformers "
            "for semantic ranking."
            if degraded
            else None
        ),
        pipeline_ready=True,
        standards_loaded=info["standards_loaded"],
        categories=len(info["categories"]),
        embedding_backend=info["embedding_backend"],
        retrieval_mode=info["retrieval_mode"],
        index_backend=info["index_backend"],
        data_quality=info.get("data_quality"),
        allied_mappings=len(allied.entries) if allied else 0,
        flagship_products=len(allied.flagship) if allied else 0,
        translation_provider=translation.provider_name(),
        version=API_VERSION,
    )


@app.post(
    "/recommend",
    response_model=RecommendResponse,
    tags=["recommendation"],
    responses={503: {"model": ErrorResponse}},
)
async def recommend(payload: RecommendRequest) -> RecommendResponse:
    """Recommend Indian Standards for a product description or tender clause.

    Non-English input is translated to English first, either via a configured
    translation API or the offline demo glossary. The response reports exactly
    what happened in ``translation``.
    """
    started = time.perf_counter()
    recommender = _require_recommender()

    original_query = payload.query
    query = payload.query.strip()
    if not query:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": "empty_query",
                "detail": "query must contain some text.",
                "hint": "Paste a product description or tender specification.",
            },
        )

    from api.schemas import MAX_QUERY_CHARS

    truncated = False
    if len(query) > MAX_QUERY_CHARS:
        query = query[:MAX_QUERY_CHARS]
        truncated = True

    # Translate when the caller declares a non-English language, or when the
    # text plainly contains an Indic script.
    translation_info: Optional[TranslationInfo] = None
    needs_translation = (
        payload.source_lang is not None and payload.source_lang.lower() not in {"en", "auto"}
    ) or translation.contains_indic_script(query)

    if needs_translation:
        result = translation.translate(
            query, target_lang="en", source_lang=payload.source_lang
        )
        translation_info = TranslationInfo(
            applied=result.applied,
            provider=result.provider,
            source_lang=result.source_lang,
            target_lang=result.target_lang,
            original_text=result.original_text,
            translated_text=result.text if result.applied else None,
            unavailable_reason=result.unavailable_reason,
        )
        if result.applied:
            query = result.text

    try:
        results: List[Dict[str, Any]] = recommender.recommend(query, top_k=payload.top_k)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Retrieval failed for query %r", query[:120])
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "retrieval_failed",
                "detail": f"{type(exc).__name__}: {exc}",
                "hint": "Check /health to confirm the pipeline is loaded.",
            },
        ) from exc

    if payload.include_allied:
        allied = _state.get("allied")
        if allied is not None:
            for item in results:
                item["allied"] = allied.allied_for(item["standard_number"])

    from ml.retrieval_pipeline import MIN_SCORE

    strong = bool(results) and results[0]["score"] >= MIN_SCORE
    advice = None
    if not results:
        advice = "No standards matched. Try describing the product itself, e.g. 'PVC insulated copper cable 1.5 sq mm'."
    elif not strong:
        advice = (
            "No strong matches found. Try naming the material or product type "
            "rather than the tender formalities."
        )
    if truncated:
        advice = ((advice + " ") if advice else "") + (
            f"Query was truncated to {MAX_QUERY_CHARS} characters."
        )

    return RecommendResponse(
        query=query,
        original_query=original_query,
        top_k=payload.top_k,
        count=len(results),
        results=results,
        strong_match=strong,
        advice=advice,
        translation=translation_info,
        retrieval_mode=recommender.retrieval_mode,
        took_ms=int((time.perf_counter() - started) * 1000),
    )


@app.get(
    "/allied/{standard_number:path}",
    response_model=AlliedResponse,
    tags=["recommendation"],
    responses={503: {"model": ErrorResponse}},
)
async def allied(
    standard_number: str = Path(
        ...,
        description=(
            "Standard number in any format: 'IS 1786', 'IS 1786:2008', "
            "'IS 383-2016'. URL-encode spaces and colons."
        ),
        examples=["IS 1786:2008"],
    ),
) -> AlliedResponse:
    """Allied, normative, test-method, safety and installation standards.

    Returns 200 with ``mapped: false`` and an empty ``groups`` list when no
    mapping exists, so the frontend can render unconditionally.
    """
    index = _require_allied()
    number = standard_number.strip()
    if not number:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": "empty_standard_number", "detail": "Provide a standard number."},
        )

    payload = index.allied_for(number)
    message = None
    if not payload["mapped"]:
        message = (
            f"No allied-standards mapping exists for {number} yet. "
            "Mappings currently cover the flagship product set."
        )
    return AlliedResponse(**payload, message=message)


@app.post("/translate", response_model=TranslateResponse, tags=["multilingual"])
async def translate_text(payload: TranslateRequest) -> TranslateResponse:
    """Translate text between English and supported Indian languages.

    Never fails: when no provider is configured it returns the original text
    with ``translation_unavailable: true`` and a reason.
    """
    result = translation.translate(
        payload.text, target_lang=payload.target_lang, source_lang=payload.source_lang
    )
    return TranslateResponse(
        text=result.text,
        original_text=result.original_text,
        source_lang=result.source_lang,
        target_lang=result.target_lang,
        provider=result.provider,
        translation_unavailable=not result.applied,
        reason=result.unavailable_reason,
    )


@app.get("/languages", tags=["multilingual"])
async def languages() -> Dict[str, Any]:
    """Language options for the frontend selector."""
    return {
        "provider": translation.provider_name(),
        "languages": [
            {"code": code, "label": label}
            for code, label in translation.SUPPORTED_LANGUAGES.items()
        ],
        "note": (
            "With no translation API key configured, non-English queries fall "
            "back to an offline procurement glossary covering common terms."
        ),
    }


@app.get("/demo-queries", tags=["recommendation"])
async def demo_queries() -> Dict[str, Any]:
    """Curated queries that exercise different product categories."""
    from ml.retrieval_pipeline import DEMO_QUERIES

    return {
        "queries": list(DEMO_QUERIES),
        "multilingual_examples": [
            {"language": "hi", "query": "कार्यालय भवन के लिए तांबे के केबल की आपूर्ति"},
            {"language": "hi", "query": "विद्यालय के लिए पेयजल की बोतल खरीद"},
        ],
    }


@app.get(
    "/standards/{standard_number:path}",
    tags=["recommendation"],
    responses={404: {"model": ErrorResponse}},
)
async def get_standard(
    standard_number: str = Path(..., description="Standard number in any format."),
    include_allied: bool = Query(True, description="Include allied standards."),
) -> Dict[str, Any]:
    """Look up one standard by number, in any number format."""
    recommender = _require_recommender()
    from ml.retrieval_pipeline import _canonical_key

    key = _canonical_key(standard_number.strip())
    match = next(
        (r for r in recommender.standards if _canonical_key(r["standard_number"]) == key), None
    )
    if match is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "standard_not_found",
                "detail": f"{standard_number} is not in the loaded dataset.",
                "hint": "Use /recommend to search by description instead.",
            },
        )

    payload: Dict[str, Any] = {"standard": match, "canonical_key": key}
    if include_allied:
        allied_index = _state.get("allied")
        if allied_index is not None:
            payload["allied"] = allied_index.allied_for(match["standard_number"])
    return payload
