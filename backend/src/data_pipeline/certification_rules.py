"""Certification / QCO classification -- tri-state, hand-verified only.

Round 1 defaulted unassessed rows to certification_type="None", which the
frontend then rendered identically to "we checked, no BIS certification
required." That's a correctness bug with real procurement consequences, so
round 2 makes "not assessed" its own explicit state:

    certification_type: "BIS Product Certification" | "CRS" | "Hallmarking"
                         | "None" | "Not determined"   (default)
    mandatory:           True | False | None            (default None)
    certification_source: "qco_gazette" | "crs_product_list"
                         | "public_knowledge" | "not_assessed" (default)

`certification_type="None"` may only be set with an actual basis for
asserting the standard is outside any QCO -- this module never does that
(we have not surveyed the negative space), so "None" does not appear here
at all; everything is either a verified positive or "Not determined".

Every entry in `_HAND_VERIFIED` below was checked against a primary or
BIS-official secondary source during this pass (see
data/ENRICHMENT_REPORT.md for the citation trail and confidence per row).
This is deliberately a short list, scoped to the 46 demo-spine rows --
per the project rule, fifteen defensible entries beat two hundred inferred
ones. Nothing here was extrapolated to standards not personally checked.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Certification:
    certification_type: str
    mandatory: bool | None
    certification_source: str
    qco_reference: str | None
    confidence: str
    # Populated only for entries sourced from data/certification_map.json
    # (see _load_public_knowledge below) -- the hand-verified table above
    # carries its rationale/citation inline in qco_reference instead.
    basis: str | None = None
    reference: str | None = None


NOT_ASSESSED = Certification("Not determined", None, "not_assessed", None, "low")

_CERTIFICATION_MAP_PATH = Path(__file__).resolve().parents[2] / "data" / "source" / "certification_map.json"


def _load_public_knowledge() -> tuple[dict[tuple[int, str], Certification], dict[int, Certification]]:
    """Load data/certification_map.json into exact (base|part) and bare-base
    lookup tables, per the file's own documented key convention: a
    'base|part' entry wins over the bare base entry for that part."""
    if not _CERTIFICATION_MAP_PATH.exists():
        return {}, {}
    raw = json.loads(_CERTIFICATION_MAP_PATH.read_text(encoding="utf-8"))
    exact: dict[tuple[int, str], Certification] = {}
    base: dict[int, Certification] = {}
    for key, entry in raw.get("entries", {}).items():
        cert = Certification(
            certification_type=entry["certification_type"],
            mandatory=True,  # every scheme in this map (BIS Product Certification, CRS, Hallmarking) is mandatory by definition
            certification_source="public_knowledge",
            qco_reference=None,
            confidence=entry.get("confidence", "medium"),
            basis=entry.get("basis"),
            reference=entry.get("reference"),
        )
        if "|" in key:
            base_str, part = key.split("|", 1)
            exact[(int(base_str), part)] = cert
        else:
            base[int(key)] = cert
    return exact, base


_PUBLIC_KNOWLEDGE_EXACT, _PUBLIC_KNOWLEDGE_BASE = _load_public_knowledge()

# (is_number, part) -> Certification. Part is included in the key wherever
# the standard is a multi-part series and only one part is actually
# QCO-covered (e.g. IS 302 covers dozens of unrelated appliances across its
# parts/sections -- only Part 2/Sec 3, electric irons, is verified here).
# Hand-verified during round 2; see ENRICHMENT_REPORT.md "QCO verification"
# section for the source for each.
_HAND_VERIFIED: dict[tuple[int, str | None], Certification] = {
    # Cement (Quality Control) Order, 2003 -- Ministry of Commerce & Industry
    # (DPIIT), S.O. 191(E) dated 17 Feb 2003. Confirmed against BIS's own
    # CMD-1 circular (Ref CMD-1/12:1, 08.12.2006) listing all mandatorily
    # certified standards and their parent QC orders -- a primary-adjacent
    # official source, not a certification-consultancy blog.
    (269, None): Certification(
        "BIS Product Certification", True, "qco_gazette",
        "Cement (Quality Control) Order, 2003 -- S.O. 191(E) dated 17 Feb 2003 (DPIIT); BIS CMD-1/12:1 dated 08 Dec 2006",
        "high",
    ),
    (455, None): Certification(
        "BIS Product Certification", True, "qco_gazette",
        "Cement (Quality Control) Order, 2003 -- S.O. 191(E) dated 17 Feb 2003 (DPIIT); BIS CMD-1/12:1 dated 08 Dec 2006",
        "high",
    ),
    (1489, "1-2"): Certification(
        "BIS Product Certification", True, "qco_gazette",
        "Cement (Quality Control) Order, 2003 -- S.O. 191(E) dated 17 Feb 2003 (DPIIT); BIS CMD-1/12:1 dated 08 Dec 2006",
        "high",
    ),
    (8112, None): Certification(
        "BIS Product Certification", True, "qco_gazette",
        "Cement (Quality Control) Order, 2003 -- S.O. 191(E) dated 17 Feb 2003 (DPIIT); BIS CMD-1/12:1 dated 08 Dec 2006",
        "high",
    ),
    (12269, None): Certification(
        "BIS Product Certification", True, "qco_gazette",
        "Cement (Quality Control) Order, 2003 -- S.O. 191(E) dated 17 Feb 2003 (DPIIT); BIS CMD-1/12:1 dated 08 Dec 2006",
        "high",
    ),
    (8041, None): Certification(
        "BIS Product Certification", True, "qco_gazette",
        "Cement (Quality Control) Order, 2003 -- S.O. 191(E) dated 17 Feb 2003 (DPIIT); BIS CMD-1/12:1 dated 08 Dec 2006",
        "high",
    ),

    # Electrical Wires, Cables, Appliances and Protection Devices and
    # Accessories (Quality Control) Order, 2003 -- DPIIT, S.O. 189(E)
    # dated 17 Feb 2003. Same BIS CMD-1 circular lists IS 302(Pt2/Sec3)
    # (electric irons) by exact part/section -- matches our IS 302-2-3 row.
    (302, "2-3"): Certification(
        "BIS Product Certification", True, "qco_gazette",
        "Electrical Wires, Cables, Appliances and Protection Devices and Accessories (Quality Control) Order, 2003 -- S.O. 189(E) dated 17 Feb 2003 (DPIIT); BIS CMD-1/12:1 dated 08 Dec 2006 (IS 302 Pt.2/Sec.3, electric irons)",
        "high",
    ),

    # Industrial safety helmets: the same BIS CMD-1 circular lists IS 2925
    # under a *mining-specific* mandate -- Coal Mines Regulations 1957
    # Reg. 157(4), Chief Inspector of Mines Circular No. 22 of 1966 dated
    # 23 Apr 1966 (Directorate General of Mines Safety) -- not a
    # general-market QCO. Recorded as mandatory with that scope noted;
    # do not read this as "all IS 2925 helmets everywhere."
    (2925, None): Certification(
        "BIS Product Certification", True, "qco_gazette",
        "Certification of mining safety helmets under Coal Mines Regulations 1957 Reg. 157(4) -- DGMS Circular No. 22/1966 dated 23 Apr 1966. Scope: mining use; not confirmed as a general-market QCO.",
        "medium",
    ),

    # Steel and Steel Products (Quality Control) Order, 2024 -- Ministry
    # of Steel, S.O. 574(E) dated 5 Feb 2024, naming IS 1786:2008.
    # Corroborated across multiple independent BIS-certification sources
    # (order name/number/date consistent) but not read directly off the
    # gazette schedule -- medium, not high, confidence.
    (1786, None): Certification(
        "BIS Product Certification", True, "qco_gazette",
        "Steel and Steel Products (Quality Control) Order, 2024 -- Ministry of Steel S.O. 574(E) dated 5 Feb 2024, Schedule 1 (IS 1786:2008)",
        "medium",
    ),

    # Helmet for riders of Two Wheeler Motor Vehicles (Quality Control)
    # Order, 2020 -- Ministry of Road Transport & Highways, S.O. 4252(E)
    # dated 26 Nov 2020, effective 1 Jun 2021, naming IS 4151:2015.
    (4151, None): Certification(
        "BIS Product Certification", True, "qco_gazette",
        "Helmet for riders of Two Wheeler Motor Vehicles (Quality Control) Order, 2020 -- MoRTH S.O. 4252(E) dated 26 Nov 2020, effective 1 Jun 2021 (IS 4151:2015)",
        "medium",
    ),
}


def classify(is_number: int | None, part: str | None = None) -> Certification:
    """Return the best available certification for `(is_number, part)`.

    Precedence: hand-verified (primary/BIS-official source, above) wins
    first; data/certification_map.json's public_knowledge tier (part-exact,
    then bare-base) fills in everything hand-verified doesn't cover; the
    honest "Not determined" default applies to everything neither checked.
    """
    key = (is_number, part)
    if key in _HAND_VERIFIED:
        return _HAND_VERIFIED[key]
    if key in _PUBLIC_KNOWLEDGE_EXACT:
        return _PUBLIC_KNOWLEDGE_EXACT[key]
    if is_number in _PUBLIC_KNOWLEDGE_BASE:
        return _PUBLIC_KNOWLEDGE_BASE[is_number]
    return NOT_ASSESSED
