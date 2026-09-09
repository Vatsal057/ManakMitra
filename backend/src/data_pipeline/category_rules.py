"""Keyword-based category classifier.

Covers both the original 22 `Uncategorized` records and the 61 standards
ingested from the allied mapping in round 2 (round 1 shipped those
uncategorized because they bypassed this module entirely -- see
ENRICHMENT_REPORT.md). The ingested rows skew heavily toward test-method
and code-of-practice titles ("Method for...", "...Bend Test", "Code of
Practice for..."), so most of the additions below target that vocabulary.

This is inference, not sourced fact -- every row it touches must be marked
`confidence: medium` by the caller. Keywords are checked in order; the
first match wins, so more specific phrases are listed before generic ones
that could misfire on them.
"""
from __future__ import annotations

# IS number -> category, for cases where title keywords are insufficient
# or misleading (garbled OCR/wiki titles, or a generic-sounding title that
# is actually domain-specific). Based on the well-known public identity of
# these standard numbers, not on any scrape.
_KNOWN_NUMBER_OVERRIDES = {
    2720: "Cement & Construction",   # Methods of test for soils (all parts) -- geotechnical/construction testing
    8543: "Plastics & Rubber",       # Methods of testing plastics (all parts)
    2430: "Cement & Construction",   # Methods for sampling of aggregates for concrete
    4082: "Cement & Construction",   # Stacking and storage of construction materials at site
    4905: None,                      # Random sampling/randomization -- generic statistical method, no real domain

    # Pre-existing miscategorizations found by inspection while verifying
    # the round-2 demo spine (these came in with a non-"Uncategorized"
    # category from the original scrape, so the "only touch Uncategorized
    # rows" rule in clean.py would otherwise have left them wrong).
    # _CORRECTED_CATEGORIES below overrides these unconditionally.
}

# IS number -> corrected category, applied REGARDLESS of what the raw
# scrape already put in the category column. Each entry here is an
# outright domain mismatch found by manual inspection (e.g. a motorcycle
# helmet standard filed under "Cement & Construction"), not a missing
# classification -- so it can't go through the normal
# "only reclassify Uncategorized" path.
_CORRECTED_CATEGORIES = {
    2925: "Safety & PPE",           # Industrial Safety Helmets -- was "Cement & Construction"
    4151: "Safety & PPE",           # Protective helmets for two-wheeler riders -- was "Cement & Construction"
    13450: "Medical & Healthcare",  # Cardiac defibrillators (medical electrical equipment) -- was "Electrical"
    3322: "Safety & PPE",           # PVC-coated waterproof protective clothing -- was "Petroleum"
}

# Title keyword -> category. Checked as case-insensitive substring match,
# in order -- first match wins.
_KEYWORD_RULES = [
    # -- Cement & Construction --
    ("cement", "Cement & Construction"),
    ("concrete", "Cement & Construction"),
    ("opc", "Cement & Construction"),
    ("compressive strength", "Cement & Construction"),
    ("flexural strength", "Cement & Construction"),
    ("hysd", "Cement & Construction"),
    ("reinforcement", "Cement & Construction"),
    ("ceramic tile", "Cement & Construction"),
    ("brickwork", "Cement & Construction"),
    ("plywood", "Cement & Construction"),
    ("construction in steel", "Cement & Construction"),
    ("laying of concrete pipes", "Cement & Construction"),
    ("pozzolana", "Cement & Construction"),
    ("granulated slag", "Cement & Construction"),

    # -- Metallurgy (raw/structural steel and metal testing, as opposed to
    # finished mechanical hardware) --
    ("bend test", "Metallurgy"),
    ("tensile testing of steel", "Metallurgy"),
    ("chemical analysis of steel", "Metallurgy"),
    ("rockwell hardness", "Metallurgy"),
    ("hot rolled", "Metallurgy"),
    ("cold reduced carbon steel", "Metallurgy"),
    ("rolling and cutting tolerances", "Metallurgy"),
    ("sieve analysis of metal powders", "Metallurgy"),
    ("structural steel", "Metallurgy"),

    # -- Electrical --
    ("electric iron", "Electrical"),
    ("wiring installation", "Electrical"),
    ("plugs and socket", "Electrical"),
    ("switches for domestic", "Electrical"),
    ("switches for direct current", "Electrical"),
    ("dc switches", "Electrical"),
    ("porcelain insulator", "Electrical"),
    ("insulator fitting", "Electrical"),
    ("high-voltage insulator", "Electrical"),
    ("high voltage fuse", "Electrical"),
    ("shunt capacitor", "Electrical"),
    ("storage batter", "Electrical"),

    # -- Electronics --
    ("electroacoustics", "Electronics"),
    ("sound level meter", "Electronics"),
    ("environmental testing procedures for electronic", "Electronics"),

    # -- Mechanical (fasteners, bearings, engines, hydraulics, hooks, ropes) --
    ("threaded steel fasteners", "Mechanical"),
    ("point hook", "Mechanical"),
    ("wire rope", "Mechanical"),
    ("starter motor", "Mechanical"),
    ("fuel injection nozzle", "Mechanical"),
    ("roller bearing", "Mechanical"),
    ("rolling bearing", "Mechanical"),
    ("hydraulic fluid power", "Mechanical"),
    ("fluid power", "Mechanical"),
    ("cylinder bore", "Mechanical"),

    # -- Textiles --
    ("fabric", "Textiles"),
    ("wool fibre", "Textiles"),
    ("colour fastness", "Textiles"),
    ("textile material", "Textiles"),

    # -- Chemicals --
    ("sealant", "Chemicals"),
    ("distemper", "Chemicals"),
    ("paint", "Chemicals"),
    ("varnish", "Chemicals"),
    ("synthetic resin adhesive", "Chemicals"),
    ("enamel", "Chemicals"),
    ("ground-glass joint", "Chemicals"),
    ("chemical resistance of glass", "Chemicals"),

    # -- Petroleum (tar/bitumen are petroleum products) --
    ("tar and bituminous", "Petroleum"),
    ("bituminous material", "Petroleum"),

    # -- Water & Environment --
    ("drinking water", "Water & Environment"),

    # -- Food & Agriculture --
    ("livestock feed", "Food & Agriculture"),
    ("feed ingredient", "Food & Agriculture"),
    ("oils and fats", "Food & Agriculture"),
    ("bacteria responsible for food poisoning", "Food & Agriculture"),

    # -- Medical & Healthcare --
    ("medical device", "Medical & Healthcare"),
    ("surgical instrument", "Medical & Healthcare"),

    # -- Safety & PPE --
    ("headform", "Safety & PPE"),
    ("visor", "Safety & PPE"),
    ("explosive", "Safety & PPE"),
    ("pyrotechnic", "Safety & PPE"),
]


def hard_override(is_number: int | None) -> str | None:
    """A manually-verified category correction that applies even when the
    raw scrape already had a (wrong) non-Uncategorized category."""
    return _CORRECTED_CATEGORIES.get(is_number)


def classify(is_number: int | None, title: str) -> tuple[str | None, str]:
    """Return (category, reason) or (None, reason) if no rule fired."""
    if is_number in _KNOWN_NUMBER_OVERRIDES:
        override = _KNOWN_NUMBER_OVERRIDES[is_number]
        if override is not None:
            return override, "known_standard_number"
        return None, "known_standard_number_no_category"

    title_lower = (title or "").lower()
    for keyword, category in _KEYWORD_RULES:
        if keyword in title_lower:
            return category, f"title_keyword:{keyword}"

    return None, "no_rule_matched"
