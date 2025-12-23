// COMPLETE SOLUTION - Handles token refresh automatically
// Copy this entire code into browser console

async function revertTrades() {
  const baseUrl = 'https://web-production-8b7ae.up.railway.app';
  
  // Step 1: Get or refresh token
  let token = localStorage.getItem('access_token');
  const refreshToken = localStorage.getItem('refresh_token');
  
  console.log('🔑 Step 1: Checking authentication...');
  
  // Try to refresh token if we have a refresh token
  if (refreshToken && (!token || token.length < 50)) {
    console.log('🔄 Refreshing token...');
    try {
      const refreshResponse = await fetch(`${baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${refreshToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        if (refreshData.access_token) {
          token = refreshData.access_token;
          localStorage.setItem('access_token', token);
          console.log('✅ Token refreshed successfully');
        }
      }
    } catch (e) {
      console.warn('⚠️ Token refresh failed, using existing token:', e);
    }
  }
  
  if (!token) {
    alert('❌ Not logged in! Please log in first.');
    return;
  }
  
  console.log('✅ Token found:', token.substring(0, 20) + '...');
  
  // Step 2: Revert trades
  console.log('🔄 Step 2: Reverting trades from 12/23/25...');
  
  try {
    const response = await fetch(`${baseUrl}/api/trades/revert-incorrect-sells`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ date: '2025-12-23' })
    });
    
    console.log('📡 Response status:', response.status, response.statusText);
    
    const responseText = await response.text();
    console.log('📄 Raw response:', responseText);
    
    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, try to refresh and retry
        console.log('🔄 401 error - attempting token refresh and retry...');
        if (refreshToken) {
          try {
            const refreshResponse = await fetch(`${baseUrl}/api/auth/refresh`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${refreshToken}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              if (refreshData.access_token) {
                token = refreshData.access_token;
                localStorage.setItem('access_token', token);
                console.log('✅ Token refreshed, retrying...');
                
                // Retry the revert request
                const retryResponse = await fetch(`${baseUrl}/api/trades/revert-incorrect-sells`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ date: '2025-12-23' })
                });
                
                const retryText = await retryResponse.text();
                console.log('📄 Retry response:', retryText);
                
                if (!retryResponse.ok) {
                  throw new Error(`HTTP ${retryResponse.status}: ${retryText}`);
                }
                
                const data = JSON.parse(retryText);
                handleSuccess(data);
                return;
              }
            }
          } catch (refreshError) {
            console.error('❌ Token refresh failed:', refreshError);
          }
        }
        throw new Error('Authentication failed. Please log in again.');
      }
      throw new Error(`HTTP ${response.status}: ${responseText}`);
    }
    
    const data = JSON.parse(responseText);
    handleSuccess(data);
    
  } catch (error) {
    console.error('❌ Full error:', error);
    alert('❌ Error: ' + error.message + '\n\nCheck console (F12) for details.');
  }
}

function handleSuccess(data) {
  console.log('✅ Full response:', data);
  
  const reverted = data.reverted || 0;
  const reopened = data.positions_reopened || 0;
  const tradeIds = data.trade_ids || [];
  const positionIds = data.position_ids || [];
  
  console.log('📊 Summary:');
  console.log('  - Reverted trades:', reverted);
  console.log('  - Reopened positions:', reopened);
  console.log('  - Trade IDs:', tradeIds);
  console.log('  - Position IDs:', positionIds);
  
  if (reverted === 0) {
    alert(`⚠️ No trades found to revert.\n\nThis could mean:\n- No SELL trades on 12/23/25\n- Trades already reverted\n- Date format issue\n\nFull response:\n${JSON.stringify(data, null, 2)}`);
  } else {
    alert(`✅ SUCCESS!\n\nReverted: ${reverted} trades\nReopened: ${reopened} positions\n\nTrade IDs: ${tradeIds.join(', ') || 'N/A'}\nPosition IDs: ${positionIds.join(', ') || 'N/A'}\n\nPage will refresh in 2 seconds...`);
    setTimeout(() => {
      console.log('🔄 Refreshing page...');
      window.location.reload();
    }, 2000);
  }
}

// Run it
revertTrades();

