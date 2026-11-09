FROM python:3.13-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DJANGO_SETTINGS_MODULE=core.settings \
    GUNICORN_WORKERS=3 \
    GUNICORN_TIMEOUT=120

WORKDIR /app

RUN addgroup --system app && adduser --system --ingroup app app

COPY requirements.txt /app/requirements.txt
RUN python -m pip install --upgrade pip \
    && pip install -r requirements.txt

COPY . /app/

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh && chown -R app:app /app

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["sh", "-c", "python manage.py migrate --noinput && python manage.py collectstatic --noinput --clear && gunicorn core.wsgi:application --bind 0.0.0.0:8000 --workers ${GUNICORN_WORKERS} --timeout ${GUNICORN_TIMEOUT} --access-logfile - --error-logfile - --forwarded-allow-ips='*'"]
