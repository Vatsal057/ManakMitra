"""Request/response models for the standards recommendation API.

Response models are intentionally permissive (``extra="allow"``) so that new
fields added by the retrieval pipeline reach the frontend without a schema
change in the middle of the hackathon.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

MAX_QUERY_CHARS = 20_000


class RecommendRequest(BaseModel):
    query: str = Field(
        ...,
        description="Product description, technical specification or tender clause.",
        examples=["Supply of 53 grade ordinary Portland cement in 50 kg bags"],
    )
    top_k: int = Field(5, ge=1, le=50, description="How many standards to return.")
    source_lang: Optional[str] = Field(
        None,
        description=(
            "Language code of the query, e.g. 'hi'. When set to anything other "
            "than 'en', the query is translated to English before retrieval."
        ),
        examples=["hi"],
    )
    include_allied: bool = Field(
        False,
        description="Embed each result's allied standards inline, saving a second call.",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "query": "PVC insulated copper wiring cable 1.5 sq mm for building wiring",
                "top_k": 5,
                "include_allied": True,
            }
        }
    )


class StandardResult(BaseModel):
    model_config = ConfigDict(extra="allow")

    rank: int
    standard_number: str
    canonical_key: str
    title: str
    score: float = Field(..., description="Final relevance score, 0..1. Use for the UI bar.")
    similarity_score: float = Field(..., description="Raw cosine similarity, 0..1.")
    category: str
    certification_type: str
    certification_basis: str = ""
    certification_confidence: str = ""
    certification_reference: str = ""
    latest_version: str = ""
    amendments: Optional[int] = None
    year: Optional[int] = None
    status: str = "active"
    scope_snippet: str = ""
    match_reasons: List[str] = Field(default_factory=list)
    needs_verification: bool = False
    also_known_as: List[str] = Field(default_factory=list)
    retrieval_mode: str = "semantic"
    has_allied: bool = False
    allied_count: int = 0
    flagship_product: Optional[str] = None
    allied: Optional[Dict[str, Any]] = Field(
        None, description="Present only when include_allied was requested."
    )


class TranslationInfo(BaseModel):
    applied: bool = Field(..., description="Whether the query text was actually translated.")
    provider: str
    source_lang: Optional[str] = None
    target_lang: str = "en"
    original_text: Optional[str] = None
    translated_text: Optional[str] = None
    unavailable_reason: Optional[str] = Field(
        None,
        description="Why translation did not happen. Frontend should surface this.",
    )


class RecommendResponse(BaseModel):
    query: str = Field(..., description="The text actually used for retrieval.")
    original_query: str = Field(..., description="The text as submitted.")
    top_k: int
    count: int
    results: List[StandardResult]
    strong_match: bool = Field(
        ..., description="False when the best score is below the confidence floor."
    )
    advice: Optional[str] = Field(
        None, description="Human-readable hint when there is no strong match."
    )
    translation: Optional[TranslationInfo] = None
    retrieval_mode: str = "semantic"
    took_ms: int


class AlliedStandard(BaseModel):
    model_config = ConfigDict(extra="allow")

    standard_number: str
    title: str = ""
    relationship: str
    note: str = ""
    confidence: str = "medium"


class AlliedGroup(BaseModel):
    relationship: str
    label: str
    count: int
    standards: List[AlliedStandard]


class AlliedResponse(BaseModel):
    primary_standard: str = Field(..., description="The standard number as requested.")
    matched_standard: Optional[str] = Field(
        None, description="The key that matched in the Task 2 mapping, if any."
    )
    product: Optional[str] = None
    mapped: bool = Field(..., description="False when no allied mapping exists.")
    total: int
    groups: List[AlliedGroup] = Field(default_factory=list)
    message: Optional[str] = None


class TranslateRequest(BaseModel):
    text: str
    target_lang: str = Field("en", description="Target language code, e.g. 'en' or 'hi'.")
    source_lang: Optional[str] = Field(None, description="Optional source language code.")


class TranslateResponse(BaseModel):
    text: str = Field(..., description="Translated text, or the original if unavailable.")
    original_text: str
    source_lang: Optional[str] = None
    target_lang: str
    provider: str
    translation_unavailable: bool = False
    reason: Optional[str] = None


class DataQuality(BaseModel):
    model_config = ConfigDict(extra="allow")

    rows_needing_review: int = 0
    rows_with_thin_scope: int = 0
    rows_without_certification_tag: int = 0


class HealthResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    status: str = Field(..., description="'ok', 'degraded' or 'error'.")
    detail: Optional[str] = None
    pipeline_ready: bool
    standards_loaded: int = 0
    categories: int = 0
    embedding_backend: str = ""
    retrieval_mode: str = ""
    index_backend: str = ""
    data_quality: Optional[DataQuality] = None
    allied_mappings: int = 0
    flagship_products: int = 0
    translation_provider: str = "unavailable"
    version: str


class ErrorResponse(BaseModel):
    error: str
    detail: str
    hint: Optional[str] = None
