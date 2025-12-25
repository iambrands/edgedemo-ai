// ============================================
// CLEANUP BOGUS TRADES AND RECALCULATE BALANCE
// ============================================
(async function cleanupAndRecalculate() {
  console.log('🧹 Starting cleanup and balance recalculation...');
  
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
      } else {
        console.warn('⚠️ Token refresh failed, using existing token');
      }
    } catch (error) {
      console.warn('⚠️ Token refresh error:', error.message);
    }
  }
  
  if (!accessToken) {
    alert('❌ No access token found. Please log in first.');
    console.error('No access token available');
    return;
  }
  
  // Step 2: Get dates to clean up (bogus trades)
  // Modify these dates to match when your bogus trades occurred
  const datesToClean = ['2025-12-24', '2025-12-25']; // Add more dates if needed
  const symbolsToClean = ['SPY', 'QQQ']; // Optional: specific symbols, or [] for all
  
  console.log(`📅 Cleaning up trades from: ${datesToClean.join(', ')}`);
  if (symbolsToClean.length > 0) {
    console.log(`📊 Symbols to clean: ${symbolsToClean.join(', ')}`);
  }
  
  // Step 3: Cleanup and recalculate
  try {
    const response = await fetch(`${API_BASE}/api/trades/cleanup-and-recalculate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        dates: datesToClean,
        symbols: symbolsToClean.length > 0 ? symbolsToClean : undefined
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS!', data);
      console.log(`🗑️ Deleted: ${data.trades_deleted || 0} bogus trades`);
      console.log(`💰 Old Balance: $${data.old_balance?.toLocaleString() || 'N/A'}`);
      console.log(`💰 New Balance: $${data.new_balance?.toLocaleString() || 'N/A'}`);
      console.log(`📊 Difference: $${data.difference?.toLocaleString() || 'N/A'}`);
      console.log(`📈 Active Positions: ${data.active_positions || 0}`);
      
      if (data.deleted_trades && data.deleted_trades.length > 0) {
        console.log('🗑️ Deleted trades:', data.deleted_trades);
      }
      
      if (data.active_positions_details && data.active_positions_details.length > 0) {
        console.log('📈 Active positions:', data.active_positions_details);
      }
      
      alert(
        `✅ Cleanup Complete!\n\n` +
        `Deleted: ${data.trades_deleted || 0} bogus trades\n\n` +
        `Old Balance: $${data.old_balance?.toLocaleString() || 'N/A'}\n` +
        `New Balance: $${data.new_balance?.toLocaleString() || 'N/A'}\n` +
        `Difference: $${data.difference?.toLocaleString() || 'N/A'}\n\n` +
        `Active Positions: ${data.active_positions || 0}\n\n` +
        `The page will reload in 3 seconds...`
      );
      
      setTimeout(() => {
        window.location.reload();
      }, 3000);
      
    } else {
      const errorMsg = data.error || 'Unknown error';
      console.error('❌ Error:', errorMsg);
      
      if (response.status === 401) {
        alert(
          '❌ Authentication Error\n\n' +
          'Your session may have expired. Please:\n' +
          '1. Log out and log back in\n' +
          '2. Try again\n\n' +
          `Error: ${errorMsg}`
        );
      } else {
        alert(
          `❌ Cleanup Failed\n\n` +
          `Error: ${errorMsg}\n\n` +
          `Check the console for more details.`
        );
      }
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

