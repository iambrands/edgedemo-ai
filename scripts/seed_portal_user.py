#!/usr/bin/env python3
"""
Seed a ClientPortalUser for an existing Client record.

Usage:
  python scripts/seed_portal_user.py \
    --client-id <uuid> \
    --email leslie@iabadvisors.com \
    --password 'CreateWealth2026$'

The script looks up the client, creates (or updates) a portal user,
and prints the new credentials. Run from the project root.

  cd ~/Projects/edgeai-demo
  source venv/bin/activate
  python scripts/seed_portal_user.py --email ... --client-id ... --password ...
"""
import argparse
import asyncio
import os
import sys
from pathlib import Path

# ── project root on sys.path ───────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
for _f in (".env", ".env.production", ".env.beta"):
    p = ROOT / _f
    if p.exists():
        load_dotenv(p)
        break

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select
from passlib.context import CryptContext
from uuid import UUID

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL:
    sys.exit("DATABASE_URL is not set. Source .env first.")

# Strip +asyncpg if present (we add it back)
if "+asyncpg" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)


async def main(args: argparse.Namespace) -> None:
    engine = create_async_engine(DATABASE_URL, echo=False)
    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with Session() as db:
        # Import models inside the async context to avoid import-time DB hits
        from backend.models.client import Client
        from backend.models.portal import ClientPortalUser

        # ── look up client ─────────────────────────────────────────────────
        client_id: UUID | None = None
        if args.client_id:
            try:
                client_id = UUID(args.client_id)
            except ValueError:
                sys.exit(f"Invalid UUID: {args.client_id}")
        elif args.client_email:
            result = await db.execute(
                select(Client).where(Client.email == args.client_email)
            )
            client = result.scalar_one_or_none()
            if not client:
                sys.exit(f"No client found with email: {args.client_email}")
            client_id = client.id
            print(f"  Found client: {client.first_name} {client.last_name} ({client.id})")
        else:
            # List clients
            result = await db.execute(select(Client).limit(20))
            clients = result.scalars().all()
            print("\nAvailable clients:")
            for c in clients:
                print(f"  {c.id}  {c.first_name} {c.last_name}  {c.email}")
            print("\nRe-run with --client-id <uuid> or --client-email <email>")
            return

        # ── check for existing portal user ────────────────────────────────
        result = await db.execute(
            select(ClientPortalUser).where(ClientPortalUser.email == args.email)
        )
        existing = result.scalar_one_or_none()

        hashed = _pwd.hash(args.password)

        if existing:
            existing.hashed_password = hashed
            existing.is_active = True
            await db.commit()
            print(f"\n✓ Updated existing portal user: {args.email}")
        else:
            portal_user = ClientPortalUser(
                client_id=client_id,
                email=args.email,
                hashed_password=hashed,
                is_active=True,
            )
            db.add(portal_user)
            await db.commit()
            print(f"\n✓ Created portal user: {args.email}")

        print(f"  Email:    {args.email}")
        print(f"  Password: {args.password}")
        print(f"  Login at: /portal/login\n")

    await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed a ClientPortalUser")
    parser.add_argument("--client-id", help="Client UUID")
    parser.add_argument("--client-email", help="Client email (alternative to --client-id)")
    parser.add_argument("--email", required=True, help="Portal login email")
    parser.add_argument("--password", required=True, help="Portal login password")
    asyncio.run(main(parser.parse_args()))
