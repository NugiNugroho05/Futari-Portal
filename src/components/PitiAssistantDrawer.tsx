import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Sparkles,
  Send,
  X,
  BrainCircuit,
  Globe,
  ExternalLink,
  Volume2,
} from 'lucide-react';
import {
  StaffMemberRecord,
  AttendanceRecord,
  PettyCashRecord,
  EventBudgetRecord,
  formatIDR,
  PITI_PERSONA_SYSTEM_INSTRUCTION,
  buildPitiSystemInstruction,
} from '../utils/futariLogic';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  modelUsed?: string;
  groundingLinks?: { title: string; uri: string }[];
}

interface PitiAssistantDrawerProps {
  currentUser: StaffMemberRecord;
  staffList: StaffMemberRecord[];
  attendanceLogs: AttendanceRecord[];
  pettyCashList: PettyCashRecord[];
  activeBudget: EventBudgetRecord;
  isDark: boolean;
}

export const PitiAssistantDrawer: React.FC<PitiAssistantDrawerProps> = ({
  currentUser,
  staffList,
  attendanceLogs,
  pettyCashList,
  activeBudget,
  isDark,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [useSearchGrounding, setUseSearchGrounding] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-piti',
      role: 'model',
      text: `Halo ${currentUser.name} (${currentUser.role} - ${currentUser.branch})! Saya **Piti**, asisten virtual cerdas dan ramah untuk portal operasional Futari. Saya siap membantu Anda memantau Live Attendance 22 personel Futari, kalkulasi lembur ketat jam 20:00 (IDR 7.000/jam), maupun laporan Petty Cash event "${activeBudget.eventName}". Ada yang bisa Piti bantu hari ini?`,
      timestamp: 'Baru saja',
      modelUsed: 'gemini-3.8-flash (Live Gemini API)',
    },
  ]);

  const threadEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMessages((prev) => [
      {
        id: 'welcome-piti',
        role: 'model',
        text: `Halo ${currentUser.name} (${currentUser.role} - ${currentUser.branch})! Saya **Piti**, asisten virtual cerdas dan ramah untuk portal operasional Futari (${currentUser.divisionLabel}). Silakan ketik atau ucapkan pertanyaan Anda!`,
        timestamp: 'Baru saja',
        modelUsed: 'gemini-3.8-flash (Live Gemini API)',
      },
      ...prev.slice(1),
    ]);
  }, [currentUser.staffId, activeBudget.eventId]);

  useEffect(() => {
    if (isOpen) {
      threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isThinking]);

  const buildDatabaseContextSummary = () => {
    const wfoUsers = staffList.filter((s) => s.workMode === 'WFO' && !s.isSuspended);
    const wfeUsers = staffList.filter((s) => s.workMode === 'WFE' && !s.isSuspended);
    const lateUsers = staffList.filter((s) => s.lateMinutesMonth > 0);
    const totalSpent = pettyCashList
      .filter((e) => e.eventId === activeBudget.eventId)
      .reduce((sum, e) => sum + e.amount, 0);
    const remainingBudget = activeBudget.approvedBudget - totalSpent;
    const totalOvertimePay = attendanceLogs.reduce((sum, l) => sum + l.overtimePay, 0);

    return [
      `- Pengguna Aktif: ${currentUser.name} (${currentUser.role}, Divisi: ${currentUser.divisionLabel}, Cabang: ${currentUser.branch}, Supervisor: ${currentUser.supervisor || '-'})`,
      `- Total Personel Futari: ${staffList.length} orang`,
      `- Status WFO Aktif (${wfoUsers.length} orang): ${wfoUsers.map((u) => `${u.name} (${u.checkInTime})`).join(', ')}`,
      `- Status WFE Event (${wfeUsers.length} orang): ${wfeUsers.map((u) => `${u.name} (${u.checkInTime})`).join(', ')}`,
      `- Akumulasi Terlambat (> 10:05 WIB): ${lateUsers.map((u) => `${u.name}: ${u.lateMinutesMonth} menit`).join(', ')}`,
      `- Total Kompensasi Lembur (>= 20:00 @ IDR 7.000/jam): ${formatIDR(totalOvertimePay)}`,
      `- Event Aktif: "${activeBudget.eventName}" (${activeBudget.clientName}) | Dana Approval: ${formatIDR(activeBudget.approvedBudget)} | Terpakai: ${formatIDR(totalSpent)} | Sisa: ${formatIDR(remainingBudget)}`,
    ].join('\n');
  };

  const sendPromptToPiti = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || isThinking) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    const contextSummary = buildDatabaseContextSummary();
    const systemInstruction = buildPitiSystemInstruction(
      {
        name: currentUser.name,
        role: currentUser.role,
        division: currentUser.divisionLabel,
        branch: currentUser.branch,
      },
      contextSummary
    );

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          systemInstruction,
          personaPrompt: PITI_PERSONA_SYSTEM_INSTRUCTION,
          history: messages.map((m) => ({ role: m.role, text: m.text })),
          currentUser: {
            name: currentUser.name,
            role: currentUser.role,
            division: currentUser.divisionLabel,
            branch: currentUser.branch,
          },
          contextSummary,
          useSearchGrounding,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const rawReply = String(data.reply || '').trim();
      const modelMsg: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: rawReply || 'Maaf, Piti belum menerima respons teks dari Gemini API.',
        timestamp: new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        modelUsed: data.modelUsed || 'gemini-3.8-flash (Live Gemini API)',
        groundingLinks: Array.isArray(data.groundingLinks) ? data.groundingLinks : [],
      };
      setMessages((prev) => [...prev, modelMsg]);
    } catch (error: any) {
      const errorMsg: ChatMessage = {
        id: `model-err-${Date.now()}`,
        role: 'model',
        text: `Maaf ${currentUser.name}, koneksi ke Gemini API sedang mengalami kendala: ${error?.message || 'Unknown error'}.`,
        timestamp: new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        modelUsed: 'Gemini API Error',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleVoiceSpeechRecognition = () => {
    if (isListeningVoice || isThinking) return;

    const SpeechRecognitionApi =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (SpeechRecognitionApi) {
      try {
        const recognition = new SpeechRecognitionApi();
        recognition.lang = 'id-ID';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          setIsListeningVoice(true);
        };

        recognition.onresult = (event: any) => {
          const transcript = event?.results?.[0]?.[0]?.transcript || '';
          setIsListeningVoice(false);
          if (transcript.trim()) {
            sendPromptToPiti(transcript.trim());
          }
        };

        recognition.onerror = () => {
          setIsListeningVoice(false);
          const defaultVoiceQuery =
            currentUser.division === 'Executive'
              ? 'Halo Piti, tampilkan ringkasan personel yang sedang WFO hari ini dan sisa saldo Petty Cash!'
              : 'Halo Piti, jelaskan aturan lembur jam 20:00 dan status kehadiran saya hari ini.';
          sendPromptToPiti(defaultVoiceQuery);
        };

        recognition.onend = () => {
          setIsListeningVoice(false);
        };

        recognition.start();
        return;
      } catch {
        setIsListeningVoice(false);
      }
    }

    // Direct fallback query sent immediately to real Gemini API if browser lacks microphone hardware
    const defaultVoiceQuery =
      currentUser.division === 'Executive'
        ? 'Halo Piti, tampilkan ringkasan personel yang sedang WFO hari ini dan sisa saldo Petty Cash!'
        : 'Halo Piti, jelaskan aturan lembur jam 20:00 dan status kehadiran saya hari ini.';
    sendPromptToPiti(defaultVoiceQuery);
  };

  return (
    <>
      {/* Persistent Floating Action Button (FAB) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Buka Piti, Asisten Futari"
        data-testid="piti-fab-button"
        className="fixed bottom-20 md:bottom-6 right-5 z-40 flex items-center gap-2.5 px-4 py-3 rounded-full text-white font-semibold text-xs shadow-xl bg-gradient-to-r from-[#0277BD] to-[#00B4D8] hover:opacity-95 transition-transform active:scale-95 border border-white/20"
      >
        <Mic className="w-4 h-4" />
        <Sparkles className="w-4 h-4" />
        <span className="whitespace-nowrap">Tanya Piti AI</span>
      </button>

      {/* Conversational Drawer Modal */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Piti, Asisten Futari Chatbot"
          data-testid="piti-chat-drawer"
          className={`fixed bottom-20 md:bottom-20 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[430px] max-h-[78vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${
            isDark
              ? 'bg-slate-900 border-slate-700 text-slate-100'
              : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Header */}
          <div className="px-4 py-3.5 bg-gradient-to-r from-[#0277BD] to-[#00B4D8] text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight">
                  Piti, Asisten Futari
                </h3>
                <p className="text-[11px] text-white/85">
                  Live Gemini API ({currentUser.name} · {currentUser.role})
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Tutup Piti AI"
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Toolbar: Live Gemini Model & Search Grounding */}
          <div
            className={`px-4 py-2 border-b flex items-center justify-between text-[11px] ${
              isDark
                ? 'bg-slate-950 border-slate-800 text-slate-300'
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            <span className="flex items-center gap-1.5 font-medium text-[#00B4D8]">
              <BrainCircuit className="w-3.5 h-3.5" />
              <span>Gemini Live API · Piti Persona</span>
            </span>
            <button
              type="button"
              onClick={() => setUseSearchGrounding((prev) => !prev)}
              className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1 transition-colors ${
                useSearchGrounding
                  ? 'bg-[#0277BD] text-white'
                  : isDark
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              <Globe className="w-3 h-3" />
              <span>{useSearchGrounding ? 'Google Search: ON' : 'Google Search: OFF'}</span>
            </button>
          </div>

          {/* Quick Role-Aware Prompts */}
          <div
            className={`px-3 py-2 border-b flex items-center gap-1.5 overflow-x-auto ${
              isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50/60'
            }`}
          >
            <button
              type="button"
              data-testid="piti-quick-wfo-btn"
              onClick={() =>
                sendPromptToPiti(
                  'Siapa saja personel Futari yang sedang WFO hari ini dan berapa sisa Petty Cash?'
                )
              }
              className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#00B4D8]/15 text-[#00B4D8] hover:bg-[#00B4D8]/25 whitespace-nowrap shrink-0"
            >
              Data WFO &amp; Petty Cash
            </button>
            <button
              type="button"
              onClick={() =>
                sendPromptToPiti('Siapa personel dengan menit keterlambatan tertinggi bulan ini?')
              }
              className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#00B4D8]/15 text-[#00B4D8] hover:bg-[#00B4D8]/25 whitespace-nowrap shrink-0"
            >
              Rekap Telat &gt; 10:05
            </button>
            <button
              type="button"
              onClick={() =>
                sendPromptToPiti('Jelaskan aturan lembur jam 20:00 IDR 7.000/jam di Futari.')
              }
              className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#00B4D8]/15 text-[#00B4D8] hover:bg-[#00B4D8]/25 whitespace-nowrap shrink-0"
            >
              Aturan Lembur 20:00
            </button>
          </div>

          {/* Messages Thread */}
          <div
            data-testid="piti-messages-thread"
            className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[340px]"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                data-testid={msg.role === 'model' ? 'piti-model-message' : 'piti-user-message'}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-line ${
                    msg.role === 'user'
                      ? 'bg-[#0277BD] text-white'
                      : isDark
                      ? 'bg-slate-800 text-slate-100 border border-slate-700'
                      : 'bg-slate-100 text-slate-900 border border-slate-200'
                  }`}
                >
                  {msg.text.split(/(\*\*.*?\*\*)/g).map((part, idx) =>
                    part.startsWith('**') && part.endsWith('**') ? (
                      <strong key={idx} className="font-bold text-[#00B4D8]">
                        {part.slice(2, -2)}
                      </strong>
                    ) : (
                      <React.Fragment key={idx}>{part}</React.Fragment>
                    )
                  )}

                  {msg.groundingLinks && msg.groundingLinks.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-600/40 space-y-1">
                      <p className="text-[10px] font-semibold text-[#00B4D8]">
                        Sumber Google Search Grounding:
                      </p>
                      {msg.groundingLinks.map((lnk, i) => (
                        <a
                          key={i}
                          href={lnk.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[11px] text-[#00B4D8] hover:underline truncate"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span className="truncate">{lnk.title}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">
                  {msg.role === 'model' ? 'Piti, Asisten Futari' : currentUser.name} ·{' '}
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {/* Listening / Thinking Indicator */}
            {(isThinking || isListeningVoice) && (
              <div
                data-testid="piti-thinking-indicator"
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs border ${
                  isDark
                    ? 'bg-slate-800/90 border-slate-700 text-[#00B4D8]'
                    : 'bg-sky-50 border-sky-200 text-[#0277BD]'
                }`}
              >
                <Volume2 className="w-4 h-4 animate-bounce shrink-0" />
                <span className="font-medium">
                  {isListeningVoice
                    ? 'Mendengarkan perintah suara Anda... (Web Speech API)'
                    : 'Piti sedang menghubungi Gemini API...'}
                </span>
              </div>
            )}
            <div ref={threadEndRef} />
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendPromptToPiti(input);
            }}
            className={`p-3 border-t flex items-center gap-2 ${
              isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'
            }`}
          >
            <button
              type="button"
              onClick={handleVoiceSpeechRecognition}
              aria-label="Perintah Suara Piti"
              title="Perintah Suara (Microphone)"
              data-testid="piti-voice-mic-btn"
              className={`p-2 rounded-lg border transition-colors shrink-0 ${
                isListeningVoice
                  ? 'bg-[#00B4D8] text-white border-[#00B4D8]'
                  : isDark
                  ? 'bg-slate-900 border-slate-700 text-[#00B4D8] hover:bg-slate-800'
                  : 'bg-white border-slate-300 text-[#0277BD] hover:bg-slate-100'
              }`}
            >
              <Mic className="w-4 h-4" />
            </button>
            <input
              type="text"
              data-testid="piti-chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tanya Piti, Asisten Futari..."
              aria-label="Pesan untuk Piti, Asisten Futari"
              className={`flex-1 px-3 py-2 rounded-lg text-xs border focus:outline-none focus:ring-2 focus:ring-[#00B4D8] ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500'
                  : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
              }`}
            />
            <button
              type="submit"
              data-testid="piti-chat-send-btn"
              disabled={!input.trim() || isThinking}
              aria-label="Kirim Pesan ke Piti"
              className="px-3 py-2 rounded-lg bg-[#0277BD] hover:bg-[#00B4D8] text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim</span>
            </button>
          </form>
        </div>
      )}
    </>
  );
};
