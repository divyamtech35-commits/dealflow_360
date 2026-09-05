import React, { useEffect, useState } from 'react';
import client from '../api/client';

export default function AuditTimeline({ quoteId }: { quoteId: string }) {
    const [logs, setLogs] = useState<any[]>([]);

    useEffect(() => {
        client.get(`/quotations/${quoteId}/audit-log`)
            .then(r => setLogs(r.data))
            .catch(e => console.error(e));
    }, [quoteId]);

    return (
        <div className="mt-8 border-t border-white/10 pt-6">
            <h3 className="text-sm uppercase font-bold text-slate-400 mb-6">Audit Trail</h3>
            <div className="space-y-4">
                {logs.map((log: any) => (
                    <div key={log._id} className="flex gap-4 items-start relative pb-4">
                        <div className="absolute left-1.5 top-5 w-px h-full bg-white/10" />
                        <div className="w-3 h-3 rounded-full bg-blue-500 mt-1.5 relative z-10" />
                        <div>
                            <div className="text-sm font-semibold text-white">
                                {log.actorName} <span className="text-slate-500 font-normal">({log.actorRole})</span>
                            </div>
                            <div className="text-sm font-medium text-slate-300 mt-0.5">
                                {log.action.toUpperCase()}
                                {log.fromStatus && log.toStatus && <span className="text-slate-500 text-xs ml-2">{log.fromStatus} → {log.toStatus}</span>}
                            </div>
                            {log.reason && (
                                <div className="text-sm text-amber-200 mt-1 bg-amber-500/10 p-2 rounded">
                                    "{log.reason}"
                                </div>
                            )}
                            <div className="text-xs text-slate-500 mt-1">
                                {new Date(log.createdAt).toLocaleString()}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
