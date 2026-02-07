import React, { useState } from 'react';

interface Props {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

const RiskAcknowledgmentModal: React.FC<Props> = ({ isOpen, onAccept, onDecline }) => {
  const [acknowledged, setAcknowledged] = useState({
    lossRisk: false,
    notAdvice: false,
    noGuarantee: false,
    ownResponsibility: false,
    readTerms: false,
  });

  const allAcknowledged = Object.values(acknowledged).every((v) => v);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          <span className="text-3xl mr-3">&#9888;&#65039;</span>
          Risk Acknowledgment Required
        </h2>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800 font-semibold text-sm">
            Before using OptionsEdge for trading, you must acknowledge that you understand the risks involved.
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <label className="flex items-start gap-3 cursor-pointer p-3 hover:bg-gray-50 rounded">
            <input
              type="checkbox"
              checked={acknowledged.lossRisk}
              onChange={(e) => setAcknowledged({ ...acknowledged, lossRisk: e.target.checked })}
              className="mt-1 h-5 w-5 flex-shrink-0"
            />
            <span className="text-sm">
              I understand that <strong>options trading involves substantial risk of loss</strong> and I could lose my
              entire investment or more.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer p-3 hover:bg-gray-50 rounded">
            <input
              type="checkbox"
              checked={acknowledged.notAdvice}
              onChange={(e) => setAcknowledged({ ...acknowledged, notAdvice: e.target.checked })}
              className="mt-1 h-5 w-5 flex-shrink-0"
            />
            <span className="text-sm">
              I understand that OptionsEdge <strong>does not provide investment advice</strong> and all content is for
              informational purposes only.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer p-3 hover:bg-gray-50 rounded">
            <input
              type="checkbox"
              checked={acknowledged.noGuarantee}
              onChange={(e) => setAcknowledged({ ...acknowledged, noGuarantee: e.target.checked })}
              className="mt-1 h-5 w-5 flex-shrink-0"
            />
            <span className="text-sm">
              I understand that <strong>AI-generated signals are not guaranteed</strong> to be accurate or profitable,
              and past performance does not guarantee future results.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer p-3 hover:bg-gray-50 rounded">
            <input
              type="checkbox"
              checked={acknowledged.ownResponsibility}
              onChange={(e) => setAcknowledged({ ...acknowledged, ownResponsibility: e.target.checked })}
              className="mt-1 h-5 w-5 flex-shrink-0"
            />
            <span className="text-sm">
              I understand that <strong>I am solely responsible</strong> for my trading decisions and any losses
              incurred.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer p-3 hover:bg-gray-50 rounded">
            <input
              type="checkbox"
              checked={acknowledged.readTerms}
              onChange={(e) => setAcknowledged({ ...acknowledged, readTerms: e.target.checked })}
              className="mt-1 h-5 w-5 flex-shrink-0"
            />
            <span className="text-sm">
              I have read and agree to the{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-purple-700 underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-purple-700 underline">
                Privacy Policy
              </a>
              .
            </span>
          </label>
        </div>

        <div className="flex gap-4">
          <button
            onClick={onAccept}
            disabled={!allAcknowledged}
            className={`flex-1 py-3 rounded-lg font-semibold transition ${
              allAcknowledged
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            I Understand and Accept
          </button>
          <button
            onClick={onDecline}
            className="flex-1 py-3 rounded-lg font-semibold border border-gray-300 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default RiskAcknowledgmentModal;
