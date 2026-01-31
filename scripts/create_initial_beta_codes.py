"""
Create initial beta codes for OptionsEdge controlled beta.
Run from project root:

  python scripts/create_initial_beta_codes.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

CODES = [
    ('FRIENDS50', 'Friends & Family Beta', 50),
    ('PRODUCTHUNT', 'Product Hunt Launch', 100),
    ('IABVIP2026', 'VIP Access - Unlimited', 0),
    ('FINTWIT', 'Financial Twitter', 200),
    ('EARLYBIRD', 'Early Adopters', 100),
]

if __name__ == '__main__':
    from app import create_app
    from models.beta_code import BetaCode

    app = create_app()
    with app.app_context():
        db = app.extensions['sqlalchemy']
        for code_str, desc, max_uses in CODES:
            if db.session.query(BetaCode).filter_by(code=code_str).first():
                print(f"  {code_str} already exists, skip")
                continue
            c = BetaCode(code=code_str, description=desc, max_uses=max_uses if max_uses is not None else 100)
            db.session.add(c)
            print(f"  Created {code_str} - {desc} (max_uses={max_uses or 'unlimited'})")
        db.session.commit()
        print("Done.")
