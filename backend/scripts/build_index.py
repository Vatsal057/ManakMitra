"""Build (or rebuild from cache) the retrieval index and report timing.

Thin CLI wrapper -- all assembly logic lives in RetrievalIndex.build().
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from retrieval.search import RetrievalIndex, DEFAULT_CACHE_PATH


def main() -> None:
    index = RetrievalIndex.build()
    print(f"Built index: {len(index.df)} rows, embeddings cached at {DEFAULT_CACHE_PATH}, "
          f"{index.build_seconds:.2f}s")


if __name__ == "__main__":
    main()
