# ManakMitra backend -- built for deployment as a Hugging Face Space
# (Docker SDK). HF Spaces route traffic to port 7860 by default.
FROM python:3.11-slim

WORKDIR /app

# Torch's default PyPI wheel pulls CUDA deps that are useless (and huge) on
# HF's free CPU-only tier -- install the CPU-only build explicitly first so
# pip doesn't fetch the GPU variant when it later resolves requirements.txt.
RUN pip install --no-cache-dir torch==2.12.0 --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src ./src
COPY data ./data

# Hugging Face's cache dirs default to ~/.cache, which isn't writable by an
# arbitrary non-root UID on Spaces -- point HF's caches at a directory we
# own and create it up front so the NLLB/MiniLM downloads on first request
# don't fail with a permissions error.
ENV HF_HOME=/app/.cache/huggingface \
    TRANSFORMERS_CACHE=/app/.cache/huggingface \
    PYTHONUNBUFFERED=1
RUN mkdir -p /app/.cache/huggingface && chmod -R 777 /app/.cache

EXPOSE 7860

CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "7860"]
