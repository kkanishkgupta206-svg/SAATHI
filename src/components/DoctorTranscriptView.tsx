import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Clock,
  AlertTriangle,
  UserCheck,
  FileText,
  Calendar,
  Lock,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  HeartHandshake
} from 'lucide-react';
import { ChatShareRequest } from '../types';
import { fetchDoctorSharedTranscript } from '../services/psychiatristService';

interface DoctorTranscriptViewProps {
  shareId: string;
  token: string;
  onBackToApp?: () => void;
}

export const DoctorTranscriptView: React.FC<DoctorTranscriptViewProps> = ({
  shareId,
  token,
  onBackToApp,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [request, setRequest] = useState<ChatShareRequest | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadTranscript() {
      setIsLoading(true);
      setError(null);
      const res = await fetchDoctorSharedTranscript(shareId, token);
      if (!isMounted) return;
      if (res.success && res.request) {
        setRequest(res.request);
      } else {
        setError(res.error || 'Unable to access shared transcript.');
      }
      setIsLoading(false);
    }
    loadTranscript();
    return () => {
      isMounted = false;
    };
  }, [shareId, token]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl max-w-md w-full text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 mx-auto flex items-center justify-center animate-pulse">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Verifying Clinical Access Token...</h2>
          <p className="text-xs text-slate-500">Checking patient consent authorization and 7-day link validity.</p>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
          <p className="text-sm text-slate-600 leading-relaxed">{error}</p>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-left">
            <p className="font-semibold text-slate-700 mb-1">Under India DPDP guidelines:</p>
            <p>Clinical transcripts can only be accessed while patient consent is active and with administrative approval within the 7-day validity window.</p>
          </div>
          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Back to Home
            </button>
          )}
        </div>
      </div>
    );
  }

  const expiresDateStr = request.expiresAt ? new Date(request.expiresAt).toLocaleDateString() : 'In 7 days';
  const consentDateStr = new Date(request.userConsentGivenAt).toLocaleString();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans">
      {/* Top Clinical Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-slate-900">Saathi Clinical Portal</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Patient Consented
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Authorized for: <span className="font-semibold text-slate-700">{request.doctorName}</span> ({request.doctorClinic})
              </p>
            </div>
          </div>

          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Transcript Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Consent and Verification Banner */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Patient Case Summary</p>
              <h1 className="text-xl font-bold text-slate-900 mt-0.5">
                {request.userName} {request.userEmail ? `(${request.userEmail})` : ''}
              </h1>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200/80">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Link expires on <strong>{expiresDateStr}</strong></span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-2xl">
              <span className="text-slate-400 block mb-1">Consent Granted:</span>
              <span className="font-semibold text-slate-800">{consentDateStr}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl">
              <span className="text-slate-400 block mb-1">Selected Conversations:</span>
              <span className="font-semibold text-slate-800 capitalize">
                {request.selectedChats.join(', ')}
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl">
              <span className="text-slate-400 block mb-1">Time Scope:</span>
              <span className="font-semibold text-slate-800">
                {request.shareLast7DaysOnly ? 'Last 7 Days Only' : 'Full Exchanged History'}
              </span>
            </div>
          </div>

          <div className="p-3 bg-teal-50/70 border border-teal-200/60 rounded-2xl text-xs text-teal-900 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
            <p>
              <strong>Purpose Limitation:</strong> This transcript was shared exclusively for clinical evaluation and psychiatric consultation with {request.doctorName}. The patient may revoke access at any time.
            </p>
          </div>
        </div>

        {/* Transcripts Sections */}
        {(!request.transcripts || request.transcripts.length === 0) ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center text-slate-400 space-y-2">
            <FileText className="w-10 h-10 mx-auto text-slate-300" />
            <h3 className="font-bold text-slate-700">No Messages Shared</h3>
            <p className="text-xs">The patient has not exchanged messages with the selected companion profiles yet.</p>
          </div>
        ) : (
          request.transcripts.map((sec, idx) => (
            <div key={idx} className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="bg-slate-50 px-5 py-3 border-b border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs">
                    {sec.avatarName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{sec.avatarName} Chat Transcript</h3>
                    <p className="text-[11px] text-slate-500">{sec.messages.length} messages in this thread</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold bg-white border border-slate-200 text-slate-600 px-2.5 py-1 rounded-full">
                  Read Only
                </span>
              </div>

              <div className="p-4 sm:p-5 space-y-3 max-h-[500px] overflow-y-auto">
                {sec.messages.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No recorded messages for this companion.</p>
                ) : (
                  sec.messages.map((m, mIdx) => {
                    const isUser = m.role === 'user';
                    return (
                      <div
                        key={m.id || mIdx}
                        className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                      >
                        <div className="text-[10px] text-slate-400 mb-1 px-1">
                          <span className="font-bold text-slate-600">
                            {isUser ? request.userName : sec.avatarName}
                          </span>
                          {' • '}
                          <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div
                          className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                            isUser
                              ? 'bg-teal-700 text-white rounded-tr-xs shadow-xs'
                              : 'bg-slate-100 text-slate-800 rounded-tl-xs border border-slate-200/60'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{m.text}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))
        )}

        {/* Clinical Disclaimer Notice */}
        <div className="p-4 rounded-2xl bg-slate-200/70 border border-slate-300 text-slate-600 text-xs space-y-1">
          <p className="font-semibold text-slate-800">
            Clinical Disclaimer for Medical Practitioners:
          </p>
          <p>
            Saathi and its avatar companions are non-clinical emotional listening tools, not diagnostic or therapeutic software. Transcripts reflect the patient's conversational interactions and do not constitute psychometric scores or clinical assessments.
          </p>
        </div>
      </main>
    </div>
  );
};
