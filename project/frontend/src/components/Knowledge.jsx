import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle } from 'lucide-react';
import { getKnowledgeSources, uploadKnowledge } from '../api';

export default function Knowledge() {
  const [sources, setSources] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      const data = await getKnowledgeSources();
      if (data && data.sources) {
        setSources(data.sources);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await uploadKnowledge(file);
      await fetchSources();
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-white sticky top-0 z-10 shrink-0">
        <div className="w-6"></div>
        <h2 className="font-semibold text-base">Knowledge Base</h2>
        <button className="text-slate-400 hover:text-slate-600">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex flex-col items-center justify-center text-center">
          <UploadCloud size={32} className="text-slate-400 mb-2" />
          <h3 className="font-semibold text-sm mb-1">Upload Documents</h3>
          <p className="text-xs text-slate-500 mb-4">Support for PDF, TXT, MD.</p>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleUpload} 
            className="hidden" 
            accept=".pdf,.txt,.md"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="bg-black text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {isUploading ? 'Uploading...' : 'Browse Files'}
          </button>
        </div>

        <h3 className="text-sm font-medium text-slate-500 mb-3 px-1">Indexed Sources</h3>
        
        {sources.length === 0 ? (
          <div className="text-center text-slate-400 text-sm mt-4">No sources indexed yet.</div>
        ) : (
          <div className="space-y-2">
            {sources.map((src, i) => (
              <div key={i} className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
                    <FileText size={16} />
                  </div>
                  <div className="text-sm font-medium text-slate-700 truncate max-w-[180px]">{src}</div>
                </div>
                <div className="flex items-center gap-1 text-xs text-green-500 font-medium">
                  <CheckCircle size={14} />
                  <span>Indexed</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
