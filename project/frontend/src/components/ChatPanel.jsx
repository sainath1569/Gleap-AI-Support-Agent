import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Mic, ArrowUp, ThumbsUp, ThumbsDown, Trash2, FileText, Paperclip } from 'lucide-react';
import ToolCallCard from './ToolCallCard';

/*
  ChatPanel view:
  - Official Gleap 'C·' vector icon only (no smiley emojis)
  - Persists all chat messages into device local memory (localStorage)
  - Full message deletion support:
      * Clear entire conversation from header trash icon
      * Delete individual messages on hover
  - Feedback voting & floating bottom input card
*/

export default function ChatPanel({
  conversationId,
  onBack,
  onClose,
  pendingQuestion,
  setPendingQuestion,
}) {
  // Load initial messages strictly from device local memory (localStorage)
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(`gleap_chat_${conversationId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn("Could not read local memory chat", e);
    }
    return [];
  });

  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [feedbackMap, setFeedbackMap] = useState({});
  const [isListening, setIsListening] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const baseInputRef = useRef('');
  const hasSentPending = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  // Persist all chatting messages into device local memory (localStorage)
  useEffect(() => {
    if (!isStreaming) {
      try {
        if (messages.length > 0) {
          localStorage.setItem(`gleap_chat_${conversationId}`, JSON.stringify(messages));
          
          const listStr = localStorage.getItem('gleap_conversations_list');
          let list = listStr ? JSON.parse(listStr) : [];
          const lastMsg = messages[messages.length - 1];
          const snippet = lastMsg?.content ? (lastMsg.content.slice(0, 50) + '...') : 'New conversation';
          
          const existingIdx = list.findIndex(c => c.id === conversationId);
          const itemData = {
            id: conversationId,
            snippet: snippet,
            time: 'Kai • Just now',
            updatedAt: Date.now()
          };
          
          if (existingIdx >= 0) {
            list[existingIdx] = { ...list[existingIdx], ...itemData };
          } else {
            list.unshift(itemData);
          }
          localStorage.setItem('gleap_conversations_list', JSON.stringify(list));
        }
      } catch (e) {
        console.warn("Could not save to localStorage", e);
      }
    }
  }, [messages, isStreaming, conversationId]);

  // Delete entire conversation from device local memory
  const handleClearConversation = () => {
    try {
      localStorage.removeItem(`gleap_chat_${conversationId}`);
      const listStr = localStorage.getItem('gleap_conversations_list');
      if (listStr) {
        const list = JSON.parse(listStr).filter(c => c.id !== conversationId);
        localStorage.setItem('gleap_conversations_list', JSON.stringify(list));
      }
    } catch (e) {
      console.warn("Delete error", e);
    }
    setMessages([]);
    onBack();
  };

  // Delete an individual message from the thread
  const handleDeleteMessage = (idxToDelete) => {
    setMessages(prev => {
      const updated = prev.filter((_, idx) => idx !== idxToDelete);
      try {
        localStorage.setItem(`gleap_chat_${conversationId}`, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Handle pending question from Home page
  useEffect(() => {
    if (pendingQuestion && !hasSentPending.current) {
      hasSentPending.current = true;
      setMessages([]);
      doSend(pendingQuestion);

      if (setPendingQuestion) {
        setPendingQuestion(null);
      }
    }
  }, [pendingQuestion]);

  // Auto-resize input textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '24px';
      const scrollH = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollH, 24), 80)}px`;
    }
  }, [input]);

  // Web Speech API for voice input
  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      baseInputRef.current = input;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        const separator = baseInputRef.current && !baseInputRef.current.endsWith(' ') ? ' ' : '';
        if (finalTranscript) {
          baseInputRef.current = baseInputRef.current + separator + finalTranscript.trim();
          setInput(baseInputRef.current);
        } else if (interimTranscript) {
          setInput(baseInputRef.current + separator + interimTranscript.trim());
        }
      };

      recognition.onerror = (e) => {
        console.error("Speech error", e);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  const doSend = async (text) => {
    const rawText = text.trim();
    if (!rawText && !attachedFile) return;

    const fileToUpload = attachedFile;
    setAttachedFile(null);
    setInput('');
    setIsStreaming(true);

    // 1. Extract document content if an attachment is provided
    let attachmentData = null;
    if (fileToUpload) {
      try {
        if (
          fileToUpload.name.endsWith('.txt') || 
          fileToUpload.name.endsWith('.md') || 
          fileToUpload.name.endsWith('.json') || 
          fileToUpload.name.endsWith('.csv')
        ) {
          const fileText = await fileToUpload.text();
          attachmentData = { name: fileToUpload.name, content: fileText };
        } else {
          // Backend parse for PDFs and rich documents
          const formData = new FormData();
          formData.append('file', fileToUpload);
          const parseRes = await fetch('http://localhost:8000/api/chat/parse-attachment', {
            method: 'POST',
            body: formData
          });
          const parseData = await parseRes.json();
          if (parseData.status === 'success') {
            attachmentData = { name: parseData.filename, content: parseData.text };
          }
        }
      } catch (e) {
        console.warn("Could not parse attached document", e);
      }
    }

    const userMessage = {
      role: 'user',
      content: rawText || `Review and summarize the attached document: ${fileToUpload?.name}`,
      attachment: fileToUpload ? { name: fileToUpload.name } : null
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: rawText || `Review and summarize the attached document: ${fileToUpload?.name}`,
          conversation_id: conversationId,
          attachment: attachmentData
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Server error');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      const currentAssistant = {
        role: 'assistant',
        content: '',
        tool_calls: [],
        time: 'a few seconds ago'
      };

      setMessages((prev) => [...prev, currentAssistant]);

      let buffer = '';
      let assistantContent = '';
      let toolCallsList = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const dataStr = line.substring(6).trim();
          if (!dataStr || dataStr === '[DONE]') continue;

          try {
            const data = JSON.parse(dataStr);

            if (data.type === 'assistant_delta' || data.type === 'token') {
              assistantContent += data.content;
              const snapshot = assistantContent;
              setMessages((prev) => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                  updated[lastIdx] = {
                    ...updated[lastIdx],
                    content: snapshot
                  };
                }
                return updated;
              });
            }

            if (data.type === 'tool_call') {
              toolCallsList = [...toolCallsList, {
                tool: data.tool,
                arguments: data.arguments,
                status: 'running'
              }];
              const toolsSnapshot = [...toolCallsList];
              setMessages((prev) => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                  updated[lastIdx] = {
                    ...updated[lastIdx],
                    tool_calls: toolsSnapshot
                  };
                }
                return updated;
              });
            }

            if (data.type === 'tool_result') {
              const tc = toolCallsList.find(t => t.tool === data.tool && t.status === 'running');
              if (tc) {
                tc.status = 'done';
                tc.result = data.result;
              }
              const toolsSnapshot = [...toolCallsList];
              setMessages((prev) => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                  updated[lastIdx] = {
                    ...updated[lastIdx],
                    tool_calls: toolsSnapshot
                  };
                }
                return updated;
              });
            }

            if (data.type === 'error') {
              assistantContent += `\n\n⚠️ ${data.content}`;
              const snapshot = assistantContent;
              setMessages((prev) => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                  updated[lastIdx] = {
                    ...updated[lastIdx],
                    content: snapshot
                  };
                }
                return updated;
              });
            }
          } catch {
            // Ignore malformed lines
          }
        }
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '⚠️ Could not connect to the server. Please check that the backend is running.',
          time: 'just now'
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSend = () => {
    doSend(input);
  };

  const renderInlineMarkdown = (text) => {
    // Replace **bold** with <strong>
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-gray-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  const renderFormattedContent = (content, citation) => {
    const lines = content.split('\n');
    const elements = [];
    let currentBullets = [];

    const flushBullets = (key) => {
      if (currentBullets.length > 0) {
        const bulletsToRender = [...currentBullets];
        currentBullets = [];
        elements.push(
          <ul key={`ul-${key}`} className="space-y-1.5 pl-1 my-1.5">
            {bulletsToRender.map((b, bIdx) => (
              <li key={bIdx} className="flex items-start gap-2 leading-relaxed">
                <span className="text-gray-900 font-bold mt-0.5 shrink-0">•</span>
                <span>{renderInlineMarkdown(b)}</span>
              </li>
            ))}
          </ul>
        );
      }
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) {
        flushBullets(idx);
        return;
      }

      // Check for bullet prefixes (•, -, *, or 1.)
      const bulletMatch = trimmed.match(/^([•\-\*]|\d+\.)\s+(.*)$/);
      if (bulletMatch) {
        currentBullets.push(bulletMatch[2]);
      } else {
        flushBullets(idx);
        elements.push(
          <p key={`p-${idx}`} className="leading-relaxed my-1">
            {renderInlineMarkdown(trimmed)}
          </p>
        );
      }
    });

    flushBullets('final');

    return (
      <div className="space-y-1 text-[13.5px] leading-relaxed">
        {elements}
        {citation && (
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-300/90 text-[10px] font-bold text-gray-700 ml-1.5 align-middle select-none">
            {citation}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* HEADER: Gleap 'C·' Icon Logo & Deletion Controls */}
      <div className="h-[66px] flex items-center justify-between px-4 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center text-gray-700 hover:text-black hover:bg-gray-50 rounded-full transition-colors cursor-pointer"
            title="Back to messages"
          >
            <ChevronLeft size={21} className="stroke-[2.2]" />
          </button>

          <div className="w-[36px] h-[36px] rounded-[11px] bg-black text-white flex items-center justify-center shrink-0 shadow-xs">
            <svg width="22" height="22" viewBox="0 0 100 100" fill="none">
              <path
                d="M50 10 C25 10,10 30,10 50 C10 75,30 90,50 90 C55 90,60 89,65 87"
                stroke="white"
                strokeWidth="12"
                strokeLinecap="round"
              />
              <circle cx="70" cy="30" r="7" fill="white" />
            </svg>
          </div>

          <div className="flex flex-col">
            <h2 className="font-bold text-[15px] leading-tight text-gray-900">
              Kai
            </h2>
            <span className="text-[12px] text-gray-400 font-normal leading-tight mt-0.5">
              Our bot will reply instantly
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Clear Conversation Trash Icon */}
          {showClearConfirm ? (
            <div className="flex items-center gap-1.5 bg-red-50 px-2 py-1 rounded-lg border border-red-100 animate-in fade-in">
              <span className="text-[11px] text-red-600 font-medium">Clear chat?</span>
              <button
                onClick={handleClearConversation}
                className="text-[11px] font-bold text-red-700 hover:underline cursor-pointer"
              >
                Yes
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="text-[11px] text-gray-400 hover:text-gray-700 cursor-pointer ml-1"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 rounded-md transition-colors cursor-pointer"
              title="Clear conversation"
            >
              <Trash2 size={16} />
            </button>
          )}

          {/* Close Button */}
          <button
            onClick={onClose || onBack}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 rounded-md transition-colors cursor-pointer"
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
      </div>

      {/* MESSAGES STREAM */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-2">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4 animate-in fade-in">
            <div className="w-12 h-12 rounded-[14px] bg-black text-white flex items-center justify-center mb-3 shadow-xs">
              <svg width="24" height="24" viewBox="0 0 100 100" fill="none">
                <path
                  d="M50 10 C25 10,10 30,10 50 C10 75,30 90,50 90 C55 90,60 89,65 87"
                  stroke="white"
                  strokeWidth="12"
                  strokeLinecap="round"
                />
                <circle cx="70" cy="30" r="7" fill="white" />
              </svg>
            </div>
            <h3 className="font-bold text-[20px] text-gray-900 leading-snug">
              Hey! 👋
            </h3>
            <p className="text-[13.5px] text-gray-400 mt-1.5 max-w-[260px] leading-relaxed">
              How can I help you today? Ask Kai anything about Gleap or choose an action.
            </p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={index} className="flex flex-col group relative">
            {/* USER MESSAGE */}
            {msg.role === 'user' && (
              <div className="flex justify-end items-center gap-1.5 mb-2">
                <button
                  onClick={() => handleDeleteMessage(index)}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-opacity p-1 cursor-pointer"
                  title="Delete message"
                >
                  <Trash2 size={13} />
                </button>
                <div className="bg-black text-white px-4 py-2.5 rounded-2xl rounded-tr-xs max-w-[85%] text-[13.5px] leading-relaxed font-normal shadow-xs space-y-1.5">
                  {msg.attachment && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/15 text-xs text-white/95 border border-white/20 font-medium">
                      <FileText size={13} className="shrink-0" />
                      <span className="truncate max-w-[180px]">{msg.attachment.name}</span>
                    </div>
                  )}
                  {msg.content && <div>{msg.content}</div>}
                </div>
              </div>
            )}

            {/* ASSISTANT (KAI) MESSAGE */}
            {msg.role === 'assistant' && (
              <div className="flex flex-col items-start max-w-[92%]">
                <div className="flex items-center justify-between w-full mb-1.5 ml-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full bg-black text-white flex items-center justify-center shrink-0">
                      <svg width="10" height="10" viewBox="0 0 100 100" fill="none">
                        <path
                          d="M50 10 C25 10,10 30,10 50 C10 75,30 90,50 90 C55 90,60 89,65 87"
                          stroke="white"
                          strokeWidth="14"
                          strokeLinecap="round"
                        />
                        <circle cx="70" cy="30" r="8" fill="white" />
                      </svg>
                    </div>
                    <span className="text-[12px] font-semibold text-gray-700">Kai</span>
                  </div>

                  <button
                    onClick={() => handleDeleteMessage(index)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-opacity p-1 cursor-pointer mr-2"
                    title="Delete message"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {msg.tool_calls?.map((tc, idx) => (
                  <ToolCallCard
                    key={idx}
                    toolName={tc.tool}
                    args={tc.arguments}
                    status={tc.status}
                    result={tc.result}
                  />
                ))}

                {msg.content && (
                  <div className="bg-[#f2f3f5] text-gray-900 px-4 py-3.5 rounded-[22px] rounded-tl-[6px] text-[14px] leading-relaxed shadow-xs w-full">
                    {renderFormattedContent(msg.content, msg.citation)}
                  </div>
                )}

                {msg.content && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-2 ml-1">
                    <span className="bg-gray-100 text-gray-500 text-[10px] font-semibold px-1.5 py-0.5 rounded">
                      AI
                    </span>
                    <span className="text-[11.5px] text-gray-400 font-normal">
                      {msg.time || 'a few seconds ago'}
                    </span>
                  </div>
                )}

                {msg.content && index === messages.length - 1 && (
                  <div className="w-full mt-3 pt-2 border-t border-gray-100 flex items-center gap-2.5 text-[12.5px] text-gray-500">
                    <span>Was this helpful?</span>

                    <button
                      onClick={() => setFeedbackMap(prev => ({
                        ...prev,
                        [index]: prev[index] === 'down' ? null : 'down'
                      }))}
                      className="p-1 text-gray-400 hover:text-black transition-colors cursor-pointer"
                      title="Dislike"
                    >
                      <ThumbsDown 
                        size={14} 
                        className={feedbackMap[index] === 'down' ? 'text-black fill-black' : ''} 
                      />
                    </button>

                    <button
                      onClick={() => setFeedbackMap(prev => ({
                        ...prev,
                        [index]: prev[index] === 'up' ? null : 'up'
                      }))}
                      className="p-1 text-gray-400 hover:text-black transition-colors cursor-pointer"
                      title="Like"
                    >
                      <ThumbsUp 
                        size={14} 
                        className={feedbackMap[index] === 'up' ? 'text-black fill-black' : ''} 
                      />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {isStreaming && (
          <div className="flex items-center gap-2 text-xs text-gray-400 ml-2">
            <span className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
            <span>Kai is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* FLOATING INPUT CARD AT BOTTOM */}
      <div className="px-3.5 pb-2.5 pt-0 bg-white shrink-0">
        <div className="rounded-2xl border border-gray-200/90 bg-white p-3 shadow-xs hover:border-gray-300 transition-colors flex flex-col justify-between min-h-[92px]">
          {attachedFile && (
            <div className="flex items-center justify-between bg-gray-50 text-xs text-gray-700 px-2.5 py-1 rounded-md mb-2 border border-gray-200">
              <span className="truncate max-w-[220px]">📎 {attachedFile.name}</span>
              <button 
                onClick={() => setAttachedFile(null)} 
                className="text-gray-400 hover:text-red-500 font-bold ml-2 cursor-pointer"
              >
                ×
              </button>
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Write a reply..."
            rows={1}
            disabled={isStreaming}
            className="w-full resize-none outline-none bg-transparent text-[14px] text-gray-800 placeholder:text-gray-400 min-h-[26px] max-h-[80px] leading-relaxed"
          />

          <div className="flex items-center justify-between pt-2 mt-1">
            <div className="flex items-center gap-3 text-gray-400">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setAttachedFile(e.target.files[0]);
                  }
                }}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="hover:text-gray-800 transition-colors p-1 -m-1 cursor-pointer"
                title="Attach file"
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
                  <path d="M6 7.5V17a5 5 0 0 0 10 0V5a3.5 3.5 0 0 0-7 0v11.5a2 2 0 0 0 4 0V8" />
                </svg>
              </button>

              <button
                type="button"
                onClick={toggleListening}
                className={`p-1 -m-1 transition-colors cursor-pointer ${
                  isListening ? 'text-red-500 animate-pulse' : 'hover:text-gray-800'
                }`}
                title="Voice input"
              >
                <Mic size={18} strokeWidth={1.8} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleSend}
              disabled={(!input.trim() && !attachedFile) || isStreaming}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                (input.trim() || attachedFile) && !isStreaming
                  ? 'bg-black text-white hover:bg-black/90 cursor-pointer shadow-xs scale-100 active:scale-95'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
              title="Send reply"
            >
              <ArrowUp size={16} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}