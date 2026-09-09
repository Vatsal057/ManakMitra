# ManakMitra backend -- Hugging Face Space (Docker SDK).
# HF routes traffic to port 7860 and runs the container as UID 1000, so the
# user is created up front and everything is copied with --chown (per
# https://huggingface.co/docs/hub/spaces-sdks-docker#permissions). Copying as
# root and chowning afterwards would duplicate every file into a new layer.
FROM python:3.11-slim

# Torch's default PyPI wheel drags in CUDA packages that are large and useless
# on HF's CPU tier. Install the CPU-only build first so the resolver doesn't
# pull the GPU variant when it processes requirements.txt.
RUN pip install --no-cache-dir torch==2.12.0 \
      --index-url https://download.pytorch.org/whl/cpu

RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH
WORKDIR $HOME/app

COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

COPY --chown=user src ./src
COPY --chown=user data ./data
# Pre-built frontend (Vite `dist`). Served at "/" by main.py when present, so
# the API and the UI share one origin -- no CORS, no separate host. Built on
# the developer's machine rather than in this image, which keeps node out of
# the runtime entirely.
COPY --chown=user static ./static

# Model weights download here on first use. Must be writable by UID 1000,
# which it is, since it lives under $HOME owned by `user`.
ENV HF_HOME=$HOME/.cache/huggingface \
    PYTHONUNBUFFERED=1

EXPOSE 7860

CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "7860"]
