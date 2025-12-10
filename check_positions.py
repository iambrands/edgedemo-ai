#!/usr/bin/env python3
"""Check and verify all positions in the database"""
from app import create_app, db
from models.position import Position
from models.user import User

app = create_app()

with app.app_context():
    # Get all positions
    all_positions = db.session.query(Position).all()
    open_positions = db.session.query(Position).filter_by(status='open').all()
    
    print(f"\n=== POSITION DATABASE CHECK ===")
    print(f"Total positions in database: {len(all_positions)}")
    print(f"Open positions: {len(open_positions)}")
    print(f"Closed positions: {len(all_positions) - len(open_positions)}")
    
    if open_positions:
        print(f"\n=== OPEN POSITIONS ===")
        for pos in open_positions:
            user = db.session.query(User).get(pos.user_id)
            username = user.email if user else f"User {pos.user_id}"
            print(f"\nPosition ID: {pos.id}")
            print(f"  User: {username} (ID: {pos.user_id})")
            print(f"  Symbol: {pos.symbol}")
            print(f"  Option Symbol: {pos.option_symbol or 'N/A'}")
            print(f"  Contract Type: {pos.contract_type or 'Stock'}")
            print(f"  Quantity: {pos.quantity}")
            print(f"  Entry Price: ${pos.entry_price:.2f}")
            print(f"  Current Price: ${pos.current_price:.2f if pos.current_price else 0:.2f}")
            print(f"  Strike: ${pos.strike_price:.2f if pos.strike_price else 'N/A'}")
            print(f"  Expiration: {pos.expiration_date.strftime('%Y-%m-%d') if pos.expiration_date else 'N/A'}")
            print(f"  Unrealized P/L: ${pos.unrealized_pnl:.2f if pos.unrealized_pnl else 0:.2f}")
            print(f"  Status: {pos.status}")
            print(f"  Last Updated: {pos.last_updated}")
    else:
        print("\n⚠️  NO OPEN POSITIONS FOUND")
        print("This could mean:")
        print("  1. All positions were closed")
        print("  2. Positions exist but status is not 'open'")
        print("  3. Database issue")
        
        # Check for positions with other statuses
        other_positions = db.session.query(Position).filter(Position.status != 'open').all()
        if other_positions:
            print(f"\nFound {len(other_positions)} positions with other statuses:")
            for pos in other_positions[:5]:  # Show first 5
                print(f"  Position {pos.id}: {pos.symbol} - Status: {pos.status}")

