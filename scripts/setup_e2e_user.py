#!/usr/bin/env python3
"""
Create the E2E test user in the database.
Run once per environment before running E2E tests.

Usage:
    python scripts/setup_e2e_user.py          # local
    railway run python scripts/setup_e2e_user.py  # Railway
"""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

E2E_USER = {
    'username': os.environ.get('E2E_TEST_USERNAME', 'e2e-testuser'),
    'email': os.environ.get('E2E_TEST_EMAIL', 'e2e-test@optionsedge.ai'),
    'password': os.environ.get('E2E_TEST_PASSWORD', 'TestPassword123!'),
}


def setup_e2e_user():
    from app import create_app, db
    from models.user import User

    app = create_app()
    with app.app_context():
        existing = User.query.filter_by(email=E2E_USER['email']).first()
        if existing:
            print(f"E2E test user already exists: {E2E_USER['email']} (id={existing.id})")
            return

        user = User(
            username=E2E_USER['username'],
            email=E2E_USER['email'],
            paper_balance=100000.0,
            risk_tolerance='moderate',
            default_strategy='balanced',
        )
        user.set_password(E2E_USER['password'])

        db.session.add(user)
        db.session.commit()
        print(f"E2E test user created: {E2E_USER['email']} (id={user.id})")


if __name__ == '__main__':
    setup_e2e_user()
