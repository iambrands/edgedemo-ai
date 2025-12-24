// ============================================
// REVERT 12/23/25 TRADES - LATEST VERSION
// ============================================
// Copy and paste this entire code into your browser console
// Make sure you're logged into the app first

(async function revertTrades() {
  console.log('🔄 Starting revert process...');
  
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
  
  // Step 2: Revert trades
  try {
    console.log('📤 Sending revert request...');
    const response = await fetch(`${API_BASE}/api/trades/revert-incorrect-sells`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        date: '2025-12-23'  // Change this if you need a different date
        // To revert multiple dates, use REVERT_COMPREHENSIVE.js instead
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS!', data);
      console.log(`📊 Reverted: ${data.reverted} trades`);
      console.log(`📊 Reopened: ${data.positions_reopened} positions`);
      
      if (data.trade_ids && data.trade_ids.length > 0) {
        console.log('📝 Trade IDs reverted:', data.trade_ids);
      }
      
      if (data.position_ids && data.position_ids.length > 0) {
        console.log('📝 Position IDs reopened:', data.position_ids);
      }
      
      if (data.balance_adjustments) {
        console.log('💰 Balance adjustments:', data.balance_adjustments);
      }
      
      alert(
        `✅ Revert Successful!\n\n` +
        `Reverted: ${data.reverted} trades\n` +
        `Reopened: ${data.positions_reopened} positions\n\n` +
        `The page will reload in 3 seconds...`
      );
      
      // Reload page after 3 seconds
      setTimeout(() => {
        window.location.reload();
      }, 3000);
      
    } else {
      // Handle errors
      const errorMsg = data.error || 'Unknown error';
      console.error('❌ Error:', errorMsg);
      console.error('📄 Full response:', data);
      
      if (response.status === 401) {
        alert(
          '❌ Authentication Error\n\n' +
          'Your session may have expired. Please:\n' +
          '1. Log out and log back in\n' +
          '2. Try the revert command again\n\n' +
          `Error: ${errorMsg}`
        );
      } else {
        alert(
          `❌ Revert Failed\n\n` +
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
      `Error: ${error.message}\n\n` +
      `Check your internet connection and try again.`
    );
  }
})();

