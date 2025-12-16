import React, { useState } from 'react';

interface OnboardingModalProps {
  onComplete: () => void;
  onSkip: () => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: 'Welcome to IAB OptionsBot! 🎉',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            You're all set! You've been given <strong className="text-primary">$100,000 in paper trading funds</strong> to get started.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>💡 Paper Trading:</strong> This is virtual money for learning. No real money at risk!
            </p>
          </div>
          <p className="text-gray-700">
            Let's take a quick tour of the platform to get you started.
          </p>
        </div>
      ),
      icon: '👋',
    },
    {
      title: 'Dashboard - Your Command Center 📊',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            Your <strong>Dashboard</strong> shows everything you need:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-2">
            <li><strong>Active Positions:</strong> See all your open trades</li>
            <li><strong>P/L Tracking:</strong> Monitor your profits and losses</li>
            <li><strong>Performance Charts:</strong> Track your trading progress</li>
            <li><strong>Recent Trades:</strong> Review your trade history</li>
          </ul>
          <p className="text-sm text-gray-600 mt-4">
            💡 <strong>Tip:</strong> Click "Details" on any position to see full information including AI analysis!
          </p>
        </div>
      ),
      icon: '📊',
    },
    {
      title: 'Options Analyzer - Find Great Trades 🔍',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            The <strong>Options Analyzer</strong> helps you find the best options trades:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-2">
            <li>Enter any stock symbol (e.g., AAPL, TSLA, MSFT)</li>
            <li>Select an expiration date</li>
            <li>Get AI-powered scoring and recommendations</li>
            <li>See detailed Greeks and risk metrics</li>
          </ul>
          <p className="text-sm text-gray-600 mt-4">
            💡 <strong>Tip:</strong> Look for options with high scores and good liquidity (volume & open interest)!
          </p>
        </div>
      ),
      icon: '🔍',
    },
    {
      title: 'Automations - Set It & Forget It 🤖',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            <strong>Automations</strong> let you trade automatically:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-2">
            <li>Set entry conditions (e.g., "Buy when RSI &lt; 30")</li>
            <li>Set exit conditions (profit target, stop loss)</li>
            <li>Let the system trade for you automatically</li>
            <li>Monitor positions and execute exits</li>
          </ul>
          <p className="text-sm text-gray-600 mt-4">
            💡 <strong>Tip:</strong> Start with one automation to test it out. The system checks every 15 minutes!
          </p>
        </div>
      ),
      icon: '🤖',
    },
    {
      title: 'Watchlist - Track Your Stocks 📈',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            Your <strong>Watchlist</strong> helps you track stocks:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-2">
            <li>Add stocks you're interested in</li>
            <li>See real-time prices</li>
            <li>Add notes and tags</li>
            <li>Quick access to analyze options</li>
          </ul>
          <p className="text-sm text-gray-600 mt-4">
            💡 <strong>Tip:</strong> Add stocks you're watching, then use the Options Analyzer to find trades!
          </p>
        </div>
      ),
      icon: '📈',
    },
    {
      title: 'You\'re Ready to Start! 🚀',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            Here's what to do next:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-2">
            <li><strong>Add stocks to your Watchlist</strong> (stocks you want to trade)</li>
            <li><strong>Use Options Analyzer</strong> to find good trades</li>
            <li><strong>Execute trades</strong> from the Trade page</li>
            <li><strong>Monitor positions</strong> on your Dashboard</li>
            <li><strong>Create automations</strong> for hands-free trading</li>
          </ol>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
            <p className="text-sm text-green-800">
              <strong>✅ Remember:</strong> You're in paper trading mode. Experiment and learn risk-free!
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

