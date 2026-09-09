"""Tender specification audit: split a pasted spec into clauses, find which
IS standards are already cited, suggest standards for uncited clauses
(respecting the abstention gate), and flag missing normative references and
edition mismatches for cited standards.

Never says "outdated", "superseded", or "current" -- `latest_version` is a
derived-from-year edition record, not a live currency check against BIS's
catalogue (see data/ENRICHMENT_REPORT.md). Findings are phrased strictly as
"document cites X; our record shows Y."
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))

from data_pipeline.normalize import normalize_standard_number
from retrieval.identifiers import find_all_identifiers
from retrieval.search import RetrievalIndex

# Numbered clauses ("4.2", "4.2.1.") or bullets ("-", "*", "•") at the
# start of a line. Over-splitting is the explicit decision rule here: a
# short fragment that retrieves nothing is recoverable, a merged clause
# that hides a missing reference is not.
_MARKER_RE = re.compile(r"^\s*(?:\d+(?:\.\d+)*\.?|[-*•])\s+", re.MULTILINE)
_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+(?=[A-Z(0-9])")


def _split_sentences(text: str) -> list[str]:
    return [p.strip() for p in _SENTENCE_SPLIT_RE.split(text.strip()) if p.strip()]


def split_clauses(spec_text: str) -> list[str]:
    """Numbered clauses, bullets, and plain sentences -- real tender text
    mixes all three, so this layers all three splitting strategies rather
    than picking one."""
    lines = [l for l in spec_text.split("\n") if l.strip()]
    blocks: list[str] = []
    current: list[str] = []
    found_marker = False

    for line in lines:
        if _MARKER_RE.match(line):
            found_marker = True
            if current:
                blocks.append(" ".join(current).strip())
            current = [_MARKER_RE.sub("", line, count=1).strip()]
        else:
            current.append(line.strip())
    if current:
        blocks.append(" ".join(current).strip())

    if not found_marker:
        blocks = _split_sentences(spec_text)

    clauses = []
    for block in blocks:
        sentences = _split_sentences(block)
        clauses.extend(sentences if sentences else [block])
    return [c for c in clauses if c]


def _edition_note(citation_text: str, cited_year: int, latest_version: str) -> str | None:
    latest_norm = normalize_standard_number(latest_version)
    if latest_norm.year is None or latest_norm.year == cited_year:
        return None
    return f"document cites {citation_text}; our record shows {latest_version}"


def audit_specification(spec_text: str, index: RetrievalIndex, top_k: int = 5) -> dict:
    clause_texts = split_clauses(spec_text)
    per_clause_matches = [find_all_identifiers(c) for c in clause_texts]

    # Document-wide citation set, for the missing-normative-reference check
    # -- a reference cited in a DIFFERENT clause still counts as covered.
    doc_cited: set[tuple] = set()
    for matches in per_clause_matches:
        for m in matches:
            doc_cited.add((m.is_number, m.part or None))

    findings = []
    n_cited, n_uncited, n_missing_refs, n_edition_mismatches = 0, 0, 0, 0

    for clause_text, matches in zip(clause_texts, per_clause_matches):
        resolved = [(m, index.row_for(m.is_number, m.part)) for m in matches]
        resolved = [(m, row) for m, row in resolved if row is not None]

        if resolved:
            n_cited += 1
            missing_refs: list[dict] = []
            edition_notes: list[str] = []

            for m, row in resolved:
                key = (m.is_number, m.part or None)
                if not index.is_primary_standard(*key):
                    # Decision rule (B4): never imply "no normative refs" for
                    # an unmapped standard -- say plainly that we don't know.
                    missing_refs.append({
                        "cited_standard": row["standard_number"],
                        "missing_standard": None,
                        "relationship_type": None,
                        "note": "no allied mapping available",
                    })
                else:
                    groups = index.allied_for(*key)
                    for relationship_type, items in groups.items():
                        for item in items:
                            item_norm = normalize_standard_number(item["standard_number"])
                            item_key = (item_norm.is_number, item_norm.part or None)
                            if item_key not in doc_cited:
                                missing_refs.append({
                                    "cited_standard": row["standard_number"],
                                    "missing_standard": item["standard_number"],
                                    "relationship_type": relationship_type,
                                    "note": item["description"],
                                })

                if m.normalized.year is not None and row.get("latest_version"):
                    note = _edition_note(m.normalized.standard_number, m.normalized.year, row["latest_version"])
                    if note:
                        edition_notes.append(note)

            n_missing_refs += len(missing_refs)
            n_edition_mismatches += len(edition_notes)
            findings.append({
                "clause_text": clause_text,
                "cited_standards": [row["standard_number"] for _, row in resolved],
                "suggested_standards": [],
                "abstained": False,
                "abstain_reason": None,
                "missing_normative_refs": missing_refs,
                "edition_notes": edition_notes,
            })
        else:
            n_uncited += 1
            results = index.search(clause_text, top_k=top_k)
            confidence_signal, confidence_band, abstained, _technical_reason = index.compute_confidence(clause_text, results)
            findings.append({
                "clause_text": clause_text,
                "cited_standards": [],
                # Still populated in every band, including "low" -- a
                # procurement officer may want to see the near-misses -- but
                # flagged via `abstained` rather than presented as confident.
                "suggested_standards": [index.to_wire(r) for r in results],
                "abstained": abstained,  # True only for confidence_band == "low"
                # Literal B3 phrasing for an unmatched clause -- never a
                # confident wrong suggestion. The technical threshold detail
                # from compute_confidence() is available via confidence_signal
                # on each suggested standard for anyone who wants the number.
                "abstain_reason": "no applicable standard found in corpus" if abstained else None,
                "missing_normative_refs": [],
                "edition_notes": [],
            })

    summary = {
        "clauses_total": len(clause_texts),
        "clauses_cited": n_cited,
        "clauses_uncited": n_uncited,
        "missing_normative_refs_total": n_missing_refs,
        "edition_mismatches_total": n_edition_mismatches,
    }
    return {"clauses": findings, "summary": summary}
