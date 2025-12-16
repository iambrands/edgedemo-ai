import React, { useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: 'bug' | 'feature' | 'general' | 'question';
  initialPageUrl?: string;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ 
  isOpen, 
  onClose, 
  initialType = 'general',
  initialPageUrl 
}) => {
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature' | 'general' | 'question'>(initialType);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !message.trim()) {
      toast.error('Please fill in both title and message');
      return;
    }

    setSubmitting(true);

    try {
      const currentUrl = initialPageUrl || window.location.pathname;
      
      await api.post('/feedback', {
        feedback_type: feedbackType,
        title: title.trim(),
        message: message.trim(),
        page_url: currentUrl,
      });

      toast.success('Thank you for your feedback! We appreciate your input.');
      
      // Reset form
      setTitle('');
      setMessage('');
      setFeedbackType('general');
      onClose();
    } catch (error: any) {
      console.error('Feedback submission error:', error);
      toast.error(error.response?.data?.error || 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Send Feedback</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Feedback Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type of Feedback
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(['bug', 'feature', 'general', 'question'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFeedbackType(type)}
                  className={`px-4 py-2 rounded-lg border-2 transition-all ${
                    feedbackType === type
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-medium'
                      : 'border-gray-300 hover:border-gray-400 text-gray-700'
                  }`}
                >
                  {type === 'bug' && '🐛 Bug'}
                  {type === 'feature' && '💡 Feature'}
                  {type === 'general' && '💬 General'}
                  {type === 'question' && '❓ Question'}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="feedback-title" className="block text-sm font-medium text-gray-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="feedback-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary of your feedback"
              maxLength={200}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">{title.length}/200 characters</p>
          </div>

          {/* Message */}
          <div>
            <label htmlFor="feedback-message" className="block text-sm font-medium text-gray-700 mb-2">
              Details <span className="text-red-500">*</span>
            </label>
            <textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                feedbackType === 'bug'
                  ? 'Describe the bug, what you were doing when it happened, and any error messages you saw...'
                  : feedbackType === 'feature'
                  ? 'Describe the feature you\'d like to see and how it would help you...'
                  : feedbackType === 'question'
                  ? 'Ask your question and we\'ll get back to you...'
                  : 'Share your thoughts, suggestions, or feedback...'
              }
              rows={8}
              maxLength={5000}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">{message.length}/5000 characters</p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>💡 Tip:</strong> {
                feedbackType === 'bug'
                  ? 'Include steps to reproduce the bug and any error messages you saw.'
                  : feedbackType === 'feature'
                  ? 'Explain how this feature would improve your trading experience.'
                  : feedbackType === 'question'
                  ? 'We\'ll review your question and respond as soon as possible.'
                  : 'Your feedback helps us improve the platform!'
              }
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim() || !message.trim()}
              className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 font-medium transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </span>
              ) : (
                'Submit Feedback'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeedbackModal;

