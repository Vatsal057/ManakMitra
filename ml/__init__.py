"""ML package for the SIH26108 Indian Standards recommendation engine.

Symbols are exposed lazily so that ``import ml`` stays cheap and
``python -m ml.retrieval_pipeline`` does not double-import the module.
"""

from typing import Any

_RETRIEVAL_EXPORTS = {
    "StandardsRecommender",
    "get_recommender",
    "load_standards",
    "recommend_standards",
}
_ALLIED_EXPORTS = {
    "AlliedIndex",
    "allied_for",
    "get_allied_index",
}

__all__ = sorted(_RETRIEVAL_EXPORTS | _ALLIED_EXPORTS)


def __getattr__(name: str) -> Any:
    if name in _RETRIEVAL_EXPORTS:
        from ml import retrieval_pipeline

        return getattr(retrieval_pipeline, name)
    if name in _ALLIED_EXPORTS:
        from ml import allied

        return getattr(allied, name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


def __dir__() -> list[str]:
    return list(__all__)
