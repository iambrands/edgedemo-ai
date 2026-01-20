web: python check_db.py; FLASK_APP=app.py flask db upgrade; python check_db.py; gunicorn app:create_app() --bind 0.0.0.0:$PORT --workers 4 --timeout 120

