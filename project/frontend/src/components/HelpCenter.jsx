import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Search } from 'lucide-react';

/*
  Help Center view matching Gleap reference screenshots:
  - Screenshot 1: Search bar + Category cards with authentic squircle icons and chevrons.
  - Screenshot 2: Category detail view with back button, big title, subtitle, and
    rounded card containing exact sub-articles with emojis and descriptions.
*/

const helpCategories = [
  {
    id: 'quick-start',
    title: 'Quick start with Gleap',
    description: 'Before you start using Gleap, here is a short guide to help you get started.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
        <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      </svg>
    ),
    articles: [
      {
        id: 'installation',
        title: 'Installing the Gleap widget',
        emoji: '🚀',
        description: 'How to install and initialize the Gleap script in your web or mobile app.'
      },
      {
        id: 'sdk-setup',
        title: 'Platform SDK quick starts',
        emoji: '💻',
        description: 'Guides for React, Vue, Angular, iOS, Android, and Flutter.'
      },
      {
        id: 'team-invites',
        title: 'Inviting your teammates',
        emoji: '👥',
        description: 'Add team members and set role-based permissions.'
      },
      {
        id: 'testing-widget',
        title: 'Testing your installation in development',
        emoji: '🛠️',
        description: 'Verifying test events, user identification, and network logs.'
      }
    ]
  },
  {
    id: 'customizing',
    title: 'Customizing the Gleap widget',
    description: 'Learn how to configure the Gleap widget.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m14 7 3 3" />
        <path d="m5 19 3-3" />
        <path d="M18.4 4.6a2 2 0 0 1 0 2.8L7.8 18H5v-2.8L15.6 4.6a2 2 0 0 1 2.8 0Z" />
      </svg>
    ),
    articles: [
      {
        id: 'theme-colors',
        title: 'Theme colors and dark mode',
        emoji: '🎨',
        description: 'Customize accent colors, launcher shapes, and dark mode triggers.'
      },
      {
        id: 'widget-positioning',
        title: 'Positioning & launcher icon',
        emoji: '📍',
        description: 'Change corner placement, custom launchers, and offsets.'
      },
      {
        id: 'tabs-configuration',
        title: 'Configuring active navigation tabs',
        emoji: '🎛️',
        description: 'Choose which tabs (Home, Messages, News, Help) appear in your widget.'
      },
      {
        id: 'localization',
        title: 'Multi-language localization',
        emoji: '🌍',
        description: 'Translate standard UI strings into over 25 languages automatically.'
      }
    ]
  },
  {
    id: 'ai-chatbot',
    title: 'AI chatbot',
    description: 'Learn more about Kai.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="4" />
        <path d="M9 10h.01" strokeWidth="3" />
        <path d="M15 10h.01" strokeWidth="3" />
        <path d="M9.5 15a3.5 3.5 0 0 0 5 0" />
      </svg>
    ),
    articles: [
      {
        id: 'kai-intro',
        title: 'Meet Kai: AI support assistant',
        emoji: '🤖',
        description: 'How Kai resolves repetitive queries and handles tier-1 support.'
      },
      {
        id: 'knowledge-sync',
        title: 'Training Kai on your documentation',
        emoji: '📚',
        description: 'Connect your website, Zendesk, Notion, or PDFs to ground AI responses.'
      },
      {
        id: 'handoff-rules',
        title: 'Human handoff and escalation rules',
        emoji: '🚨',
        description: 'Route conversations to live human agents when Kai is unsure.'
      },
      {
        id: 'custom-prompts',
        title: 'Custom tone and system instructions',
        emoji: '✍️',
        description: 'Define Kai’s personality, response lengths, and prohibited topics.'
      }
    ]
  },
  {
    id: 'multichannel',
    title: 'Multichannel support',
    description: 'Connect across every channel. One inbox for them all.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
        <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
      </svg>
    ),
    articles: [
      {
        id: 'live-chat',
        title: 'Live chat & in-app messaging',
        emoji: '💬',
        description: 'Configure real-time presence indicators and typing indicators.'
      },
      {
        id: 'slack-sync',
        title: 'Two-way Slack integration',
        emoji: '🔄',
        description: 'Reply to customer inquiries directly from dedicated Slack channels.'
      },
      {
        id: 'whatsapp-integration',
        title: 'WhatsApp Business API',
        emoji: '📱',
        description: 'Manage WhatsApp customer conversations in your Gleap unified inbox.'
      }
    ]
  },
  {
    id: 'email',
    title: 'Email',
    description: 'Learn more about email forwarding, template usage and more.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="16" x="2" y="4" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
    ),
    // Exact articles from Screenshot 2
    articles: [
      {
        id: 'domain-verification',
        title: 'Domain verification',
        emoji: '🔗',
        description: 'Configuring DKIM and return-path DNS records at your DNS provider'
      },
      {
        id: 'email-forwarding',
        title: 'Email forwarding',
        emoji: '📥',
        description: 'Learn how to use Gleap as your team inbox.'
      },
      {
        id: 'email-templates',
        title: 'Email templates',
        emoji: '✉️',
        description: 'You can customize Gleap email templates by editing the HTML, using variables for dynamic content, and...'
      },
      {
        id: 'email-signatures',
        title: 'Email signatures',
        emoji: '✍️',
        description: "Add a personalized sign-off to your team's email replies."
      },
      {
        id: 'email-settings',
        title: 'Email settings',
        emoji: '📨',
        description: 'Email settings'
      },
      {
        id: 'apple-relay',
        title: "Using Apple's Private Email Relay with Gleap",
        description: 'Extra email setup required to support Apple’s Private Email Relay.'
      },
      {
        id: 'custom-reply-to',
        title: 'Custom reply-to email address',
        description: 'Set a dedicated reply-to address for outgoing notification emails.'
      }
    ]
  },
  {
    id: 'feedback',
    title: 'Feedback',
    description: 'Fix bugs 10x faster with Gleap.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M8 12h8" />
        <path d="M12 8v8" />
      </svg>
    ),
    articles: [
      {
        id: 'visual-bug-reporting',
        title: 'Visual bug reporting & replays',
        emoji: '🎥',
        description: 'Capture console logs, network payloads, and 60-second video replays.'
      },
      {
        id: 'feature-requests',
        title: 'Public feature request voting boards',
        emoji: '💡',
        description: 'Let users submit ideas and vote on roadmap items directly.'
      },
      {
        id: 'nps-surveys',
        title: 'Customer CSAT and NPS surveys',
        emoji: '⭐',
        description: 'Trigger targeted rating popups after support conversations.'
      }
    ]
  },
  {
    id: 'outbound',
    title: 'Outbound & engagement',
    description: 'Engage customers with targeted product tours, news, and announcements.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 11 18-5v12L3 14v-3z" />
        <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
      </svg>
    ),
    articles: [
      {
        id: 'announcements',
        title: 'Targeted in-app announcements',
        emoji: '📢',
        description: 'Broadcast new releases to specific user cohorts or tiers.'
      },
      {
        id: 'product-tours',
        title: 'Interactive step-by-step product walkthroughs',
        emoji: '🧭',
        description: 'Onboard new signups with guided interactive tooltips.'
      }
    ]
  }
];

export default function HelpCenter({ onClose }) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeArticle, setActiveArticle] = useState(null);

  // Filter categories and articles based on search query
  const filteredCategories = helpCategories.filter((cat) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchesCat = cat.title.toLowerCase().includes(q) || cat.description.toLowerCase().includes(q);
    const matchesArticle = cat.articles.some(a => a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q));
    return matchesCat || matchesArticle;
  });

  // --------------------------------------------------------
  // SCREENSHOT 2: CATEGORY DETAIL VIEW (e.g. Email)
  // --------------------------------------------------------
  if (selectedCategory) {
    return (
      <div className="flex flex-col h-full bg-white relative animate-in fade-in duration-150">
        {/* Detail Header: < Back | Category Name | × Close */}
        <div className="flex items-center justify-between px-3.5 sm:px-5 py-3.5 sm:py-4 border-b border-gray-100 bg-white shrink-0">
          <button 
            onClick={() => {
              if (activeArticle) {
                setActiveArticle(null);
              } else {
                setSelectedCategory(null);
              }
            }}
            className="text-gray-800 hover:text-black p-1 -ml-1 rounded-md transition-colors cursor-pointer"
            title="Back"
          >
            <ChevronLeft size={20} className="stroke-[2.2]" />
          </button>

          <h2 className="font-bold text-sm text-gray-900 truncate px-2 flex-1 text-center">
            {activeArticle ? activeArticle.title : selectedCategory.title}
          </h2>

          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 p-1 -mr-1 rounded-md transition-colors cursor-pointer"
            title="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3.5 sm:py-4 pb-28">
          {activeArticle ? (
            /* Sub-article Full View */
            <div className="space-y-4">
              <h1 className="text-[20px] sm:text-[22px] font-bold text-gray-900 leading-tight">
                {activeArticle.title} {activeArticle.emoji}
              </h1>
              <p className="text-[13.5px] sm:text-[14px] text-gray-600 leading-relaxed">
                {activeArticle.description}
              </p>
              <div className="p-3.5 sm:p-4 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-600 leading-relaxed">
                Need more help configuring {activeArticle.title.toLowerCase()}? Contact our support team or explore related documentation guides.
              </div>
            </div>
          ) : (
            /* Category Articles List (Matches Screenshot 2) */
            <div>
              {/* Category Title & Subtitle */}
              <div className="mb-4">
                <h1 className="text-[20px] sm:text-[22px] font-bold text-gray-900 mb-1">
                  {selectedCategory.title}
                </h1>
                <p className="text-[13px] sm:text-[13.5px] text-gray-500 leading-relaxed">
                  {selectedCategory.description}
                </p>
              </div>

              {/* Rounded Articles Container Card */}
              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden p-1 flex flex-col">
                {selectedCategory.articles.map((art) => (
                  <div
                    key={art.id}
                    onClick={() => setActiveArticle(art)}
                    className="px-3 sm:px-3.5 py-2.5 sm:py-3 rounded-xl hover:bg-gray-50/80 transition-colors cursor-pointer flex items-center justify-between gap-3 border-b border-gray-100/70 last:border-b-0"
                  >
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="font-medium text-[13.5px] sm:text-[14px] text-gray-900 leading-snug flex items-center gap-1.5">
                        <span>{art.title}</span>
                        {art.emoji && <span className="text-sm">{art.emoji}</span>}
                      </div>
                      <div className="text-[12px] sm:text-[12.5px] text-gray-500 leading-relaxed mt-0.5 line-clamp-2">
                        {art.description}
                      </div>
                    </div>

                    <ChevronRight 
                      size={16} 
                      className="text-gray-700 shrink-0 stroke-[2]" 
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --------------------------------------------------------
  // SCREENSHOT 1: HELP CENTER MAIN CATEGORY LIST
  // --------------------------------------------------------
  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="flex justify-between items-center px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-100 bg-white sticky top-0 z-10 shrink-0">
        <div className="w-5" />
        <h2 className="font-semibold text-[16px] sm:text-[17px] text-gray-900">Help center</h2>
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

      {/* Pill Search bar matching Gleap reference */}
      <div className="px-3.5 sm:px-4 pt-3 pb-1 shrink-0 bg-white">
        <div className="flex items-center gap-2.5 bg-gray-100/80 hover:bg-gray-100/95 transition-colors rounded-xl px-3.5 py-2.5 border border-transparent focus-within:border-gray-300 focus-within:bg-white">
          <Search size={17} className="text-gray-400 shrink-0" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ask me anything..." 
            className="flex-1 bg-transparent outline-none text-[14px] text-gray-800 placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Categories List matching Screenshot 1 */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 pb-28 pt-2">
        {filteredCategories.map((cat) => (
          <div 
            key={cat.id}
            onClick={() => {
              setSelectedCategory(cat);
              setActiveArticle(null);
            }}
            className="flex items-center gap-3.5 py-3.5 px-2 rounded-xl cursor-pointer transition-all hover:bg-gray-50 border-b border-gray-100/80 last:border-b-0"
          >
            {/* Gray squircle icon container */}
            <div className="w-11 h-11 bg-gray-100/90 rounded-[13px] flex items-center justify-center text-gray-900 shrink-0 shadow-xs">
              {cat.icon}
            </div>

            {/* Title & Description */}
            <div className="flex-1 min-w-0 pr-1">
              <h3 className="font-bold text-[14.5px] text-gray-900 leading-snug">
                {cat.title}
              </h3>
              <p className="text-[12.5px] text-gray-500 leading-relaxed line-clamp-2 mt-0.5 font-normal">
                {cat.description}
              </p>
            </div>

            {/* Chevron Right */}
            <ChevronRight 
              size={16} 
              className="text-gray-400 shrink-0 stroke-[2] ml-1" 
            />
          </div>
        ))}
      </div>
    </div>
  );
}
