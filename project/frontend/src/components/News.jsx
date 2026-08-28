import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, CheckCircle2, Sparkles } from 'lucide-react';
import heroImg from '../assets/hero.png';
import newsImg from '../assets/news.png';
import news2Img from '../assets/news2.png';
import news3Img from '../assets/news3.png';
import news1Img from '../assets/news1.png';

const articles = [
  {
    id: 'pipelines',
    category: 'News',
    title: 'Pipelines: lightweight CRM boards in Gleap',
    description: 'Pipelines bring lightweight CRM boards into Gleap. Track deals, onboarding, renewals — an...',
    img: heroImg,
    author: 'Tobi',
    authorImg: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=64&h=64&fit=crop&crop=faces',
    date: '16 days ago',
    readTime: '3 min read',
    paragraphs: [
      'Pipelines bring lightweight CRM boards into Gleap. Track deals, onboarding, renewals — any process — as your companies and contacts move from stage to stage, right next to your inbox.',
      'Managing leads, active trials, and support renewals across multiple disconnected tools is frustrating. With Pipelines, everything lives directly inside your customer communication hub so your entire team stays aligned.',
      'Each pipeline column is fully customizable. You can drag and drop cards, assign owners, log notes, and establish automated triggers that notify team members when a deal advances.',
      'Furthermore, any incoming support conversation or feature feedback can be connected to an active pipeline deal with a single click, giving customer success and sales teams instantaneous context.'
    ],
    features: [
      'Visual drag & drop stages: Tailor columns to match your exact sales or onboarding workflow.',
      'Direct inbox linkage: Seamlessly connect support tickets and bug reports to active deals.',
      'Team assignments & SLA reminders: Keep everyone accountable with automatic stage notifications.',
      'Custom properties & deal values: Track estimated contract value and target completion dates.'
    ],
    quote: 'Pipelines give our customer-facing teams the exact visibility they need without the bloat of traditional legacy CRMs.'
  },
  {
    id: 'reactions-threads',
    category: 'News',
    title: 'Reactions & threads in conversations',
    description: 'React on any message, and take side conversations into a thread — without losing the main timeline.',
    img: newsImg,
    author: 'Lukas',
    authorImg: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&fit=crop&crop=faces',
    date: '22 days ago',
    readTime: '4 min read',
    paragraphs: [
      'This is the biggest update to the Gleap inbox yet. AI agents now work directly inside your tickets, conversations can branch into threads, and the whole dashboard can be driven from the keyboard.',
      'When resolving complex customer inquiries, team discussions often clutter the primary ticket timeline. With side conversation threads, teammates can debate technical solutions or collaborate with engineering in a dedicated space without confusing the customer.',
      'Reactions allow for rapid acknowledgments and lightweight sentiment tracking. Leave a thumbs up, checkmark, or custom emoji to signal that an issue has been reviewed without generating notification spam.',
      'All threads maintain real-time bidirectional syncing, allowing you to convert any thread into a standalone task or follow-up ticket whenever appropriate.'
    ],
    features: [
      'Side conversation threads: Discuss complex issues with your team privately inside the ticket.',
      'Instant emoji reactions: Quick acknowledgments and lightweight collaborative signals.',
      'Keyboard shortcuts: Navigate threads, reply, and resolve issues without leaving your keys.',
      'AI summaries: Get concise recaps of multi-turn internal threads before responding.'
    ],
    quote: 'Threads allow our engineering and support teams to resolve edge cases 2x faster without endless context-switching.'
  },
  {
    id: 'companies',
    category: 'News',
    title: 'Companies: group contacts under one view',
    description: 'Group every contact under one company — with plans, teammates and SLAs in a single view.',
    img: news2Img,
    author: 'Lukas',
    authorImg: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&fit=crop&crop=faces',
    date: '25 days ago',
    readTime: '3 min read',
    paragraphs: [
      'Group every contact under one company — with plans, teammates and SLAs in a single view. Never lose track of key account stakeholders or service commitments.',
      'When multiple users from the same organization contact support, seeing their collective history is essential. Companies consolidates open tickets, previous chats, and billing tiers into one shared overview.',
      'You can now specify custom SLA targets per organization. High-tier accounts automatically bubble to the top of your queue with priority badges, ensuring your most critical customers receive immediate attention.',
      'Enrich company profiles with custom metadata including ARR, renewal dates, technical stack, and assigned account executives.'
    ],
    features: [
      'Consolidated company directory: See all teammates and previous inquiries in one place.',
      'Dedicated SLA timers: Automatically prioritize enterprise accounts with customized SLAs.',
      'Plan & subscription badges: Instantly identify whether a user is on Free, Growth, or Enterprise.',
      'Shared company notes: Leave persistent customer notes visible to all team members.'
    ],
    quote: 'Seeing the entire organization’s interaction history in one view has revolutionized our VIP customer management.'
  },
  {
    id: 'reply-message',
    category: 'Changelogs',
    title: 'Reply to a specific message',
    description: 'Just like your favourite messengers — reply directly to a specific message so every conversation stays clear and in context.',
    img: news3Img,
    author: 'Lukas',
    authorImg: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&fit=crop&crop=faces',
    date: '1 month ago',
    readTime: '2 min read',
    paragraphs: [
      'Just like your favourite messengers — reply directly to a specific message so every conversation stays clear and in context.',
      'In long customer discussions with multiple questions, responding generally often causes confusion. Direct quote replies allow you to cite the exact message you are addressing.',
      'Clicking on a quoted snippet automatically scrolls and highlights the referenced message, creating a seamless audit trail for both customer and support agent.',
      'Works seamlessly across our web widget, mobile SDKs, and agent dashboard, ensuring clarity across every touchpoint.'
    ],
    features: [
      'Direct message quoting: Hover any message bubble to reply directly to it.',
      'Click-to-jump navigation: Instantly jump back to the original context with smooth scrolling.',
      'Multi-lingual quote translation: Quoted context adapts to the agent’s preferred language.',
      'SDK support: Fully supported across iOS, Android, React, and Flutter widgets.'
    ],
    quote: 'Direct replies eliminate confusion and reduce back-and-forth ticket times significantly.'
  },
  {
    id: 'mobile-app',
    category: 'Changelogs',
    title: 'AI agents, threads, and a keyboard-first inbox',
    description: 'Reply instantly, collaborate effectively, and navigate your inbox faster than ever across all devices.',
    img: news1Img,
    author: 'Tobi',
    authorImg: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=64&h=64&fit=crop&crop=faces',
    date: '1 month ago',
    readTime: '3 min read',
    paragraphs: [
      'Reply instantly, collaborate effectively, and navigate your inbox faster than ever across all your devices with our newly redesigned mobile experience.',
      'Designed from the ground up for speed, the mobile inbox gives you lightning-fast access to open conversations, triage filters, and push notifications when urgent issues arise.',
      'Offline resilience ensures you can draft replies and review tickets on airplanes or spotty connections, with automatic sync once reconnected.',
      'Pairing native speed with keyboard shortcuts on iPad and tablet keyboards gives power users full desktop-level capability on the move.'
    ],
    features: [
      'Native iOS & Android apps: Built for responsiveness and battery efficiency.',
      'Instant push alerts: Receive immediate notifications for SLA warnings and VIP mentions.',
      'Offline capability: Read, draft, and triage tickets without active internet connectivity.',
      'Biometric authentication: Secure your customer data with FaceID and fingerprint unlocking.'
    ],
    quote: 'The mobile app gives our founders and on-call engineers total peace of mind wherever they are.'
  }
];

export default function News({ onClose, onArticleStateChange, initialArticleId }) {
  const [selectedArticle, setSelectedArticle] = useState(() => {
    if (initialArticleId) {
      return articles.find(a => a.id === initialArticleId) || null;
    }
    return null;
  });
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    if (initialArticleId) {
      const found = articles.find(a => a.id === initialArticleId);
      if (found) {
        setSelectedArticle(found);
        onArticleStateChange?.(true);
      }
    }
  }, [initialArticleId]);

  const handleSelectArticle = (article) => {
    setSelectedArticle(article);
    onArticleStateChange?.(true);
  };

  const handleBackToNews = () => {
    setSelectedArticle(null);
    onArticleStateChange?.(false);
  };

  const handleClose = () => {
    onArticleStateChange?.(false);
    onClose?.();
  };

  const filteredArticles = activeCategory === 'All'
    ? articles
    : articles.filter(a => a.category === activeCategory);

  // --------------------------------------------------------
  // ARTICLE DETAIL VIEW (Wide Expanded View)
  // --------------------------------------------------------
  if (selectedArticle) {
    return (
      <div className="absolute inset-0 z-40 bg-white flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Detail Header: < Back | Title | × Close */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-white shrink-0">
          <button 
            onClick={handleBackToNews}
            className="text-gray-800 hover:text-black p-1 -ml-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 text-sm font-medium"
            title="Back to news"
          >
            <ChevronLeft size={20} className="stroke-[2.2]" />
            <span className="hidden sm:inline">Back</span>
          </button>
          
          <div className="flex-1 min-w-0 px-4 text-center">
            <h2 className="font-bold text-sm text-gray-900 truncate">
              {selectedArticle.title}
            </h2>
          </div>

          <button 
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-900 p-1 -mr-1 rounded-md transition-colors cursor-pointer"
            title="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Article Detail */}
        <div className="flex-1 overflow-y-auto">
          {/* Full-width Hero Cover Banner */}
          <div className="w-full h-64 sm:h-72 bg-gray-100 overflow-hidden relative">
            <img 
              src={selectedArticle.img} 
              alt={selectedArticle.title} 
              className="w-full h-full object-cover object-center" 
            />
          </div>

          {/* Article Story Body */}
          <div className="p-6 sm:p-8 max-w-3xl mx-auto space-y-6">
            <div>
              <h1 className="text-[25px] sm:text-[28px] font-bold text-gray-900 leading-tight">
                {selectedArticle.title}
              </h1>

              {/* Author Row */}
              <div className="flex items-center gap-2.5 pt-3 pb-2 border-b border-gray-100">
                <img 
                  src={selectedArticle.authorImg} 
                  alt={selectedArticle.author} 
                  className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-gray-200" 
                />
                <div className="flex items-center gap-2 text-xs text-gray-500 font-normal">
                  <span className="font-semibold text-gray-800">{selectedArticle.author}</span>
                  <span>•</span>
                  <span>{selectedArticle.date}</span>
                  <span>•</span>
                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium text-[11px]">
                    {selectedArticle.readTime}
                  </span>
                </div>
              </div>
            </div>

            {/* Content Body */}
            <div className="text-[15px] text-gray-700 leading-relaxed font-normal space-y-4">
              <p className="text-[16px] text-gray-800 font-medium leading-relaxed">
                {selectedArticle.paragraphs[0]}
              </p>
              
              <p>
                {selectedArticle.paragraphs[1]}
              </p>

              {/* Quote Callout */}
              <div className="my-6 p-4 rounded-xl bg-gray-50 border-l-4 border-black text-gray-800 text-[14.5px] italic">
                "{selectedArticle.quote}"
              </div>

              <p>
                {selectedArticle.paragraphs[2]}
              </p>

              {/* Features List Section */}
              <div className="pt-2 pb-2">
                <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Sparkles size={16} className="text-black" />
                  Key Highlights & Capabilities
                </h3>
                <div className="space-y-2.5">
                  {selectedArticle.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-[14px] text-gray-700">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-1" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p>
                {selectedArticle.paragraphs[3]}
              </p>
            </div>

            {/* Footer */}
            <div className="pt-6 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
              <span>Published by Gleap Product Team</span>
              <button 
                onClick={handleBackToNews}
                className="text-black font-semibold hover:underline cursor-pointer"
              >
                ← Back to all news
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------
  // NEWS FEED LIST VIEW
  // --------------------------------------------------------
  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-10 shrink-0">
        <div className="w-5" />
        <h2 className="font-semibold text-[17px] text-gray-900">News</h2>
        <button 
          onClick={handleClose}
          className="text-gray-500 hover:text-gray-900 transition-colors p-1 -mr-1 rounded-md flex items-center justify-center cursor-pointer"
          title="Close"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center justify-center gap-2 py-3 px-4 bg-white shrink-0 border-b border-gray-50">
        {['All', 'News', 'Changelogs'].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-xs transition-all cursor-pointer select-none ${
              activeCategory === cat
                ? 'bg-black text-white font-semibold shadow-sm'
                : 'bg-gray-100/90 text-gray-600 font-medium hover:bg-gray-200/80'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Article feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-28">
        {filteredArticles.map((a) => (
          <div 
            key={a.id} 
            onClick={() => handleSelectArticle(a)}
            className="bg-white rounded-2xl overflow-hidden border border-gray-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            {/* Visual Cover Asset */}
            <div className="h-44 w-full overflow-hidden bg-gray-100 relative">
              <img 
                src={a.img} 
                alt={a.title} 
                className="w-full h-full object-cover object-center group-hover:scale-[1.01] transition-transform duration-300" 
              />
            </div>

            {/* Content info */}
            <div className="p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0 pr-1">
                <h3 className="font-bold text-[15px] text-gray-900 mb-1 leading-snug group-hover:text-black">
                  {a.title}
                </h3>
                <p className="text-[13px] text-gray-500 leading-relaxed line-clamp-2 font-normal">
                  {a.description}
                </p>
              </div>

              <ChevronRight 
                size={18} 
                className="text-gray-900 stroke-[2] shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform" 
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
