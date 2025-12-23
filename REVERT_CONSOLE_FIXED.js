// IMPROVED VERSION - Copy this entire code into browser console
// This will show you exactly what's happening

const token = localStorage.getItem('access_token');
if (!token) {
  alert('❌ Not logged in! Please log in first.');
} else {
  console.log('🔄 Starting revert process...');
  console.log('Date: 2025-12-23');
  
  fetch('https://web-production-8b7ae.up.railway.app/api/trades/revert-incorrect-sells', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ date: '2025-12-23' })
  })
  .then(async response => {
    console.log('📡 Response status:', response.status, response.statusText);
    
    const responseText = await response.text();
    console.log('📄 Raw response:', responseText);
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        errorData = { error: responseText };
      }
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    
    try {
      return JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse JSON:', e);
      throw new Error('Invalid JSON response: ' + responseText.substring(0, 100));
    }
  })
  .then(data => {
    console.log('✅ Parsed response:', data);
    console.log('Type of data:', typeof data);
    console.log('Keys in data:', Object.keys(data));
    
    const reverted = data.reverted || data.reverted_count || 0;
    const reopened = data.positions_reopened || data.reopened_count || 0;
    const tradeIds = data.trade_ids || data.trades || [];
    const positionIds = data.position_ids || data.positions || [];
    
    console.log('📊 Summary:');
    console.log('  - Reverted trades:', reverted);
    console.log('  - Reopened positions:', reopened);
    console.log('  - Trade IDs:', tradeIds);
    console.log('  - Position IDs:', positionIds);
    
    if (reverted === 0) {
      alert(`⚠️ No trades found to revert.\n\nResponse: ${JSON.stringify(data, null, 2)}\n\nThis could mean:\n- No SELL trades on 12/23/25\n- Trades already reverted\n- Date format issue\n\nCheck console for full details.`);
    } else {
      alert(`✅ SUCCESS!\n\nReverted: ${reverted} trades\nReopened: ${reopened} positions\n\nTrade IDs: ${tradeIds.join(', ') || 'N/A'}\nPosition IDs: ${positionIds.join(', ') || 'N/A'}\n\nPage will refresh in 2 seconds...`);
      setTimeout(() => {
        console.log('🔄 Refreshing page...');
        window.location.reload();
      }, 2000);
    }
  })
  .catch(error => {
    console.error('❌ Full error object:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    alert('❌ Error occurred!\n\n' + error.message + '\n\nCheck console (F12) for full details.');
  });
}

