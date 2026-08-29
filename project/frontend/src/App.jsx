import React, { useState, useEffect } from 'react';
import { ChevronDown, Code, Check } from 'lucide-react';
import Home from './components/Home';
import Messages from './components/Messages';
import News from './components/News';
import SettingsView from './components/SettingsView';
import HelpCenter from './components/HelpCenter';

/* 
  Main App: Manages the floating widget and bottom navigation.
  The bottom navigation contains exactly 5 items:
  [ Home ] [ Messages ] [ News ] [ Settings ] [ Help ]

  Each item strictly alternates between an outline SVG (INACTIVE)
  and a filled SVG (ACTIVE) with bold label.
*/

function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [pendingQuestion, setPendingQuestion] = useState(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [isArticleOpen, setIsArticleOpen] = useState(false);
  const [selectedNewsArticleId, setSelectedNewsArticleId] = useState(null);
  const [copiedScript, setCopiedScript] = useState(false);

  // Check if running embedded in an iframe on an external site
  const [isEmbedMode] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('embed') === 'true';
    } catch {
      return false;
    }
  });

  // Sync widget expanded/collapsed state with the host window iframe
  useEffect(() => {
    if (isEmbedMode && window.parent && window.parent !== window) {
      let targetOrigin = "*";
      try {
        if (document.referrer) {
          targetOrigin = new URL(document.referrer).origin;
        }
      } catch (e) {
        targetOrigin = "*";
      }
      window.parent.postMessage({ type: 'GLEAP_WIDGET_STATE', isOpen }, targetOrigin);
    }
  }, [isOpen, isEmbedMode]);

  const handleCopyScript = () => {
    const embedScriptTag = `<script src="${window.location.origin}/widget.js" defer></script>`;
    try {
      navigator.clipboard.writeText(embedScriptTag);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 3000);
    } catch (e) {
      console.warn("Clipboard copy failed, using prompt", e);
      window.prompt("Copy this script tag:", embedScriptTag);
    }
  };

  const handleAskQuestion = (q) => {
    setPendingQuestion(q);
    setActiveTab('messages');
    setActiveConversationId(Date.now().toString());
  };

  const handleOpenNewsArticle = (articleId = 'pipelines') => {
    setSelectedNewsArticleId(articleId);
    setActiveTab('news');
    setIsArticleOpen(true);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <Home 
            scrollTop={scrollTop}
            onOpenChat={() => { 
              setActiveTab('messages'); 
              setActiveConversationId(Date.now().toString()); 
            }} 
            onAskQuestion={handleAskQuestion}
            onOpenNewsArticle={handleOpenNewsArticle}
            onClose={() => setIsOpen(false)}
          />
        );
      case 'messages':
        return (
          <Messages 
            activeConversationId={activeConversationId} 
            setActiveConversationId={setActiveConversationId}
            pendingQuestion={pendingQuestion}
            setPendingQuestion={setPendingQuestion}
            onClose={() => setIsOpen(false)}
          />
        );
      case 'news':
        return (
          <News 
            initialArticleId={selectedNewsArticleId}
            onClose={() => { setIsOpen(false); setIsArticleOpen(false); setSelectedNewsArticleId(null); }} 
            onArticleStateChange={(isOpen) => {
              setIsArticleOpen(isOpen);
              if (!isOpen) setSelectedNewsArticleId(null);
            }} 
          />
        );
      case 'settings':
        return <SettingsView onClose={() => setActiveTab('home')} />;
      case 'help':
        return <HelpCenter onClose={() => setIsOpen(false)} />;
      default:
        return (
          <Home 
            scrollTop={scrollTop}
            onOpenChat={() => { setActiveTab('messages'); setActiveConversationId(Date.now().toString()); }} 
            onAskQuestion={handleAskQuestion} 
            onOpenNewsArticle={handleOpenNewsArticle}
            onClose={() => setIsOpen(false)}
          />
        );
    }
  };

  return (
    <div className={isEmbedMode ? "w-full h-full bg-transparent overflow-hidden" : "relative min-h-screen bg-[#FAF8F5] text-[#1F1E1D] overflow-x-hidden select-none"}>
      {/* CLAUDE-STYLE BACKGROUND EXPERIENCE (Hidden in embed iframe mode) */}
      {!isEmbedMode && (
        <div className="min-h-screen flex flex-col justify-between p-5 sm:p-12 md:p-16 relative overflow-hidden">
        
        {/* Warm Ambient Glows */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#F3ECE0] opacity-70 blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 -right-24 w-80 h-80 rounded-full bg-[#EAE2D4] opacity-50 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 left-1/4 w-96 h-96 rounded-full bg-[#F5EFE6] opacity-80 blur-3xl pointer-events-none" />

        {/* Top Minimal Editorial Nav */}
        <header className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1F1E1D] text-white flex items-center justify-center shadow-xs">
              <svg width="20" height="20" viewBox="0 0 100 100" fill="none">
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
            <span className="font-editorial text-2xl font-bold tracking-tight text-[#1F1E1D]">
              Gleap
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#7D7569] font-medium tracking-wide uppercase">
            <span className="w-2 h-2 rounded-full bg-[#CC785C] animate-pulse" />
            Kai Support AI Live
          </div>
        </header>

        {/* Center Claude-Inspired Editorial Message */}
        <main className="relative z-10 max-w-3xl my-auto py-10 sm:py-12">
          {/* Claude Hand-Drawn Sparkle Accent */}
          <div className="flex items-center gap-2 mb-4">
            <svg width="24" height="24" viewBox="0 0 36 36" fill="none" className="text-[#CC785C]">
              <path d="M 18 2 C 18 10, 26 18, 34 18 C 26 18, 18 26, 18 34 C 18 26, 10 18, 2 18 C 10 18, 18 10, 18 2 Z" fill="#CC785C" />
            </svg>
            <span className="font-handwriting text-2xl text-[#8E8271]">
              welcome to the demo
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-editorial text-4xl sm:text-6xl md:text-7xl font-normal text-[#1F1E1D] tracking-tight leading-[1.08] mb-6">
            Hey! Look into the <br />
            <span className="italic text-[#CC785C] font-normal">bottom right corner</span>
          </h1>

          <p className="text-[#686359] text-base sm:text-xl max-w-xl font-editorial leading-relaxed mb-8">
            Kai, our customer support AI assistant, is waiting there to answer documentation questions, query real-time weather, track orders, or generate pricing quotes.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsOpen(true)}
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-[#1F1E1D] text-white hover:bg-black transition-all cursor-pointer shadow-sm text-sm font-medium hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Open Kai Assistant</span>
              <span className="text-[#CC785C]">✦</span>
            </button>

            <button
              onClick={handleCopyScript}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#F0EBE1] hover:bg-[#E8E0D2] text-[#1F1E1D] border border-[#E3D9CA] transition-all cursor-pointer shadow-2xs text-sm font-medium hover:scale-[1.02] active:scale-[0.98]"
              title="Copy embed script to paste into any external website"
            >
              {copiedScript ? (
                <>
                  <Check size={16} className="text-emerald-700 shrink-0" />
                  <span className="text-emerald-800 font-semibold">Script Copied! ✓</span>
                </>
              ) : (
                <>
                  <Code size={16} className="text-[#7D7569] shrink-0" />
                  <span>Copy Embed Script</span>
                </>
              )}
            </button>
          </div>
        </main>

        {/* Claude Style Hand-Drawn Curved Arrow swooping towards bottom right corner (hidden on mobile) */}
        <div className="hidden sm:block absolute right-14 bottom-24 sm:right-28 sm:bottom-28 pointer-events-none z-20">
          <div className="relative">
            {/* Handwritten Label */}
            <div className="absolute -top-12 -left-16 sm:-left-24 text-right">
              <span className="font-handwriting text-2xl sm:text-3xl text-[#CC785C] whitespace-nowrap -rotate-6 inline-block font-semibold">
                click here to chat ↘
              </span>
            </div>

            {/* Hand-Drawn Curve SVG */}
            <svg 
              className="w-48 h-36 sm:w-64 sm:h-48 overflow-visible" 
              viewBox="0 0 240 180" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Organic hand-drawn curve with ink jitter */}
              <path
                d="M 15 15 C 65 10, 140 30, 185 85 C 205 110, 218 138, 228 162"
                stroke="#CC785C"
                strokeWidth="2.75"
                strokeLinecap="round"
                strokeDasharray="8 6"
              />
              {/* Organic Arrowhead */}
              <path
                d="M 210 156 L 229 164 L 227 145"
                stroke="#CC785C"
                strokeWidth="2.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Hand-drawn sketch loop circle */}
              <circle cx="14" cy="15" r="4" fill="#CC785C" />
            </svg>
          </div>
        </div>

        {/* Minimal Footer */}
        <footer className="relative z-10 text-xs text-[#9B9284] flex flex-col sm:flex-row items-start sm:items-center justify-between border-t border-[#EAE2D4] pt-4 gap-2">
          <span>Gleap AI Autonomous Support Agent</span>
          <span>RAG • Qdrant Cloud • Tools • Groq</span>
        </footer>
      </div>
      )}

      {/* Floating Widget & Launcher */}
      <div className="fixed bottom-3 right-3 sm:bottom-5 sm:right-5 z-50 flex flex-col items-end">
        {/* Widget Panel */}
        {isOpen && (
          <div 
            className={`${isArticleOpen ? 'w-[calc(100vw-1.5rem)] sm:w-[720px] max-w-[96vw]' : 'w-[calc(100vw-1.5rem)] sm:w-[430px] max-w-[430px]'} h-[88vh] sm:h-[680px] max-h-[92vh] sm:max-h-[85vh] bg-white rounded-2xl flex flex-col overflow-hidden mb-3 sm:mb-4 relative transition-[width] duration-300 ease-in-out`}
            style={{
              boxShadow: '0 25px 60px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)',
            }}
          >
            {/* Main Content Area - padded at bottom so scrollable content isn't covered by bottom nav */}
            <div 
              onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
              className={`flex-1 ${activeConversationId ? 'overflow-hidden pb-0' : 'overflow-y-auto pb-16'} scrollbar-hide relative bg-white`}
            >
              {renderContent()}
            </div>

            {/* Bottom Navigation Bar - only hidden when actively in a chat thread */}
            {activeConversationId === null && (
              <div className="absolute bottom-2 sm:bottom-2.5 left-2 sm:left-3 right-2 sm:right-3 z-30 pointer-events-auto">
                <div 
                  className="rounded-full flex justify-between items-center px-1 sm:px-1.5 py-1 sm:py-1.5 transition-all"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.45)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1.5px solid rgba(255, 255, 255, 0.65)',
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.10), inset 0 1px 1.5px rgba(255, 255, 255, 0.9), 0 1px 3px rgba(0, 0, 0, 0.05)',
                  }}
                >
                  {/* 1. Home */}
                  <NavItem 
                    active={activeTab === 'home'} 
                    label="Home" 
                    onClick={() => { setActiveTab('home'); setScrollTop(0); setIsArticleOpen(false); }} 
                    iconInactive={<HomeOutlineIcon />}
                    iconActive={<HomeFilledIcon />}
                  />

                  {/* 2. Messages */}
                  <NavItem 
                    active={activeTab === 'messages'} 
                    label="Messages" 
                    onClick={() => { setActiveConversationId(null); setActiveTab('messages'); setIsArticleOpen(false); }} 
                    iconInactive={<MessagesOutlineIcon />}
                    iconActive={<MessagesFilledIcon />}
                  />

                  {/* 3. News */}
                  <NavItem 
                    active={activeTab === 'news'} 
                    label="News" 
                    onClick={() => { setActiveTab('news'); setSelectedNewsArticleId(null); setIsArticleOpen(false); }} 
                    iconInactive={<NewsOutlineIcon />}
                    iconActive={<NewsFilledIcon />}
                  />

                  {/* 4. Settings */}
                  <NavItem 
                    active={activeTab === 'settings'} 
                    label="Settings" 
                    onClick={() => { setActiveTab('settings'); setIsArticleOpen(false); }} 
                    iconInactive={<SettingsOutlineIcon />}
                    iconActive={<SettingsFilledIcon />}
                  />

                  {/* 5. Help */}
                  <NavItem 
                    active={activeTab === 'help'} 
                    label="Help" 
                    onClick={() => { setActiveTab('help'); setIsArticleOpen(false); }} 
                    iconInactive={<HelpOutlineIcon />}
                    iconActive={<HelpFilledIcon />}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Floating Launcher Button */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-13 h-13 sm:w-14 sm:h-14 bg-black text-white rounded-full flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
          aria-label="Toggle Support Widget"
        >
          {isOpen ? <ChevronDown size={26} /> : (
            <svg width="28" height="28" viewBox="0 0 100 100" fill="none">
              <path
                d="M 48 18 A 32 32 0 1 0 78 52"
                stroke="white"
                strokeWidth="10"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx="76" cy="28" r="6" fill="white" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

/* ========================================================
   NAVIGATION ITEM COMPONENT
   Switches between iconActive (filled) and iconInactive (outline)
   and updates typography weight.
======================================================== */
function NavItem({ active, label, iconInactive, iconActive, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 sm:px-1 rounded-full transition-all duration-150 cursor-pointer min-w-0 ${
        active 
          ? 'text-black' 
          : 'text-gray-500 hover:text-gray-800'
      }`}
    >
      <div className="flex items-center justify-center h-5 sm:h-6 w-5 sm:w-6 mb-0.5 shrink-0">
        {active ? iconActive : iconInactive}
      </div>
      <span className={`text-[10px] sm:text-[11px] leading-tight tracking-tight truncate max-w-full ${active ? 'font-bold text-black' : 'font-normal text-gray-500'}`}>
        {label}
      </span>
    </button>
  );
}

/* ========================================================
   1. HOME ICONS
======================================================== */
function HomeOutlineIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 20V9.5z" />
      <polyline points="9 21 9 12 15 12 15 21" />
    </svg>
  );
}

function HomeFilledIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.2 2.45a1.25 1.25 0 0 1 1.6 0l8.2 6.56a1 1 0 0 1 .35.78V20a2 2 0 0 1-2 2H4.65a2 2 0 0 1-2-2V9.79a1 1 0 0 1 .35-.78l8.2-6.56z" />
    </svg>
  );
}

/* ========================================================
   2. MESSAGES ICONS
======================================================== */
function MessagesOutlineIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <line x1="8" y1="9" x2="16" y2="9" />
      <line x1="8" y1="13" x2="13" y2="13" />
    </svg>
  );
}

function MessagesFilledIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7.414l-3.707 3.707A1 1 0 0 1 2 20V5a2 2 0 0 1 1-1zm5 3a1 1 0 0 0 0 2h8a1 1 0 1 0 0-2H8zm0 4a1 1 0 0 0 0 2h5a1 1 0 1 0 0-2H8z" clipRule="evenodd" />
    </svg>
  );
}

/* ========================================================
   3. NEWS ICONS
======================================================== */
function NewsOutlineIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5L6 9H2v6h4l5 4V5z" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function NewsFilledIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.5 4.3a1 1 0 0 0-1.1.2L5.8 8H2a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h3.8l4.6 3.5a1 1 0 0 0 1.6-.8V5.1a1 1 0 0 0-.5-.8z" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/* ========================================================
   4. SETTINGS ICONS (Gear SVG)
======================================================== */
function SettingsOutlineIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function SettingsFilledIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M11.78 2h.44a2 2 0 0 1 2 2v.18a2 2 0 0 0 1 1.73l.43.25a2 2 0 0 0 2 0l.15-.08a2 2 0 0 1 2.73.73l.22.38a2 2 0 0 1-.73 2.73l-.15.1a2 2 0 0 0-1 1.72v.51a2 2 0 0 0 1 1.74l.15.09a2 2 0 0 1 .73 2.73l-.22.38a2 2 0 0 1-2.73.73l-.15-.08a2 2 0 0 0-2 0l-.43.25a2 2 0 0 0-1 1.73V20a2 2 0 0 1-2 2h-.44a2 2 0 0 1-2-2v-.18a2 2 0 0 0-1-1.73l-.43-.25a2 2 0 0 0-2 0l-.15.08a2 2 0 0 1-2.73-.73l-.22-.39a2 2 0 0 1 .73-2.73l.15-.08a2 2 0 0 0 1-1.74v-.5a2 2 0 0 0-1-1.74l-.15-.09a2 2 0 0 1-.73-2.73l.22-.38a2 2 0 0 1 2.73-.73l.15.08a2 2 0 0 0 2 0l.43-.25a2 2 0 0 0 1-1.73V4a2 2 0 0 1 2-2zm.22 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" clipRule="evenodd" />
    </svg>
  );
}

/* ========================================================
   5. HELP ICONS
======================================================== */
function HelpOutlineIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <circle cx="12" cy="17" r="1" fill="currentColor" />
    </svg>
  );
}

function HelpFilledIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="11" fill="currentColor" />
      <path d="M9.5 9.25a2.5 2.5 0 0 1 4.88.8c0 1.6-2.38 2.25-2.38 3.45" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16.5" r="1.2" fill="#ffffff" />
    </svg>
  );
}

export default App;
