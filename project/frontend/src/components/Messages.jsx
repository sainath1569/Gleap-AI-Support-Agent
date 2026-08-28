import React, { useState, useEffect } from 'react';
import ChatPanel from './ChatPanel';
import { ChevronRight, Trash2 } from 'lucide-react';
import { cleanSnippet } from '../utils/formatSnippet';

/*
  Messages view:
  - Stored and retrieved strictly from device local memory (localStorage)
  - No phantom backend calls or fake dummy conversations
  - Supports deleting conversations and creating real new ones
  - Clean, human-readable snippet previews without raw markdown symbols
*/

export default function Messages({ 
  activeConversationId, 
  setActiveConversationId, 
  pendingQuestion, 
  setPendingQuestion,
  onClose
}) {
  const [localConversations, setLocalConversations] = useState([]);

  // Load strictly from device local storage
  const loadLocalConversations = () => {
    try {
      const stored = localStorage.getItem('gleap_conversations_list');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setLocalConversations(parsed);
          return;
        }
      }
      setLocalConversations([]);
    } catch (e) {
      console.warn("Could not read local conversations", e);
      setLocalConversations([]);
    }
  };

  useEffect(() => {
    loadLocalConversations();
  }, [activeConversationId]);

  const handleDeleteConversation = (e, id) => {
    e.stopPropagation();
    try {
      localStorage.removeItem(`gleap_chat_${id}`);
      const updated = localConversations.filter(c => c.id !== id);
      setLocalConversations(updated);
      localStorage.setItem('gleap_conversations_list', JSON.stringify(updated));
    } catch (err) {
      console.warn("Delete error", err);
    }
  };

  // If a conversation is selected, show the chat panel
  if (activeConversationId) {
    return (
      <ChatPanel 
        conversationId={activeConversationId} 
        onBack={() => {
          setActiveConversationId(null);
          loadLocalConversations();
        }}
        pendingQuestion={pendingQuestion}
        setPendingQuestion={setPendingQuestion}
        onClose={onClose}
      />
    );
  }

  const conversationEntries = localConversations;

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="flex justify-between items-center px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-100/80 shrink-0">
        <div className="w-5" />
        <h2 className="font-semibold text-[16px] sm:text-[17px] text-gray-900">Messages</h2>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-900 transition-colors p-1 -mr-1 rounded-md flex items-center justify-center cursor-pointer"
          title="Close"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto pt-2 pb-28 px-2.5 sm:px-3">
        {conversationEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[260px] text-center px-4">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
              <svg width="24" height="24" viewBox="0 0 100 100" fill="none">
                <path
                  d="M 48 18 A 32 32 0 1 0 78 52"
                  stroke="#9ca3af"
                  strokeWidth="10"
                  strokeLinecap="round"
                  fill="none"
                />
                <circle cx="76" cy="28" r="6" fill="#9ca3af" />
              </svg>
            </div>
            <p className="text-[17px] font-bold text-gray-900">Hey! 👋</p>
            <p className="text-[13px] text-gray-400 mt-1 max-w-[220px] leading-relaxed">
              No conversations yet. Start chatting with Kai using the button below.
            </p>
          </div>
        ) : (
          conversationEntries.map((item) => (
            <div 
              key={item.id}
              onClick={() => setActiveConversationId(item.id)}
              className="group flex items-center gap-3 px-3 py-2.5 sm:px-3.5 sm:py-3 rounded-xl cursor-pointer transition-all hover:bg-gray-100/80 border-b border-gray-100/70 last:border-b-0 relative"
            >
              {/* Black squircle avatar with official Gleap logo */}
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-black rounded-[12px] sm:rounded-[13px] flex items-center justify-center shrink-0 shadow-sm">
                <svg width="18" height="18" viewBox="0 0 100 100" fill="none">
                  <path
                    d="M 48 18 A 32 32 0 1 0 78 52"
                    stroke="white"
                    strokeWidth="10"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <circle cx="76" cy="28" r="6" fill="white" />
                </svg>
              </div>

              {/* Message preview & meta - clean, properly formatted, no raw markdown markers */}
              <div className="flex-1 min-w-0 pr-1">
                <div className="text-[13.5px] sm:text-[14px] font-normal text-gray-900 truncate leading-snug">
                  {cleanSnippet(item.snippet, 65)}
                </div>
                <div className="text-[11.5px] sm:text-[12px] text-gray-400 mt-0.5 font-normal">
                  {item.time}
                </div>
              </div>

              {/* Delete button (accessible on touch devices as well as hover) */}
              <button
                onClick={(e) => handleDeleteConversation(e, item.id)}
                className="opacity-60 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 transition-opacity rounded-md hover:bg-gray-200/60 cursor-pointer shrink-0"
                title="Delete conversation"
              >
                <Trash2 size={15} />
              </button>

              {/* Chevron Right */}
              <ChevronRight 
                size={16} 
                className="text-gray-400 shrink-0 stroke-[1.8] ml-0.5 sm:ml-1" 
              />
            </div>
          ))
        )}
      </div>

      {/* Floating "Send us a message" CTA button */}
      <div className="absolute bottom-[18px] sm:bottom-[20px] left-0 right-0 flex justify-center pointer-events-none z-20 px-3">
        <button 
          onClick={() => setActiveConversationId(Date.now().toString())}
          className="bg-black text-white rounded-full px-4 sm:px-5 py-2.5 sm:py-3 text-[13px] sm:text-[13.5px] font-normal shadow-xl flex items-center gap-2 sm:gap-2.5 pointer-events-auto hover:bg-gray-800 active:scale-95 transition-all cursor-pointer select-none max-w-full truncate"
        >
          <span className="truncate">Send us a message</span>
          {/* Horizontal white paper airplane */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white" className="shrink-0">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
