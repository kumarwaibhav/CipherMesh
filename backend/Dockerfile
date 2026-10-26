FROM python:3.12-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 \
    FORWARDED_ALLOW_IPS=127.0.0.1
WORKDIR /srv
COPY requirements.txt .
RUN pip install -r requirements.txt && useradd --create-home --uid 10001 cipher
COPY app ./app
COPY ciphermesh ./ciphermesh
USER cipher
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health', timeout=2)" || exit 1
# Set FORWARDED_ALLOW_IPS to your load balancer CIDR so per-client rate limits see real client IPs.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips \"$FORWARDED_ALLOW_IPS\""]
