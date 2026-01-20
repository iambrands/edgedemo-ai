#!/bin/bash
# Quick fix script for Railway Shell
# Run this in Railway Dashboard → web service → Deployments → Shell

echo "============================================================"
echo "PAPER BALANCE QUICK FIX (Railway Shell)"
echo "============================================================"
echo ""

python3 << 'EOF'
from app import create_app, db
from models.user import User

app = create_app()
with app.app_context():
    print("\nSTEP 1: Current Balances")
    print("-" * 60)
    users = User.query.filter(User.paper_balance.isnot(None)).all()
    
    negative_users = []
    for user in users:
        status = "❌ NEGATIVE" if user.paper_balance < 0 else "✅ OK"
        print(f"User {user.id} ({user.email}): ${user.paper_balance:,.2f} {status}")
        if user.paper_balance < 0:
            negative_users.append(user)
    
    if negative_users:
        print(f"\n⚠️  Found {len(negative_users)} user(s) with negative balance")
        print("\nSTEP 2: Fixing Negative Balances")
        print("-" * 60)
        
        for user in negative_users:
            original = user.paper_balance
            user.paper_balance = 100000.00
            print(f"✅ Fixed User {user.id}: ${original:,.2f} → $100,000.00")
        
        db.session.commit()
        print(f"\n✅ Fixed {len(negative_users)} user(s)")
    else:
        print("\n✅ No negative balances found")
    
    print("\nSTEP 3: Final Balances")
    print("-" * 60)
    for user in User.query.filter(User.paper_balance.isnot(None)).all():
        print(f"User {user.id} ({user.email}): ${user.paper_balance:,.2f} ✅")
    
    print("\n============================================================")
    print("COMPLETE")
    print("============================================================")
EOF

