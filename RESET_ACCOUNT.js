// ============================================
// RESET ACCOUNT - Clear All Positions and Trades
// ============================================
(async function resetAccount() {
  console.log('🔄 Starting account reset...');
  
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
  
  // Step 2: Confirm reset
  const confirmed = confirm(
    '⚠️ WARNING: This will DELETE ALL positions, trades, and automations!\n\n' +
    'Your balance will be reset to $100,000.\n\n' +
    'This action CANNOT be undone!\n\n' +
    'Are you absolutely sure you want to reset your account?'
  );
  
  if (!confirmed) {
    console.log('❌ Account reset cancelled by user');
    return;
  }
  
  // Step 3: Reset account
  try {
    console.log('🗑️ Resetting account...');
    const response = await fetch(`${API_BASE}/api/account/reset`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS!', data);
      console.log(`🗑️ Deleted: ${data.deleted?.positions || 0} positions`);
      console.log(`🗑️ Deleted: ${data.deleted?.trades || 0} trades`);
      console.log(`🗑️ Deleted: ${data.deleted?.automations || 0} automations`);
      console.log(`💰 New Balance: $${data.new_balance?.toLocaleString() || 'N/A'}`);
      
      alert(
        `✅ Account Reset Complete!\n\n` +
        `Deleted:\n` +
        `- ${data.deleted?.positions || 0} positions\n` +
        `- ${data.deleted?.trades || 0} trades\n` +
        `- ${data.deleted?.automations || 0} automations\n\n` +
        `New Balance: $${data.new_balance?.toLocaleString() || 'N/A'}\n\n` +
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
          `❌ Reset Failed\n\n` +
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

