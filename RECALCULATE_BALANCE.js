// ============================================
// RECALCULATE PAPER TRADING BALANCE
// ============================================
// This will recalculate your balance from scratch based on all trades
// Use this AFTER reverting trades if the balance is still incorrect
// Copy and paste this entire code into your browser console

(async function recalculateBalance() {
  console.log('💰 Starting balance recalculation...');
  
  const API_BASE = 'https://web-production-8b7ae.up.railway.app';
  
  // Step 1: Refresh token if needed
  const refreshToken = localStorage.getItem('refresh_token');
  let accessToken = localStorage.getItem('access_token');
  
  if (refreshToken) {
    try {
      console.log('🔄 Refreshing access token...');
      const refreshResponse = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${refreshToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        if (refreshData.access_token) {
          accessToken = refreshData.access_token;
          localStorage.setItem('access_token', accessToken);
          console.log('✅ Token refreshed successfully');
        }
      }
    } catch (error) {
      console.warn('⚠️ Token refresh error:', error.message);
    }
  }
  
  if (!accessToken) {
    alert('❌ No access token found. Please log in first.');
    return;
  }
  
  // Step 2: Recalculate balance
  try {
    console.log('📤 Sending recalculation request...');
    const response = await fetch(`${API_BASE}/api/trades/recalculate-balance`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS!', data);
      console.log(`💰 Old Balance: $${data.old_balance.toLocaleString()}`);
      console.log(`💰 New Balance: $${data.new_balance.toLocaleString()}`);
      console.log(`📊 Difference: $${data.difference.toLocaleString()}`);
      console.log(`📝 Trades Processed: ${data.trades_processed}`);
      
      alert(
        `✅ Balance Recalculated!\n\n` +
        `Old Balance: $${data.old_balance.toLocaleString()}\n` +
        `New Balance: $${data.new_balance.toLocaleString()}\n` +
        `Difference: $${data.difference.toLocaleString()}\n\n` +
        `Trades Processed: ${data.trades_processed}\n\n` +
        `The page will reload in 3 seconds...`
      );
      
      setTimeout(() => {
        window.location.reload();
      }, 3000);
      
    } else {
      const errorMsg = data.error || 'Unknown error';
      console.error('❌ Error:', errorMsg);
      alert(
        `❌ Recalculation Failed\n\n` +
        `Error: ${errorMsg}\n\n` +
        `Check the console for more details.`
      );
    }
    
  } catch (error) {
    console.error('❌ Network Error:', error);
    alert(
      `❌ Network Error\n\n` +
      `Could not connect to the server.\n\n` +
      `Error: ${error.message}`
    );
  }
})();

