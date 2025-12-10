#!/usr/bin/env python3
"""Force update TSLA position price"""
from app import create_app, db
from models.position import Position
from services.position_monitor import PositionMonitor

app = create_app()

with app.app_context():
    # Find TSLA positions with suspiciously low prices
    tsla_positions = db.session.query(Position).filter_by(
        symbol='TSLA',
        status='open'
    ).all()
    
    print(f"\n=== FIXING TSLA POSITIONS ===")
    print(f"Found {len(tsla_positions)} TSLA positions")
    
    monitor = PositionMonitor()
    
    for pos in tsla_positions:
        print(f"\nPosition ID: {pos.id}")
        print(f"  Current Price: ${pos.current_price:.2f if pos.current_price else 0:.2f}")
        print(f"  Entry Price: ${pos.entry_price:.2f}")
        print(f"  Option Symbol: {pos.option_symbol}")
        print(f"  Strike: ${pos.strike_price:.2f if pos.strike_price else 'N/A'}")
        print(f"  Expiration: {pos.expiration_date}")
        
        # Force update
        try:
            # Reset current_price to force fresh lookup
            old_price = pos.current_price
            pos.current_price = None
            
            # Update position
            monitor.update_position_data(pos)
            db.session.commit()
            
            print(f"  ✅ Updated: ${old_price:.2f} → ${pos.current_price:.2f if pos.current_price else 0:.2f}")
        except Exception as e:
            db.session.rollback()
            print(f"  ❌ Error: {e}")
    
    print("\n=== DONE ===")

