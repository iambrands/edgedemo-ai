# Broker Connection Architecture - Paper to Live Trading Transition

## 🎯 Goal

Allow users to:
1. **Start with paper trading** (no broker credentials needed)
2. **Connect their own broker account** when ready (Tastytrade, IBKR, etc.)
3. **Execute real trades** in their connected broker account
4. **Switch between paper and live** seamlessly

---

## 🏗️ Architecture Overview

### Current State (Problem)
- ❌ Single Tradier account in environment variables (shared by all users)
- ❌ All live trades go to the same broker account
- ❌ Users can't connect their own accounts
- ❌ No per-user broker credentials storage

### Target State (Solution)
- ✅ Each user can connect their own broker account
- ✅ Credentials stored securely (encrypted) per user
- ✅ Trades execute in user's connected account
- ✅ Support multiple brokers (Tastytrade, IBKR, Alpaca, Tradier)

---

## 📊 Database Schema

### New Model: `BrokerConnection`

```python
# models/broker_connection.py
class BrokerConnection(db.Model):
    """User's broker account connection"""
    __tablename__ = 'broker_connections'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    
    # Broker selection
    broker_name = db.Column(db.String(50), nullable=False)  # 'tastytrade', 'ibkr', 'alpaca', 'tradier'
    connection_status = db.Column(db.String(20), default='disconnected')  # disconnected, connected, error
    
    # Encrypted credentials (encrypted at rest)
    encrypted_api_key = db.Column(db.Text, nullable=True)
    encrypted_api_secret = db.Column(db.Text, nullable=True)
    encrypted_account_id = db.Column(db.Text, nullable=True)
    encrypted_access_token = db.Column(db.Text, nullable=True)  # For OAuth brokers
    
    # Connection metadata
    account_number = db.Column(db.String(100), nullable=True)  # Last 4 digits for display
    account_type = db.Column(db.String(50), nullable=True)  # 'cash', 'margin', 'ira'
    buying_power = db.Column(db.Float, nullable=True)  # Cached buying power
    
    # Status tracking
    last_connected_at = db.Column(db.DateTime, nullable=True)
    last_verified_at = db.Column(db.DateTime, nullable=True)
    connection_error = db.Column(db.Text, nullable=True)  # Last error message
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    user = db.relationship('User', backref='broker_connection', uselist=False)
    
    def encrypt_credentials(self, api_key, api_secret, account_id=None):
        """Encrypt and store credentials"""
        from utils.encryption import encrypt_data
        self.encrypted_api_key = encrypt_data(api_key)
        self.encrypted_api_secret = encrypt_data(api_secret)
        if account_id:
            self.encrypted_account_id = encrypt_data(account_id)
    
    def get_decrypted_credentials(self):
        """Get decrypted credentials (for API calls)"""
        from utils.encryption import decrypt_data
        return {
            'api_key': decrypt_data(self.encrypted_api_key) if self.encrypted_api_key else None,
            'api_secret': decrypt_data(self.encrypted_api_secret) if self.encrypted_api_secret else None,
            'account_id': decrypt_data(self.encrypted_account_id) if self.encrypted_account_id else None,
        }
```

### Update User Model

```python
# models/user.py - Add broker connection status
class User(db.Model):
    # ... existing fields ...
    
    # Trading Mode
    trading_mode = db.Column(db.String(10), default='paper')  # paper, live
    
    # Broker connection status (computed from BrokerConnection)
    # No need to store here, but useful for quick checks
    has_broker_connection = db.Column(db.Boolean, default=False)
```

---

## 🔐 Encryption Utility

```python
# utils/encryption.py
from cryptography.fernet import Fernet
import base64
import os
from flask import current_app

def get_encryption_key():
    """Get encryption key from environment or generate"""
    key = current_app.config.get('ENCRYPTION_KEY')
    if not key:
        # Generate key (store in env for production)
        key = Fernet.generate_key()
    return key

def encrypt_data(data: str) -> str:
    """Encrypt sensitive data"""
    if not data:
        return None
    f = Fernet(get_encryption_key())
    return f.encrypt(data.encode()).decode()

def decrypt_data(encrypted_data: str) -> str:
    """Decrypt sensitive data"""
    if not encrypted_data:
        return None
    f = Fernet(get_encryption_key())
    return f.decrypt(encrypted_data.encode()).decode()
```

---

## 🔌 Broker Connector Factory

```python
# services/broker_factory.py
from services.tastytrade_connector import TastytradeConnector
from services.ibkr_connector import IBKRConnector
from services.alpaca_connector import AlpacaConnector
from services.tradier_connector import TradierConnector

class BrokerFactory:
    """Factory to create broker connectors for users"""
    
    @staticmethod
    def create_connector(user_id: int, broker_name: str = None):
        """
        Create broker connector for user
        
        Args:
            user_id: User ID
            broker_name: Optional broker name, otherwise uses user's connection
        
        Returns:
            Broker connector instance or None
        """
        from models.broker_connection import BrokerConnection
        from app import db
        
        # Get user's broker connection
        connection = db.session.query(BrokerConnection).filter_by(
            user_id=user_id
        ).first()
        
        if not connection or connection.connection_status != 'connected':
            return None
        
        broker_name = broker_name or connection.broker_name
        credentials = connection.get_decrypted_credentials()
        
        if broker_name == 'tastytrade':
            return TastytradeConnector(
                api_key=credentials['api_key'],
                api_secret=credentials['api_secret'],
                account_id=credentials['account_id']
            )
        elif broker_name == 'ibkr':
            return IBKRConnector(
                api_key=credentials['api_key'],
                api_secret=credentials['api_secret'],
                account_id=credentials['account_id']
            )
        elif broker_name == 'alpaca':
            return AlpacaConnector(
                api_key=credentials['api_key'],
                api_secret=credentials['api_secret']
            )
        elif broker_name == 'tradier':
            return TradierConnector(
                api_key=credentials['api_key'],
                api_secret=credentials['api_secret'],
                account_id=credentials['account_id']
            )
        
        return None
```

---

## 🔄 Updated TradeExecutor

```python
# services/trade_executor.py - Update execute_trade method

def execute_trade(self, user_id: int, ...):
    """Execute a trade"""
    user = db.session.query(User).get(user_id)
    
    if user.trading_mode == 'paper':
        # Paper trading - simulate order (existing logic)
        order_result = {'order': {'id': f"PAPER_{timestamp}", 'status': 'filled'}}
        # ... update paper balance ...
    
    else:  # Live trading
        # Get user's broker connector
        from services.broker_factory import BrokerFactory
        broker = BrokerFactory.create_connector(user_id)
        
        if not broker:
            raise ValueError(
                "No broker connection found. Please connect your broker account in Settings."
            )
        
        # Verify connection
        if not broker.verify_connection():
            raise ValueError(
                "Broker connection failed. Please reconnect your account in Settings."
            )
        
        # Place real order in user's account
        order_result = broker.place_order(
            symbol=symbol,
            side=action,
            quantity=quantity,
            order_type='market' if price is None else 'limit',
            price=price,
            option_symbol=option_symbol
        )
    
    # ... rest of trade execution logic ...
```

---

## 🌐 API Endpoints

### Broker Connection Management

```python
# api/broker.py
from flask import Blueprint, request, jsonify
from utils.decorators import token_required
from models.broker_connection import BrokerConnection

broker_bp = Blueprint('broker', __name__)

@broker_bp.route('/connection', methods=['GET'])
@token_required
def get_broker_connection(current_user):
    """Get user's broker connection status"""
    connection = BrokerConnection.query.filter_by(user_id=current_user.id).first()
    
    if not connection:
        return jsonify({
            'connected': False,
            'broker_name': None,
            'status': 'disconnected'
        }), 200
    
    return jsonify({
        'connected': connection.connection_status == 'connected',
        'broker_name': connection.broker_name,
        'account_number': connection.account_number,  # Last 4 digits
        'account_type': connection.account_type,
        'buying_power': connection.buying_power,
        'last_verified_at': connection.last_verified_at.isoformat() if connection.last_verified_at else None,
        'status': connection.connection_status
    }), 200

@broker_bp.route('/connection', methods=['POST'])
@token_required
def connect_broker(current_user):
    """Connect user's broker account"""
    data = request.get_json()
    
    broker_name = data.get('broker_name')  # 'tastytrade', 'ibkr', etc.
    api_key = data.get('api_key')
    api_secret = data.get('api_secret')
    account_id = data.get('account_id')  # Optional
    
    # Validate broker name
    supported_brokers = ['tastytrade', 'ibkr', 'alpaca', 'tradier']
    if broker_name not in supported_brokers:
        return jsonify({'error': f'Unsupported broker: {broker_name}'}), 400
    
    # Validate credentials
    if not api_key or not api_secret:
        return jsonify({'error': 'API key and secret required'}), 400
    
    # Test connection
    from services.broker_factory import BrokerFactory
    test_connector = BrokerFactory.create_test_connector(
        broker_name, api_key, api_secret, account_id
    )
    
    if not test_connector.verify_connection():
        return jsonify({'error': 'Invalid credentials or connection failed'}), 400
    
    # Get account info
    account_info = test_connector.get_account_info()
    
    # Create or update connection
    connection = BrokerConnection.query.filter_by(user_id=current_user.id).first()
    if not connection:
        connection = BrokerConnection(user_id=current_user.id)
        db.session.add(connection)
    
    connection.broker_name = broker_name
    connection.encrypt_credentials(api_key, api_secret, account_id)
    connection.connection_status = 'connected'
    connection.account_number = account_info.get('account_number', '')[-4:]  # Last 4 digits
    connection.account_type = account_info.get('account_type')
    connection.buying_power = account_info.get('buying_power')
    connection.last_connected_at = datetime.utcnow()
    connection.last_verified_at = datetime.utcnow()
    connection.connection_error = None
    
    # Update user
    current_user.has_broker_connection = True
    
    db.session.commit()
    
    return jsonify({
        'message': 'Broker account connected successfully',
        'broker_name': broker_name,
        'account_number': connection.account_number
    }), 200

@broker_bp.route('/connection', methods=['DELETE'])
@token_required
def disconnect_broker(current_user):
    """Disconnect user's broker account"""
    connection = BrokerConnection.query.filter_by(user_id=current_user.id).first()
    
    if connection:
        # Clear credentials
        connection.encrypted_api_key = None
        connection.encrypted_api_secret = None
        connection.encrypted_account_id = None
        connection.connection_status = 'disconnected'
        connection.connection_error = None
        
        current_user.has_broker_connection = False
        current_user.trading_mode = 'paper'  # Force back to paper trading
        
        db.session.commit()
    
    return jsonify({'message': 'Broker account disconnected'}), 200

@broker_bp.route('/connection/verify', methods=['POST'])
@token_required
def verify_connection(current_user):
    """Verify broker connection is still valid"""
    connection = BrokerConnection.query.filter_by(user_id=current_user.id).first()
    
    if not connection or connection.connection_status != 'connected':
        return jsonify({'error': 'No active broker connection'}), 400
    
    from services.broker_factory import BrokerFactory
    broker = BrokerFactory.create_connector(current_user.id)
    
    if not broker or not broker.verify_connection():
        connection.connection_status = 'error'
        connection.connection_error = 'Connection verification failed'
        db.session.commit()
        return jsonify({'error': 'Connection verification failed'}), 400
    
    # Update account info
    account_info = broker.get_account_info()
    connection.buying_power = account_info.get('buying_power')
    connection.last_verified_at = datetime.utcnow()
    connection.connection_error = None
    db.session.commit()
    
    return jsonify({
        'message': 'Connection verified',
        'buying_power': connection.buying_power
    }), 200
```

---

## 🎨 Frontend Settings UI

### Settings Page - Broker Connection Section

```typescript
// frontend/src/pages/Settings.tsx - Add broker connection section

const [brokerConnection, setBrokerConnection] = useState<any>(null);
const [connectingBroker, setConnectingBroker] = useState(false);
const [brokerName, setBrokerName] = useState('');
const [apiKey, setApiKey] = useState('');
const [apiSecret, setApiSecret] = useState('');
const [accountId, setAccountId] = useState('');

// Load broker connection status
useEffect(() => {
  loadBrokerConnection();
}, []);

const loadBrokerConnection = async () => {
  try {
    const response = await api.get('/broker/connection');
    setBrokerConnection(response.data);
  } catch (error) {
    console.error('Failed to load broker connection:', error);
  }
};

const handleConnectBroker = async () => {
  if (!brokerName || !apiKey || !apiSecret) {
    toast.error('Please fill in all required fields');
    return;
  }
  
  setConnectingBroker(true);
  try {
    await api.post('/broker/connection', {
      broker_name: brokerName,
      api_key: apiKey,
      api_secret: apiSecret,
      account_id: accountId || undefined
    });
    
    toast.success('Broker account connected successfully!');
    setApiKey('');
    setApiSecret('');
    setAccountId('');
    loadBrokerConnection();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to connect broker');
  } finally {
    setConnectingBroker(false);
  }
};

const handleDisconnectBroker = async () => {
  if (!confirm('Disconnect your broker account? You will need to reconnect to trade live.')) {
    return;
  }
  
  try {
    await api.delete('/broker/connection');
    toast.success('Broker account disconnected');
    loadBrokerConnection();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to disconnect');
  }
};

// In JSX:
<div className="bg-white rounded-lg shadow p-6 mb-6">
  <h2 className="text-xl font-bold mb-4">Broker Connection</h2>
  
  {brokerConnection?.connected ? (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-semibold">Connected to {brokerConnection.broker_name}</p>
          <p className="text-sm text-gray-600">
            Account: ••••{brokerConnection.account_number}
          </p>
          <p className="text-sm text-gray-600">
            Buying Power: ${brokerConnection.buying_power?.toLocaleString() || 'N/A'}
          </p>
        </div>
        <button
          onClick={handleDisconnectBroker}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Disconnect
        </button>
      </div>
    </div>
  ) : (
    <div>
      <p className="mb-4 text-gray-600">
        Connect your broker account to enable live trading. Your credentials are encrypted and stored securely.
      </p>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Broker</label>
          <select
            value={brokerName}
            onChange={(e) => setBrokerName(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="">Select broker...</option>
            <option value="tastytrade">Tastytrade</option>
            <option value="ibkr">Interactive Brokers (IBKR)</option>
            <option value="alpaca">Alpaca</option>
            <option value="tradier">Tradier</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            placeholder="Enter your API key"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">API Secret</label>
          <input
            type="password"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            placeholder="Enter your API secret"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Account ID (Optional)</label>
          <input
            type="text"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            placeholder="Enter account ID if required"
          />
        </div>
        
        <button
          onClick={handleConnectBroker}
          disabled={connectingBroker}
          className="w-full px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
        >
          {connectingBroker ? 'Connecting...' : 'Connect Broker Account'}
        </button>
      </div>
    </div>
  )}
</div>
```

---

## 🔄 Trading Mode Toggle

```typescript
// Add to Settings page

const handleToggleTradingMode = async (mode: 'paper' | 'live') => {
  if (mode === 'live' && !brokerConnection?.connected) {
    toast.error('Please connect a broker account first');
    return;
  }
  
  if (mode === 'live') {
    if (!confirm('Switch to LIVE trading? Real money will be used. Are you sure?')) {
      return;
    }
  }
  
  try {
    await api.put('/auth/user', { trading_mode: mode });
    toast.success(`Switched to ${mode} trading mode`);
    window.location.reload();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to switch trading mode');
  }
};

// In JSX:
<div className="bg-white rounded-lg shadow p-6 mb-6">
  <h2 className="text-xl font-bold mb-4">Trading Mode</h2>
  
  <div className="flex items-center space-x-4">
    <button
      onClick={() => handleToggleTradingMode('paper')}
      className={`px-4 py-2 rounded ${
        user?.trading_mode === 'paper'
          ? 'bg-primary text-white'
          : 'bg-gray-200 text-gray-700'
      }`}
    >
      Paper Trading
    </button>
    
    <button
      onClick={() => handleToggleTradingMode('live')}
      disabled={!brokerConnection?.connected}
      className={`px-4 py-2 rounded ${
        user?.trading_mode === 'live'
          ? 'bg-red-600 text-white'
          : 'bg-gray-200 text-gray-700'
      } ${!brokerConnection?.connected ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      Live Trading
    </button>
  </div>
  
  {user?.trading_mode === 'paper' && (
    <p className="mt-2 text-sm text-gray-600">
      Using virtual money. No real trades will be executed.
    </p>
  )}
  
  {user?.trading_mode === 'live' && (
    <p className="mt-2 text-sm text-red-600 font-semibold">
      ⚠️ LIVE MODE: Real money will be used for trades!
    </p>
  )}
  
  {!brokerConnection?.connected && user?.trading_mode === 'live' && (
    <p className="mt-2 text-sm text-yellow-600">
      Connect a broker account to enable live trading.
    </p>
  )}
</div>
```

---

## 🔒 Security Considerations

1. **Encryption at Rest**
   - All credentials encrypted using Fernet (symmetric encryption)
   - Encryption key stored in environment variable
   - Never log credentials

2. **API Security**
   - Credentials only sent over HTTPS
   - Never returned in API responses
   - Only last 4 digits of account number displayed

3. **Connection Verification**
   - Test connection before storing credentials
   - Periodic verification of active connections
   - Auto-disconnect on verification failure

4. **Access Control**
   - Users can only access their own connections
   - No cross-user credential access
   - Admin access for support (with audit logging)

---

## 📋 Implementation Checklist

- [ ] Create `BrokerConnection` model
- [ ] Create encryption utility
- [ ] Create broker connector implementations (Tastytrade, IBKR, Alpaca)
- [ ] Create broker factory
- [ ] Update TradeExecutor to use user-specific connectors
- [ ] Create broker API endpoints
- [ ] Update Settings UI with broker connection form
- [ ] Add trading mode toggle
- [ ] Add connection verification
- [ ] Add migration script
- [ ] Add tests
- [ ] Update documentation

---

## 🚀 Migration Path

1. **Phase 1: Database Migration**
   - Add `broker_connections` table
   - Add encryption key to environment

2. **Phase 2: Backend Implementation**
   - Implement broker connectors
   - Implement API endpoints
   - Update TradeExecutor

3. **Phase 3: Frontend Implementation**
   - Add broker connection UI
   - Add trading mode toggle
   - Add connection status display

4. **Phase 4: Testing**
   - Test with paper trading (no changes)
   - Test broker connection flow
   - Test live trading with test accounts

5. **Phase 5: Documentation**
   - User guide for connecting brokers
   - Security documentation
   - API documentation

---

## 💡 Key Benefits

1. **User Control**: Each user connects their own account
2. **Security**: Credentials encrypted at rest
3. **Flexibility**: Support multiple brokers
4. **Seamless Transition**: Easy switch from paper to live
5. **No Shared Accounts**: Each user's trades go to their account

