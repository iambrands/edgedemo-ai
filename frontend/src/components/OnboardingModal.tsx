import React, { useState } from 'react';

interface OnboardingModalProps {
  onComplete: () => void;
  onSkip: () => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: 'Welcome to OptionsEdge! 🎉',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            You're all set! You start with <strong className="text-primary">$100,000 in paper trading funds</strong> so you can learn and test strategies with no real money at risk.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>💡 Paper trading</strong> uses virtual money only. Switch to live trading in Settings when you're ready (and when your account is approved).
            </p>
          </div>
          <p className="text-gray-700">
            This short tour will show you where everything lives so you can get started quickly.
          </p>
        </div>
      ),
      icon: '👋',
    },
    {
      title: 'Dashboard – Your Home Base 📊',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            Your <strong>Dashboard</strong> is where you see the big picture:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-2">
            <li><strong>Today's Opportunities:</strong> High-confidence signals from your watchlist and popular symbols</li>
            <li><strong>Market Movers:</strong> High-volume, high-volatility stocks</li>
            <li><strong>AI Suggestions:</strong> Personalized ideas based on your preferences</li>
            <li><strong>Unusual Options Activity:</strong> Whale flow (top trades by contracts or most unusual)</li>
            <li><strong>Upcoming Earnings:</strong> Dates for your watchlist symbols</li>
            <li><strong>Active Positions:</strong> Open trades with live P/L</li>
            <li><strong>Recent Trades:</strong> Your latest history</li>
          </ul>
          <p className="text-sm text-gray-600 mt-4">
            💡 Use <strong>Quick Scan</strong> for instant opportunities, or click any card to open the Options Analyzer for that symbol.
          </p>
        </div>
      ),
      icon: '📊',
    },
    {
      title: 'Options Analyzer – Find Trades 🔍',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            The <strong>Options Analyzer</strong> helps you pick and evaluate options:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-2">
            <li>Enter any symbol (e.g., AAPL, TSLA, AMD)</li>
            <li>Pick an expiration and strategy style (Income, Balanced, Growth)</li>
            <li>Get AI scoring and plain-English explanations</li>
            <li>See Greeks, liquidity, and bid/ask spread</li>
          </ul>
          <p className="text-sm text-gray-600 mt-4">
            💡 Prefer high scores (80+), solid volume/open interest, and tighter spreads.
          </p>
        </div>
      ),
      icon: '🔍',
    },
    {
      title: 'Automations – Hands-Free Trading 🤖',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            <strong>Automations</strong> run strategies for you:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-2">
            <li>Set entry rules (symbol, strategy type, min confidence, quantity)</li>
            <li>Set exit rules (profit target %, stop loss %, max days)</li>
            <li>Start the Engine so it scans and trades during market hours</li>
            <li>Use Diagnostics to see why an automation did or didn't fire</li>
          </ul>
          <p className="text-sm text-gray-600 mt-4">
            💡 Start with one automation and use <strong>Test Trade</strong> to confirm settings. The engine runs about every 15 minutes.
          </p>
        </div>
      ),
      icon: '🤖',
    },
    {
      title: 'Watchlist & Trade 📈',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            <strong>Watchlist</strong> – Add symbols you follow; prices and earnings show on the Dashboard. Use &quot;Analyze Options&quot; to jump into the Analyzer.
          </p>
          <p className="text-gray-700">
            <strong>Trade</strong> – Place single-option or spread trades. Choose symbol, expiration, strike, and quantity. Use &quot;Fetch price&quot; for current bid/ask or enter a limit price.
          </p>
          <p className="text-sm text-gray-600 mt-4">
            💡 Set your <strong>timezone</strong> in Settings so all times (earnings, alerts, history) match your location.
          </p>
        </div>
      ),
      icon: '📈',
    },
    {
      title: "You're Ready 🚀",
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            Recommended next steps:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-2">
            <li>Add a few symbols to your <strong>Watchlist</strong></li>
            <li>Open <strong>Opportunities</strong> and try <strong>Quick Scan</strong> or click a signal</li>
            <li>Use the <strong>Options Analyzer</strong> to review a trade idea</li>
            <li>Place a <strong>paper trade</strong> from the Trade page</li>
            <li>Set <strong>Risk Management</strong> (stop loss / profit target) in Settings</li>
            <li>When comfortable, create an <strong>Automation</strong> and start the Engine</li>
          </ol>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
            <p className="text-sm text-green-800">
              <strong>Need help?</strong> Go to <strong>Help</strong> in the menu for guides and FAQ.
            </p>
          </div>
        </div>
      ),
      icon: '🚀',
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">{steps[currentStep].icon}</span>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{steps[currentStep].title}</h2>
              <p className="text-sm text-gray-500">
                Step {currentStep + 1} of {steps.length}
              </p>
            </div>
          </div>
          <button
            onClick={onSkip}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            aria-label="Skip tour"
          >
            ×
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-gray-200">
          <div
            className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="min-h-[200px]">
            {steps[currentStep].content}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <button
            onClick={onSkip}
            className="text-gray-600 hover:text-gray-800 font-medium"
          >
            Skip Tour
          </button>
          <div className="flex items-center space-x-3">
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-all"
              >
                Previous
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 font-medium transition-all shadow-lg hover:shadow-xl"
            >
              {currentStep === steps.length - 1 ? 'Get Started!' : 'Next'}
            </button>
          </div>
        </div>

        {/* Step Indicators */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-center space-x-2">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`h-2 w-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'bg-indigo-600 w-8'
                    : index < currentStep
                    ? 'bg-indigo-300'
                    : 'bg-gray-300'
                }`}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;

