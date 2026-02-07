import React, { useState, useEffect } from 'react';

const TradingDisclaimer: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const wasDismissed = sessionStorage.getItem('disclaimer_dismissed');
    if (wasDismissed === 'true') {
      setDismissed(true);
    }
  }, []);

  if (dismissed) return null;

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
      <div className="px-4 py-3 flex items-start justify-between">
        <div className="flex items-start">
          <span className="text-yellow-600 mr-3 text-lg flex-shrink-0 mt-0.5">&#9888;&#65039;</span>
          <p className="text-sm text-yellow-800">
            <strong>Risk Disclosure:</strong> Options trading involves substantial risk of loss and is not suitable for all investors.
            You could lose your entire investment. Past performance does not guarantee future results.
            AI-generated signals are not guaranteed to be accurate or profitable.
            This platform is for informational purposes only and does not constitute investment advice.{' '}
            <a href="/terms" className="underline font-medium hover:text-yellow-900">Terms of Service</a>
          </p>
        </div>
        <button
          onClick={() => {
            setDismissed(true);
            sessionStorage.setItem('disclaimer_dismissed', 'true');
          }}
          className="text-yellow-600 hover:text-yellow-800 ml-4 flex-shrink-0 text-lg leading-none"
          aria-label="Dismiss disclaimer"
        >
          &times;
        </button>
      </div>
    </div>
  );
};

export default TradingDisclaimer;
