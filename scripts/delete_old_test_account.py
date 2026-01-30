"""
One-time script to delete the old test account leslie.wilson@gmail.com
and all associated data. Uses raw SQL only; respects FK constraints by
cleaning audit_logs, error_logs, and nulling FKs before deletes.

Easiest (no manual input): from project root run
  ./scripts/delete_old_test_account_easy.sh
  (Uses Railway production DB if Railway CLI is linked; else .env DATABASE_URL)

Or directly:
  python scripts/delete_old_test_account.py           # interactive
  python scripts/delete_old_test_account.py --yes     # no prompt
"""

import os
import sys

_project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, _project_root)
os.chdir(_project_root)  # so .env and config resolve from project root
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(_project_root, ".env"))
except ImportError:
    pass
os.environ["RUN_DELETE_SCRIPT"] = "1"

EMAIL_TO_DELETE = "leslie.wilson@gmail.com"


def delete_user_and_data(email: str, dry_run: bool = True):
    from app import db
    from sqlalchemy import text

    print(f"\n{'='*60}")
    print(f"{'DRY RUN - ' if dry_run else ''}Deleting user: {email}")
    print(f"{'='*60}\n")

    try:
        db.session.rollback()
    except Exception:
        pass

    row = db.session.execute(text("SELECT id FROM users WHERE email = :email"), {"email": email}).fetchone()
    if not row:
        print(f"User {email} not found")
        return False

    user_id = row[0]
    print(f"Found user: ID={user_id}, Email={email}\n")

    def run(sql, params=None, desc=""):
        params = params or {}
        if dry_run:
            return 0
        try:
            r = db.session.execute(text(sql), params)
            db.session.commit()
            return r.rowcount if hasattr(r, "rowcount") else 0
        except Exception as e:
            db.session.rollback()
            raise e

    # 1) Null FKs so we can delete trades/positions/automations
    if not dry_run:
        run("UPDATE trades SET automation_id = NULL, entry_trade_id = NULL WHERE user_id = :uid", {"uid": user_id}, "trades FKs")
        run("UPDATE positions SET automation_id = NULL WHERE user_id = :uid", {"uid": user_id}, "positions FKs")

    # 2) Delete audit_logs and error_logs that reference this user's data
    for table in ("audit_logs", "error_logs"):
        try:
            if table == "audit_logs":
                r = db.session.execute(text("SELECT count(*) FROM audit_logs WHERE user_id = :uid"), {"uid": user_id}).fetchone()
            else:
                r = db.session.execute(text("SELECT count(*) FROM error_logs WHERE user_id = :uid"), {"uid": user_id}).fetchone()
            n = r[0] if r else 0
            print(f"  {table} (user_id): {n} records")
            if not dry_run and n > 0:
                db.session.execute(text(f"DELETE FROM {table} WHERE user_id = :uid"), {"uid": user_id})
                db.session.commit()
                print(f"    Deleted {n} {table}")
        except Exception as e:
            db.session.rollback()
            print(f"  {table}: skip ({e})")

    for table, subquery in (
        ("audit_logs", "trade_id IN (SELECT id FROM trades WHERE user_id = :uid)"),
        ("audit_logs", "position_id IN (SELECT id FROM positions WHERE user_id = :uid)"),
        ("audit_logs", "automation_id IN (SELECT id FROM automations WHERE user_id = :uid)"),
        ("error_logs", "trade_id IN (SELECT id FROM trades WHERE user_id = :uid)"),
        ("error_logs", "position_id IN (SELECT id FROM positions WHERE user_id = :uid)"),
        ("error_logs", "automation_id IN (SELECT id FROM automations WHERE user_id = :uid)"),
    ):
        try:
            r = db.session.execute(text(f"SELECT count(*) FROM {table} WHERE {subquery}"), {"uid": user_id}).fetchone()
            n = r[0] if r else 0
            if n > 0:
                print(f"  {table} (refs): {n} records")
                if not dry_run:
                    db.session.execute(text(f"DELETE FROM {table} WHERE {subquery}"), {"uid": user_id})
                    db.session.commit()
                    print(f"    Deleted {n}")
        except Exception as e:
            db.session.rollback()
            print(f"  {table} refs: skip ({e})")

    # 3) Main tables in safe order (alerts before positions/trades)
    tables = [
        "alerts",
        "trades",
        "positions",
        "stocks",
        "automations",
        "user_performance",
        "risk_limits",
        "feedback",
        "spreads",
        "alert_filters",
        "strategies",
    ]
    deleted_counts = {}

    for table_name in tables:
        try:
            r = db.session.execute(
                text(f"SELECT count(*) FROM {table_name} WHERE user_id = :uid"),
                {"uid": user_id},
            ).fetchone()
            count = r[0] if r else 0
            deleted_counts[table_name] = count
            print(f"  {table_name}: {count} records")

            if not dry_run and count > 0:
                db.session.execute(text(f"DELETE FROM {table_name} WHERE user_id = :uid"), {"uid": user_id})
                db.session.commit()
                print(f"    Deleted {count} {table_name}")
        except Exception as e:
            db.session.rollback()
            deleted_counts[table_name] = 0
            print(f"  {table_name}: skip ({e})")

    print(f"\n  user: 1 record")
    if not dry_run:
        try:
            db.session.execute(text("DELETE FROM users WHERE id = :uid"), {"uid": user_id})
            db.session.commit()
            print(f"    Deleted user {email}")
        except Exception as e:
            db.session.rollback()
            print(f"    Failed to delete user: {e}")
            return False

    print(f"\n{'='*60}")
    print(f"Summary: {'Would delete' if dry_run else 'Deleted'}:")
    for table, count in deleted_counts.items():
        if count > 0:
            print(f"  - {table}: {count}")
    print(f"  - user: 1")
    print(f"{'='*60}\n")
    return True


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Delete old test account and associated data")
    parser.add_argument("--yes", "-y", action="store_true", help="Skip confirmation and delete")
    args = parser.parse_args()

    from app import create_app
    app = create_app()
    with app.app_context():
        print("\n" + "=" * 60)
        print("STEP 1: DRY RUN")
        print("=" * 60)
        delete_user_and_data(EMAIL_TO_DELETE, dry_run=True)

        if args.yes:
            print("\n--yes: proceeding with deletion.")
            print("=" * 60)
            print("STEP 2: ACTUAL DELETION")
            print("=" * 60)
            ok = delete_user_and_data(EMAIL_TO_DELETE, dry_run=False)
            print("Done." if ok else "Deletion had errors.")
        else:
            confirm = input("\nType 'DELETE' to proceed: ")
            if confirm.strip() == "DELETE":
                print("\n" + "=" * 60)
                print("STEP 2: ACTUAL DELETION")
                print("=" * 60)
                ok = delete_user_and_data(EMAIL_TO_DELETE, dry_run=False)
                print("Done." if ok else "Deletion had errors.")
            else:
                print("Cancelled.")
