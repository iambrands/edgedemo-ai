// ============================================
// REVERT RECENT SPY SELL (Incorrect Stock Price)
// ============================================
(async function revertSpySell() {
  console.log('🔄 Starting SPY sell revert process...');
  
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
  
  // Step 2: Get today's date
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  console.log(`📅 Reverting SPY sells from ${yesterday} and ${today}...`);
  
  // Step 3: Revert trades for today and yesterday (covers recent sells)
  try {
    const response = await fetch(`${API_BASE}/api/trades/revert-incorrect-sells`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        dates: [today, yesterday],
        symbol: 'SPY' // Filter by SPY only
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS!', data);
      console.log(`📊 Reverted: ${data.reverted || 0} trades`);
      console.log(`📊 Reopened: ${data.positions_reopened || 0} positions`);
      
      alert(
        `✅ SPY Sell Reverted!\n\n` +
        `Reverted: ${data.reverted || 0} SPY trades\n` +
        `Reopened: ${data.positions_reopened || 0} positions\n\n` +
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
      `Error: ${error.message}`
    );
  }
})();

