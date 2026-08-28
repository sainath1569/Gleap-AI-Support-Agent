import React from 'react';
import { Settings, Check, Loader2, XCircle } from 'lucide-react';

export default function ToolCallCard({ toolName, args, status, result }) {
  // status: 'executing', 'completed', 'error'
  
  return (
    <div className="my-2 mx-0 sm:mx-1 p-2.5 sm:p-3 w-full bg-slate-50/90 border border-slate-200/90 rounded-xl shadow-xs text-xs sm:text-sm overflow-hidden">
      <div className="flex items-center gap-2 mb-2">
        <div className="text-slate-500 shrink-0">
          <Settings size={15} />
        </div>
        <div className="font-semibold text-slate-700 flex-1 truncate text-xs sm:text-sm">{toolName}</div>
        <div className="shrink-0">
          {status === 'executing' && <Loader2 size={15} className="text-blue-500 animate-spin" />}
          {status === 'completed' && <Check size={15} className="text-green-500" />}
          {status === 'error' && <XCircle size={15} className="text-red-500" />}
        </div>
      </div>
      
      {args && Object.keys(args).length > 0 && (
        <div className="mb-2 bg-slate-100/90 p-2 rounded-lg text-[11px] font-mono text-slate-600 overflow-x-auto">
          {Object.entries(args).map(([k, v]) => (
            <div key={k} className="truncate"><span className="font-semibold">{k}:</span> {JSON.stringify(v)}</div>
          ))}
        </div>
      )}
      
      {status === 'completed' && result && (
        <div className="mt-2 pt-2 border-t border-slate-200/90">
           <div className="text-[11px] text-slate-500 font-semibold mb-1">Result:</div>
           <pre className="text-[11px] font-mono text-slate-700 bg-white p-2 rounded-lg overflow-x-auto border border-slate-100">
             {JSON.stringify(result, null, 2)}
           </pre>
        </div>
      )}
    </div>
  );
}
