@trades_bp.route('/recalculate-balance', methods=['POST'])
@token_required
def recalculate_balance(current_user):
    """Recalculate paper balance from scratch based on all trades"""
    db = current_app.extensions['sqlalchemy']
    
    try:
        from models.trade import Trade
        from models.user import User
        from datetime import datetime
        
        # Start with default paper trading balance
        starting_balance = 100000.0
        calculated_balance = starting_balance
        
        # Get all trades for this user, ordered by date
        all_trades = db.session.query(Trade).filter(
            Trade.user_id == current_user.id
        ).order_by(Trade.trade_date).all()
        
        current_app.logger.info(f"Recalculating balance for user {current_user.id} from {len(all_trades)} trades")
        
        # Process each trade
        for trade in all_trades:
            is_option = (
                trade.contract_type and 
                trade.contract_type.lower() in ['call', 'put', 'option']
            ) or bool(trade.option_symbol)
            
            contract_multiplier = 100 if is_option else 1
            trade_cost = trade.price * trade.quantity * contract_multiplier
            
            if trade.action.lower() == 'buy':
                calculated_balance -= trade_cost
            else:  # sell
                calculated_balance += trade_cost
        
        # Update user balance
        old_balance = current_user.paper_balance
        current_user.paper_balance = calculated_balance
        
        db.session.commit()
        
        return jsonify({
            'message': 'Balance recalculated successfully',
            'old_balance': float(old_balance),
            'new_balance': float(calculated_balance),
            'difference': float(calculated_balance - old_balance),
            'trades_processed': len(all_trades)
        }), 200
        
    except Exception as e:
        import traceback
        error_msg = f"Failed to recalculate balance: {str(e)}"
        current_app.logger.error(f"{error_msg}\n{traceback.format_exc()}")
        db.session.rollback()
        return jsonify({'error': error_msg}), 500

@trades_bp.route('/recalculate-balance', methods=['POST'])
@token_required
def recalculate_balance(current_user):
    """Recalculate paper balance from scratch based on all trades"""
    db = current_app.extensions['sqlalchemy']
    
    try:
        from models.trade import Trade
        from models.user import User
        from datetime import datetime
        
        # Start with default paper trading balance
        starting_balance = 100000.0
        calculated_balance = starting_balance
        
        # Get all trades for this user, ordered by date
        all_trades = db.session.query(Trade).filter(
            Trade.user_id == current_user.id
        ).order_by(Trade.trade_date).all()
        
        current_app.logger.info(f"Recalculating balance for user {current_user.id} from {len(all_trades)} trades")
        
        # Process each trade
        for trade in all_trades:
            is_option = (
                trade.contract_type and 
                trade.contract_type.lower() in ['call', 'put', 'option']
            ) or bool(trade.option_symbol)
            
            contract_multiplier = 100 if is_option else 1
            trade_cost = trade.price * trade.quantity * contract_multiplier
            
            if trade.action.lower() == 'buy':
                calculated_balance -= trade_cost
            else:  # sell
                calculated_balance += trade_cost
        
        # Update user balance
        old_balance = current_user.paper_balance
        current_user.paper_balance = calculated_balance
        
        db.session.commit()
        
        return jsonify({
            'message': 'Balance recalculated successfully',
            'old_balance': float(old_balance),
            'new_balance': float(calculated_balance),
            'difference': float(calculated_balance - old_balance),
            'trades_processed': len(all_trades)
        }), 200
        
    except Exception as e:
        import traceback
        error_msg = f"Failed to recalculate balance: {str(e)}"
        current_app.logger.error(f"{error_msg}\n{traceback.format_exc()}")
        db.session.rollback()
        return jsonify({'error': error_msg}), 500
