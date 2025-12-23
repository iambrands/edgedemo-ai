// Copy and paste this entire code into browser console
// This will revert trades from 12/23/25

const token = localStorage.getItem('access_token');
if (!token) {
  alert('❌ Not logged in! Please log in first.');
} else {
  console.log('🔄 Starting revert process...');
  console.log('Token found:', token.substring(0, 20) + '...');
  
  fetch('https://web-production-8b7ae.up.railway.app/api/trades/revert-incorrect-sells', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ date: '2025-12-23' })
  })
  .then(response => {
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    
    if (!response.ok) {
      return response.text().then(text => {
        console.error('Error response:', text);
        try {
          const errorData = JSON.parse(text);
          throw new Error(errorData.error || `HTTP ${response.status}: ${text}`);
        } catch (e) {
          throw new Error(`HTTP ${response.status}: ${text}`);
        }
      });
    }
    
    return response.json();
  })
  .then(data => {
    console.log('✅ Full response:', data);
    console.log('Reverted trades:', data.reverted);
    console.log('Reopened positions:', data.positions_reopened);
    console.log('Trade IDs:', data.trade_ids);
    console.log('Position IDs:', data.position_ids);
    console.log('Balance adjustments:', data.balance_adjustments);
    
    if (data.reverted === 0) {
      alert('⚠️ No trades found to revert.\n\nThis could mean:\n- No trades on 12/23/25\n- Trades already reverted\n- Date format issue\n\nCheck console for details.');
    } else {
      alert(`✅ SUCCESS!\n\nReverted: ${data.reverted} trades\nReopened: ${data.positions_reopened} positions\n\nTrade IDs: ${data.trade_ids?.join(', ') || 'N/A'}\nPosition IDs: ${data.position_ids?.join(', ') || 'N/A'}\n\nPage will refresh...`);
      setTimeout(() => window.location.reload(), 2000);
    }
  })
  .catch(error => {
    console.error('❌ Full error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    alert('❌ Error: ' + (error.message || 'Check console for details'));
  });
}

