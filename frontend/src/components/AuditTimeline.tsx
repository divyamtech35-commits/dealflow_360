import React, { useEffect, useState } from 'react';
import client from '../api/client';

interface AuditLogEntry {
    _id: string;
    actorName: string;
    actorRole: string;
    action: string;
    fromStatus?: string;
    toStatus?: string;
    reason?: string;
    createdAt: string;
}

export default function AuditTimeline({ quoteId }: { quoteId: string }) {
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!quoteId) return;
        setIsLoading(true);
        client.get(`/quotations/${quoteId}/audit-log`)
            .then(r => setLogs(r.data || []))
            .catch(e => console.error(e))
            .finally(() => setIsLoading(false));
    }, [quoteId]);

    const getActionBadgeColor = (action: string) => {
        const act = action.toLowerCase();
        if (act.includes('approve') || act.includes('auto_approve')) {
            return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        }
        if (act.includes('reject')) {
            return 'bg-red-50 text-red-700 border-red-200';
        }
        if (act.includes('return') || act.includes('submit')) {
            return 'bg-amber-50 text-amber-700 border-amber-200';
        }
        return 'bg-blue-50 text-blue-700 border-blue-200';
    };

    const getNodeColor = (action: string) => {
        const act = action.toLowerCase();
        if (act.includes('approve')) return 'bg-emerald-500 ring-emerald-100';
        if (act.includes('reject')) return 'bg-red-500 ring-red-100';
        if (act.includes('return') || act.includes('submit')) return 'bg-amber-500 ring-amber-100';
        return 'bg-blue-500 ring-blue-100';
    };

    return (
        <div className="bg-slate-50/70 rounded-2xl border border-slate-200/90 p-5 mt-6">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-200/70">
                <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Lifecycle & Audit Trail
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                        Immutable record of changes, submissions, and approval decisions.
                    </p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white text-slate-600 border border-slate-200 shadow-xs">
                    {logs.length} Events
                </span>
            </div>

            {isLoading ? (
                <div className="py-6 text-center text-xs text-slate-400">Loading audit history...</div>
            ) : logs.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white/60">
                    No lifecycle events recorded yet for this quotation.
                </div>
            ) : (
                <div className="relative pl-4 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {logs.map((log) => (
                        <div key={log._id} className="relative pl-4 text-xs group">
                            {/* Visual Timeline Node */}
                            <span
                                className={`absolute -left-3.5 top-1 w-2.5 h-2.5 rounded-full ring-4 transition-transform group-hover:scale-125 ${getNodeColor(
                                    log.action
                                )}`}
                            />

                            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-900">{log.actorName}</span>
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                            {log.actorRole}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-medium">
                                        {new Date(log.createdAt).toLocaleString(undefined, {
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                        className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${getActionBadgeColor(
                                            log.action
                                        )}`}
                                    >
                                        {log.action.replace('_', ' ')}
                                    </span>

                                    {log.fromStatus && log.toStatus && (
                                        <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                                            <span className="font-semibold text-slate-700">{log.fromStatus}</span>
                                            <span>→</span>
                                            <span className="font-semibold text-slate-900">{log.toStatus}</span>
                                        </span>
                                    )}
                                </div>

                                {log.reason && (
                                    <div className="bg-amber-50/80 border border-amber-200/80 rounded-lg p-2.5 text-xs text-amber-950 font-medium leading-relaxed">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block mb-0.5">
                                            Decision Context:
                                        </span>
                                        "{log.reason}"
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
