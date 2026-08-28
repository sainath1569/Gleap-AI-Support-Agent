import React from 'react';
import { Settings, Check, Loader2, XCircle } from 'lucide-react';

export default function ToolCallCard({ toolName, args, status, result }) {
  // status: 'executing', 'completed', 'error'
  
  return (
    <div className="my-3 mx-4 p-3 bg-slate-50 border border-slate-200 rounded-xl shadow-sm text-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="text-slate-500">
          <Settings size={16} />
        </div>
        <div className="font-semibold text-slate-700 flex-1">{toolName}</div>
        <div>
          {status === 'executing' && <Loader2 size={16} className="text-blue-500 animate-spin" />}
          {status === 'completed' && <Check size={16} className="text-green-500" />}
          {status === 'error' && <XCircle size={16} className="text-red-500" />}
        </div>
      </div>
      
      {args && Object.keys(args).length > 0 && (
        <div className="mb-2 bg-slate-100 p-2 rounded text-xs font-mono text-slate-600 overflow-x-auto">
          {Object.entries(args).map(([k, v]) => (
            <div key={k}><span className="font-semibold">{k}:</span> {JSON.stringify(v)}</div>
          ))}
        </div>
      )}
      
      {status === 'completed' && result && (
        <div className="mt-2 pt-2 border-t border-slate-200">
           <div className="text-xs text-slate-500 font-semibold mb-1">Result:</div>
           <pre className="text-xs font-mono text-slate-700 bg-white p-2 rounded overflow-x-auto border border-slate-100">
             {JSON.stringify(result, null, 2)}
           </pre>
        </div>
      )}
    </div>
  );
}
