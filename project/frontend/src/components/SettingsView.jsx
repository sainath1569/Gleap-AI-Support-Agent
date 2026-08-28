import React, { useState, useEffect, useRef } from 'react';
import { 
  getTools, 
  toggleTool, 
  getKnowledgeSources, 
  uploadKnowledge, 
  deleteKnowledgeSource
} from '../api';
import { 
  CheckCircle2, 
  Upload, 
  FileText, 
  Database, 
  Wrench, 
  Trash2, 
  RefreshCw 
} from 'lucide-react';

export default function SettingsView({ onClose }) {
  const defaultTools = [
    { name: 'get_weather', description: 'Get live weather report and temperature for any city', enabled: true },
    { name: 'check_service_status', description: 'Check operational uptime and latency of Gleap services', enabled: true },
    { name: 'calculate_pricing', description: 'Calculate custom subscription quote based on plan and team size', enabled: true },
    { name: 'get_customer', description: 'Get customer profile and account details by email', enabled: true },
    { name: 'get_order_status', description: 'Get live shipping status and delivery estimate for an order ID', enabled: true },
    { name: 'get_subscription', description: 'Look up subscription tier, status, and renewal dates', enabled: true },
    { name: 'create_support_ticket', description: 'Open a tracked customer support ticket in the system', enabled: true },
  ];

  const [tools, setTools] = useState(defaultTools);
  const [sources, setSources] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStep, setUploadStep] = useState('');
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchTools();
    fetchSources();
  }, []);

  const fetchTools = async () => {
    try {
      const data = await getTools();
      if (data && data.tools && data.tools.length > 0) {
        const backendMap = {};
        data.tools.forEach(t => { backendMap[t.name] = t; });
        
        const merged = defaultTools.map(dt => {
          if (backendMap[dt.name]) {
            return { ...dt, ...backendMap[dt.name] };
          }
          return dt;
        });
        setTools(merged);
      }
    } catch (e) {
      console.warn("Could not fetch remote tools, using local defaults", e);
    }
  };

  const fetchSources = async () => {
    setIsLoadingSources(true);
    try {
      const data = await getKnowledgeSources();
      if (data && data.sources) {
        setSources(data.sources);
      }
    } catch (e) {
      console.warn("Could not fetch sources", e);
    } finally {
      setIsLoadingSources(false);
    }
  };

  const handleToggle = async (toolName, currentEnabled) => {
    const nextState = !currentEnabled;
    setTools(prev => prev.map(t => t.name === toolName ? { ...t, enabled: nextState } : t));
    try {
      await toggleTool(toolName, nextState);
    } catch (e) {
      console.error("Failed to toggle tool on backend", e);
      fetchTools();
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(12);
    setUploadStep('Reading & parsing document...');
    setUploadFileName(file.name);
    setUploadSuccess(false);

    // Realistic progressive stages
    const progressTimer = setInterval(() => {
      setUploadProgress(prev => {
        if (prev < 35) {
          setUploadStep('Extracting text chunks & metadata...');
          return prev + 6;
        } else if (prev < 72) {
          setUploadStep('Generating 768-dim Gemini vector embeddings...');
          return prev + 5;
        } else if (prev < 92) {
          setUploadStep('Indexing vector points in Qdrant Cloud...');
          return prev + 2;
        }
        return prev;
      });
    }, 380);

    try {
      await uploadKnowledge(file);
      clearInterval(progressTimer);
      setUploadProgress(100);
      setUploadStep('Successfully indexed in Qdrant Cloud!');
      setUploadSuccess(true);
      await fetchSources();
      setTimeout(() => {
        setIsUploading(false);
        setUploadSuccess(false);
        setUploadProgress(0);
        setUploadStep('');
        setUploadFileName('');
      }, 2500);
    } catch (err) {
      clearInterval(progressTimer);
      console.error("Upload failed", err);
      setUploadStep('Upload failed. Please try again.');
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 3000);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteSource = async (docName) => {
    setSources(prev => prev.filter(s => s.name !== docName));
    try {
      await deleteKnowledgeSource(docName);
      await fetchSources();
    } catch (e) {
      console.error("Delete failed", e);
      fetchSources();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Settings Header */}
      <div className="flex justify-between items-center px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-100 bg-white sticky top-0 z-10 shrink-0">
        <div className="w-5" />
        <h2 className="font-semibold text-[16px] sm:text-[17px] text-gray-900">Settings</h2>
        <button 
          onClick={onClose} 
          className="text-gray-500 hover:text-gray-900 transition-colors p-1 -mr-1 rounded-md flex items-center justify-center cursor-pointer"
          title="Close Settings"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3.5 sm:px-5 py-3.5 sm:py-4 space-y-4 sm:space-y-6 pb-28">

        {/* 1. REAL QDRANT KNOWLEDGE SOURCES */}
        <div className="bg-white rounded-2xl border border-gray-200/90 p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center">
                <Database size={17} />
              </div>
              <div>
                <h3 className="font-bold text-[15px] text-gray-900 leading-tight">
                  Knowledge Sources
                </h3>
                <p className="text-[12px] text-gray-400">
                  Real vector embeddings in Qdrant Cloud
                </p>
              </div>
            </div>

            <button
              onClick={fetchSources}
              disabled={isLoadingSources}
              className="text-gray-400 hover:text-black p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              title="Refresh sources"
            >
              <RefreshCw size={14} className={isLoadingSources ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Upload Button & Progress Indicator */}
          <div className="mb-3.5">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleUpload} 
              className="hidden" 
              accept=".pdf,.txt,.md"
            />
            
            {isUploading ? (
              <div className="p-3.5 bg-gray-50/90 border border-gray-200 rounded-xl space-y-2.5 shadow-2xs animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <FileText size={15} className="text-black shrink-0" />
                    <span className="text-xs font-semibold text-gray-900 truncate">
                      {uploadFileName}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-gray-800 bg-white px-2 py-0.5 rounded-md border border-gray-200 shadow-2xs shrink-0">
                    {uploadProgress}%
                  </span>
                </div>

                {/* Animated Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 rounded-full ${
                      uploadSuccess ? 'bg-emerald-500' : 'bg-black'
                    }`}
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>

                {/* Step status label */}
                <div className="flex items-center gap-1.5 text-[11.5px] text-gray-500">
                  {uploadSuccess ? (
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-black animate-pulse shrink-0" />
                  )}
                  <span className={uploadSuccess ? 'text-emerald-700 font-medium' : ''}>
                    {uploadStep}
                  </span>
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-gray-50 hover:bg-gray-100 border border-dashed border-gray-300 rounded-xl text-xs font-semibold text-gray-700 transition-all cursor-pointer hover:border-gray-400 active:scale-[0.99]"
              >
                <Upload size={14} className="text-gray-500" />
                <span>Upload Document to Qdrant (.md, .txt, .pdf)</span>
              </button>
            )}
          </div>

          {/* Stored Sources List */}
          <div className="space-y-2">
            {sources.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-2">
                No documents found in Qdrant.
              </p>
            ) : (
              sources.map((s, idx) => (
                <div 
                  key={idx}
                  className="flex items-start justify-between p-2.5 rounded-xl bg-gray-50/70 border border-gray-100 hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-start gap-2.5 min-w-0 pr-2">
                    <FileText size={16} className="text-black mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-gray-900 truncate">
                        {s.name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400">
                        <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-medium text-[10px]">
                          Qdrant Cloud
                        </span>
                        <span>•</span>
                        <span>{s.chunks_count || 1} vector chunks</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteSource(s.name)}
                    className="text-gray-400 hover:text-red-600 p-1 rounded transition-colors cursor-pointer"
                    title="Delete document"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 2. AGENT TOOL INTEGRATIONS */}
        <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center">
              <Wrench size={16} />
            </div>
            <div>
              <h3 className="font-bold text-[15px] text-gray-900 leading-tight">
                Agent Tools
              </h3>
              <p className="text-[12px] text-gray-400">
                Enable or disable automated actions
              </p>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {tools.map((tool) => (
              <div 
                key={tool.name} 
                className="py-2.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 pr-2">
                  <div className="font-semibold text-xs text-gray-900">
                    {tool.name}
                  </div>
                  <div className="text-[11.5px] text-gray-500 leading-tight mt-0.5">
                    {tool.description}
                  </div>
                </div>

                {/* Toggle switch */}
                <button
                  type="button"
                  onClick={() => handleToggle(tool.name, tool.enabled)}
                  className={`w-9 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-200 shrink-0 ${
                    tool.enabled ? 'bg-black' : 'bg-gray-300'
                  }`}
                >
                  <div 
                    className={`bg-white w-4 h-4 rounded-full shadow-xs transform transition-transform duration-200 ${
                      tool.enabled ? 'translate-x-4' : 'translate-x-0'
                    }`} 
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
