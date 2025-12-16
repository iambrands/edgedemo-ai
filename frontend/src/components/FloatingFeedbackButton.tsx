import React, { useState } from 'react';
import FeedbackModal from './FeedbackModal';

const FloatingFeedbackButton: React.FC = () => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all z-40 hover:scale-110 group"
        aria-label="Send Feedback"
        title="Send Feedback"
      >
        <span className="text-2xl">💬</span>
        <span className="absolute right-full mr-3 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white text-sm px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Send Feedback
        </span>
      </button>

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
};

export default FloatingFeedbackButton;

