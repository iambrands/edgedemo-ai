from flask import Blueprint, request, jsonify, Response
from services.tax_reporting import TaxReportingService
from utils.decorators import token_required
from datetime import datetime, date

tax_bp = Blueprint('tax', __name__)

def get_tax_service():
    return TaxReportingService()

@tax_bp.route('/export', methods=['GET'])
@token_required
def export_trades(current_user):
    """Export trades to CSV"""
    try:
        service = get_tax_service()
        
        start_date = None
        end_date = None
        
        if request.args.get('start_date'):
            start_date = datetime.strptime(request.args.get('start_date'), '%Y-%m-%d').date()
        if request.args.get('end_date'):
            end_date = datetime.strptime(request.args.get('end_date'), '%Y-%m-%d').date()
        
        csv_data = service.export_to_csv(current_user.id, start_date, end_date)
        
        return Response(
            csv_data,
            mimetype='text/csv',
            headers={
                'Content-Disposition': f'attachment; filename=trades_export_{datetime.now().strftime("%Y%m%d")}.csv'
            }
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@tax_bp.route('/wash-sales', methods=['GET'])
@token_required
def get_wash_sales(current_user):
    """Detect wash sales"""
    try:
        service = get_tax_service()
        year = request.args.get('year', type=int)
        
        wash_sales = service.detect_wash_sales(current_user.id, year)
        
        return jsonify({
            'wash_sales': wash_sales,
            'count': len(wash_sales),
            'total_disallowed_losses': sum(ws['disallowed_loss'] for ws in wash_sales)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@tax_bp.route('/summary/<int:year>', methods=['GET'])
@token_required
def get_tax_summary(current_user, year):
    """Get tax summary for a year"""
    try:
        service = get_tax_service()
        summary = service.calculate_tax_summary(current_user.id, year)
        
        return jsonify(summary), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@tax_bp.route('/1099b/<int:year>', methods=['GET'])
@token_required
def export_1099b(current_user, year):
    """Export in 1099-B format"""
    try:
        service = get_tax_service()
        csv_data = service.export_1099b_format(current_user.id, year)
        
        return Response(
            csv_data,
            mimetype='text/csv',
            headers={
                'Content-Disposition': f'attachment; filename=1099b_{year}.csv'
            }
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

