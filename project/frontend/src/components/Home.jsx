import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Mic, MicOff, ArrowUp, ChevronRight, Search, X, Loader2, Zap } from 'lucide-react';
import bugIcon from '../assets/bugcol.svg';
import ideaIcon from '../assets/ideacol.svg';
import heroImg from '../assets/hero.png';
import { uploadKnowledge } from '../api';

/*
  Home view matching Gleap reference:
  - Exact gradient background: Pure black at top fading through smoky gradient into white
  - On scroll: The black header turns into a frosted white blur
  - Interactive input card: Typing in-place without navigating until user sends
  - Working Paperclip (file attachment + RAG indexing)
  - Working Microphone (Speech-to-Text transcription)
  - Action pills with official bugcol.svg & ideacol.svg assets
  - News card matching Gleap's Pipelines illustration
  - Search for help with chevrons & powered by Gleap footer
*/
export default function Home({ onOpenChat, onAskQuestion, onOpenNewsArticle, scrollTop = 0, onClose }) {
  const [inputText, setInputText] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [displayedPlaceholder, setDisplayedPlaceholder] = useState('');

  const fullPlaceholder = 'Ask me anything...';

  // Typewriter effect typing "Ask me anything..." on initial entry
  useEffect(() => {
    let currentIdx = 0;
    let intervalId = null;
    const startDelay = setTimeout(() => {
      intervalId = setInterval(() => {
        currentIdx++;
        setDisplayedPlaceholder(fullPlaceholder.slice(0, currentIdx));
        if (currentIdx >= fullPlaceholder.length) {
          clearInterval(intervalId);
        }
      }, 50);
    }, 280);

    return () => {
      clearTimeout(startDelay);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  // Auto-grow textarea up to 3 visible lines as user types
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const scrollH = textarea.scrollHeight;
    const clampedH = Math.min(Math.max(scrollH, 28), 76);
    textarea.style.height = `${clampedH}px`;
    textarea.style.overflowY = scrollH > 76 ? 'auto' : 'hidden';
  }, [inputText]);

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);
  const baseTextRef = useRef('');

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  // Scroll progress for the white blur transition
  const scrollProgress = clamp(scrollTop / 160, 0, 1);
  const logoOpacity = 1 - clamp(scrollTop / 60, 0, 1);
  const headingOpacity = 1 - clamp(scrollTop / 120, 0, 1);

  // Send message and navigate to chat interface
  const handleSend = () => {
    let finalQuery = inputText.trim();
    if (!finalQuery && attachedFile) {
      finalQuery = `Please analyze the uploaded document: ${attachedFile.name}`;
    }
    if (!finalQuery) return;

    if (attachedFile && !finalQuery.includes(attachedFile.name)) {
      finalQuery = `${finalQuery} (Document attached: ${attachedFile.name})`;
    }

    onAskQuestion(finalQuery);
    setInputText('');
    setAttachedFile(null);
  };

  // Speech-to-Text handler - prevents duplicate speech accumulation
  const handleToggleSpeech = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome/Edge or type directly.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      // Capture base text before speaking so transcript is cleanly combined without duplication
      baseTextRef.current = inputText;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        const currentSpeech = (finalTranscript + interimTranscript).trim();
        const base = baseTextRef.current.trim();
        if (base && currentSpeech) {
          setInputText(`${base} ${currentSpeech}`);
        } else if (currentSpeech) {
          setInputText(currentSpeech);
        }
      };

      recognition.onerror = (err) => {
        console.warn("Speech recognition error:", err);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error("Speech recognition could not be started", e);
      setIsListening(false);
    }
  };

  // File Attachment & RAG indexing handler
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAttachedFile(file);
    setIsUploading(true);

    try {
      await uploadKnowledge(file);
    } catch (err) {
      console.warn("Auto-index into knowledge base encountered an issue:", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-white relative">

      {/* ========================================================
          TOP HEADER BACKGROUND
          Exact gradient from reference: Solid black at top fading 
          into white through a smooth smoky gradient.
          On scroll: Turns into a frosted white blur.
      ======================================================== */}
      <div
        className="relative shrink-0 px-4 sm:px-6 pt-8 sm:pt-10 pb-16 sm:pb-20 overflow-hidden"
        style={{
          minHeight: '290px',
          background: 'linear-gradient(180deg, #000000 0%, #000000 54%, #18181b 62%, #27272a 70%, #3f3f46 78%, #71717a 86%, #a1a1aa 92%, #e4e4e7 97%, #ffffff 100%)',
        }}
      >
        {/* White blur overlay that turns the black header into a white blur as you scroll */}
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-150"
          style={{
            opacity: scrollProgress,
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            backgroundColor: 'rgba(255, 255, 255, 0.92)',
          }}
        />

        {/* Logo and close button */}
        <div
          className="flex justify-between items-center mb-5 sm:mb-6 relative z-10"
          style={{
            opacity: logoOpacity,
            transition: 'opacity 80ms linear',
          }}
        >
          {/* Logo matching uploaded image: arc from 12 o'clock around left to 3 o'clock with dot at 1:30 */}
          <svg width="38" height="38" viewBox="0 0 100 100" fill="none" className="shrink-0 sm:w-[42px] sm:h-[42px]">
            <path
              d="M 48 18 A 32 32 0 1 0 78 52"
              stroke="white"
              strokeWidth="10"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="76" cy="28" r="6" fill="white" />
          </svg>

          {/* Cross mark matching photo */}
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-1 -mr-1 rounded-md flex items-center justify-center cursor-pointer"
            title="Close"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Greeting + heading */}
        <div
          className="relative z-10 pl-1 mt-8 sm:mt-[54px]"
          style={{
            opacity: headingOpacity,
            transition: 'opacity 80ms linear',
          }}
        >
          <div className="text-xl sm:text-2xl text-white/80 mb-1 font-semibold">
            Hi
          </div>

          <div className="text-[22px] sm:text-[26px] font-semibold leading-tight text-white">
            How can we help you today?
          </div>
        </div>
      </div>

      {/* ========================================================
          MAIN CONTENT AREA (Overlaps the gradient header)
      ======================================================== */}
      <div className="px-4 -mt-[78px] relative z-20 pb-6">

        {/* INTERACTIVE INPUT CARD */}
        <div
          onClick={() => textareaRef.current?.focus()}
          className="bg-white rounded-2xl px-4 pt-3 pb-2.5 mb-4 cursor-text relative z-30 transition-all duration-200"
          style={{
            minHeight: '84px',
            boxShadow: isFocused 
              ? '0 8px 32px -4px rgba(0,0,0,0.22)' 
              : '0 4px 24px -6px rgba(0,0,0,0.16)',
            border: isFocused
              ? '2px solid #000000'
              : scrollTop > 80
              ? '2px solid #222222'
              : '1px solid rgba(0,0,0,0.06)',
          }}
        >
          {/* Attached file chip */}
          {attachedFile && (
            <div className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-lg text-xs text-gray-700 mb-2 w-fit">
              {isUploading ? (
                <Loader2 size={12} className="animate-spin text-gray-500" />
              ) : (
                <span className="text-emerald-600 font-bold">✓</span>
              )}
              <span className="truncate max-w-[200px] font-medium">{attachedFile.name}</span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setAttachedFile(null);
                }}
                className="hover:text-black ml-1 text-gray-400"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* Interactive textarea - does NOT navigate on click */}
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={displayedPlaceholder}
            rows={1}
            style={{
              height: '28px',
              maxHeight: '76px',
            }}
            className="w-full bg-transparent resize-none outline-none text-[15px] text-gray-800 placeholder:text-gray-400 leading-relaxed font-normal scrollbar-hide"
          />

          {/* Bottom row: Icons & Send Button */}
          <div className="flex justify-between items-center mt-1">
            <div className="flex items-center gap-3 text-gray-400">
              {/* Paperclip / File Upload */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.txt,.md"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="hover:text-gray-700 transition-colors p-1 -m-1 rounded-md hover:bg-gray-100"
                title="Attach document (.pdf, .txt, .md)"
              >
                {/* Straight vertical paperclip icon matching Gleap reference */}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0"
                >
                  <path d="M6 7.5V17a5 5 0 0 0 10 0V5a3.5 3.5 0 0 0-7 0v11.5a2 2 0 0 0 4 0V8" />
                </svg>
              </button>

              {/* Microphone / Speech-to-text */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleSpeech();
                }}
                className={`transition-colors p-1 -m-1 rounded-md ${
                  isListening 
                    ? 'text-red-500 bg-red-50 animate-pulse' 
                    : 'hover:text-gray-700 hover:bg-gray-100'
                }`}
                title={isListening ? "Listening... Click to stop" : "Voice input"}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              {isListening && (
                <span className="text-[11px] text-red-500 font-medium animate-pulse">
                  Listening...
                </span>
              )}
            </div>

            {/* Send Button - Always Black */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSend();
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-black text-white transition-all shadow-md hover:scale-105 active:scale-95 cursor-pointer"
              title="Send message"
            >
              <ArrowUp size={16} />
            </button>
          </div>
        </div>

        {/* ACTION PILLS */}
        <div className="flex flex-wrap sm:flex-nowrap gap-2 mb-5">
          <button
            onClick={() =>
              onAskQuestion(
                'I want to report an issue with my account or order'
              )
            }
            className="bg-white border border-gray-200 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shadow-sm hover:bg-gray-50 text-gray-800 transition-colors cursor-pointer"
          >
            <img
              src={bugIcon}
              alt="Report an issue"
              className="w-4 h-4 object-contain shrink-0"
            />
            <span>Report an issue</span>
          </button>

          <button
            onClick={() =>
              onAskQuestion(
                'I have a feature request or feedback for the team'
              )
            }
            className="bg-white border border-gray-200 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shadow-sm hover:bg-gray-50 text-gray-800 transition-colors cursor-pointer"
          >
            <img
              src={ideaIcon}
              alt="Request a feature"
              className="w-3.5 h-3.5 object-contain shrink-0"
            />
            <span>Request a feature</span>
          </button>
        </div>

        {/* NEWS CARD — Matches Gleap's Pipelines Card */}
        <div 
          onClick={() => onOpenNewsArticle?.('pipelines')}
          className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm mb-5 sm:mb-6 cursor-pointer hover:shadow-md transition-all group"
        >
          <div className="h-40 sm:h-44 overflow-hidden relative bg-gray-100">
            <img src={heroImg} alt="Pipelines" className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-300" />
          </div>

          <div className="p-3.5 sm:p-4 flex items-start justify-between">
            <div className="flex-1 pr-2">
              <h3 className="font-semibold text-[13.5px] sm:text-sm mb-1 text-gray-900 group-hover:text-black">
                Pipelines: lightweight CRM boards in Gleap
              </h3>

              <p className="text-xs text-gray-500 leading-relaxed">
                Pipelines bring lightweight CRM boards into Gleap. Track deals,
                onboarding, renewals — any...
              </p>
            </div>

            <ChevronRight
              size={16}
              className="text-gray-400 mt-1 shrink-0 group-hover:translate-x-0.5 transition-transform"
            />
          </div>
        </div>

        {/* SEARCH FOR HELP & QUESTIONS CARD */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm mb-3 p-2 flex flex-col gap-0.5">
          {/* Search bar row */}
          <div 
            onClick={() => textareaRef.current?.focus()}
            className="flex items-center justify-between bg-gray-100/80 hover:bg-gray-100 transition-colors rounded-xl px-3.5 py-2.5 mb-1 cursor-pointer"
          >
            <span className="text-gray-900 text-sm font-medium">
              Search for help
            </span>
            <Search size={16} className="text-gray-900 shrink-0" />
          </div>

          {/* Question rows */}
          {[
            {
              label: 'Control what Gleap reads from your repository',
              query: 'Control what Gleap reads from your repository',
            },
            {
              label: 'Keyboard shortcuts',
              query: 'What keyboard shortcuts are available?',
            },
            {
              label: 'Custom widgets developer guide: the endpoint ...',
              query: 'Can you share the custom widgets developer guide?',
            },
          ].map((item, i) => (
            <button
              key={i}
              onClick={() => onAskQuestion(item.query)}
              className="w-full text-left px-3.5 py-2.5 rounded-xl text-[13.5px] font-normal transition-all flex items-center justify-between text-gray-800 hover:bg-gray-100/80 hover:text-gray-900"
            >
              <span className="truncate pr-2">{item.label}</span>
              <ChevronRight
                size={16}
                className="text-gray-800 shrink-0 stroke-[2]"
              />
            </button>
          ))}
        </div>

        {/* FOOTER */}
        <div className="text-center text-[12.5px] text-gray-500 pt-1 pb-3 flex items-center justify-center gap-1.5 font-normal select-none">
          <Zap size={13} className="text-amber-400 fill-amber-400 shrink-0" />
          <span className="text-gray-400">Powered by</span>
          <span className="font-semibold text-gray-600">Gleap</span>
        </div>
      </div>
    </div>
  );
}