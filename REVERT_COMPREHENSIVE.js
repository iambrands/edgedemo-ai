// ============================================
// COMPREHENSIVE REVERT - Handles multiple dates and shows details
// ============================================
// This version will revert trades from 12/23/25 AND 12/24/25
// Copy and paste this entire code into your browser console

(async function revertAllTrades() {
  console.log('🔄 Starting comprehensive revert process...');
  
  const API_BASE = 'https://web-production-8b7ae.up.railway.app';
  const DATES_TO_REVERT = ['2025-12-23', '2025-12-24']; // Add more dates if needed
  
  // NEW: Try single request with multiple dates first (more efficient)
  const USE_SINGLE_REQUEST = true; // Set to false to process dates separately
  
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
  
  // Step 2: Revert trades for each date
  let totalReverted = 0;
  let totalReopened = 0;
  const results = [];
  
  for (const date of DATES_TO_REVERT) {
    try {
      console.log(`\n📅 Processing date: ${date}...`);
      const response = await fetch(`${API_BASE}/api/trades/revert-incorrect-sells`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ date })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        const reverted = data.reverted || 0;
        const reopened = data.positions_reopened || 0;
        
        totalReverted += reverted;
        totalReopened += reopened;
        
        results.push({
          date,
          reverted,
          reopened,
          tradeIds: data.trade_ids || [],
          positionIds: data.position_ids || []
        });
        
        console.log(`✅ ${date}: Reverted ${reverted} trades, Reopened ${reopened} positions`);
        
        if (reverted === 0) {
          console.log(`   ⚠️ No trades found for ${date}`);
        }
      } else {
        const errorMsg = data.error || 'Unknown error';
        console.error(`❌ Error for ${date}:`, errorMsg);
        results.push({ date, error: errorMsg });
      }
    } catch (error) {
      console.error(`❌ Network error for ${date}:`, error);
      results.push({ date, error: error.message });
    }
  }
  
  // Step 3: Show summary
  console.log('\n📊 SUMMARY:');
  console.log(`Total Reverted: ${totalReverted} trades`);
  console.log(`Total Reopened: ${totalReopened} positions`);
  console.log('\nDetailed Results:', results);
  
  if (totalReverted > 0) {
    alert(
      `✅ Revert Complete!\n\n` +
      `Reverted: ${totalReverted} trades\n` +
      `Reopened: ${totalReopened} positions\n\n` +
      `Dates processed: ${DATES_TO_REVERT.join(', ')}\n\n` +
      `The page will reload in 3 seconds...`
    );
    
    setTimeout(() => {
      window.location.reload();
    }, 3000);
  } else {
    alert(
      `⚠️ No Trades Reverted\n\n` +
      `No SELL trades found for the specified dates:\n` +
      `${DATES_TO_REVERT.join(', ')}\n\n` +
      `This could mean:\n` +
      `- Trades were already reverted\n` +
      `- No SELL trades exist for these dates\n` +
      `- Check the console for details`
    );
  }
})();

