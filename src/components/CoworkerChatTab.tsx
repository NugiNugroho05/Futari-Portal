import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  Users,
  Megaphone,
} from 'lucide-react';
import {
  StaffMemberRecord,
  ChatMessageItem,
} from '../utils/futariLogic';

interface CoworkerChatTabProps {
  currentUser: StaffMemberRecord;
  staffList?: StaffMemberRecord[];
  messages: ChatMessageItem[];
  onSendMessage: (
    channel: ChatMessageItem['channel'],
    messageText: string,
    isAnnouncement: boolean
  ) => void;
  onSyncToGoogleChat?: (latestMessage: string) => void;
  isDark: boolean;
}

export const CoworkerChatTab: React.FC<CoworkerChatTabProps> = ({
  currentUser,
  staffList = [],
  messages,
  onSendMessage,
  isDark,
}) => {
  const [selectedChannel, setSelectedChannel] = useState<
    'ALL' | ChatMessageItem['channel']
  >('ALL');
  const [draftMessage, setDraftMessage] = useState('');
  const [markAsAnnouncement, setMarkAsAnnouncement] = useState(false);
  const [chatError, setChatError] = useState('');

  const filteredMessages =
    selectedChannel === 'ALL'
      ? messages
      : messages.filter((m) => m.channel === selectedChannel);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draftMessage.trim();
    if (!trimmed) {
      setChatError('Silakan tulis pesan terlebih dahulu sebelum mengirim ke ruang diskusi.');
      return;
    }
    setChatError('');
    const targetChannel: ChatMessageItem['channel'] =
      selectedChannel === 'ALL' ? 'Futari General Chat' : selectedChannel;
    onSendMessage(targetChannel, trimmed, markAsAnnouncement);
    setDraftMessage('');
    setMarkAsAnnouncement(false);
  };

  const surfaceCard = isDark
    ? 'bg-slate-900/60 backdrop-blur-md border border-slate-700/50 shadow-2xl text-slate-100'
    : 'bg-white/70 backdrop-blur-md border border-white/40 shadow-lg text-slate-900';
  const mutedText = isDark ? 'text-slate-300' : 'text-slate-600';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display mt-0.5">
            Futari General Chat
          </h1>
          <p className={`text-xs mt-1 ${mutedText}`}>
            Komunikasi internal real-time antar tim Futari.
          </p>
        </div>
      </div>

      {/* Main Chat Grid: Left Channel & Online Directory + Right Chat Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar: Channels & Active Co-workers */}
        <div className={`lg:col-span-4 p-5 rounded-xl border space-y-5 ${surfaceCard}`}>
          <div>
            <h2 className="text-sm font-bold font-display flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#00B4D8]" />
              <span>Saluran Diskusi Futari</span>
            </h2>
            <div className="mt-3 space-y-1.5">
              {[
                { id: 'ALL', label: 'Semua Pesan (Futari General Chat)' },
                { id: 'Futari General Chat', label: '# futari-general-chat' },
                { id: 'Event Operations & Venue', label: '# event-operations-venue' },
                { id: 'Bandung Creative Hub', label: '# bandung-creative-hub' },
              ].map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() =>
                    setSelectedChannel(ch.id as 'ALL' | ChatMessageItem['channel'])
                  }
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                    selectedChannel === ch.id
                      ? 'bg-[#0277BD] text-white font-semibold'
                      : isDark
                      ? 'hover:bg-slate-800 text-slate-300'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span className="truncate">{ch.label}</span>
                  {ch.id === 'ALL' && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/20">
                      {messages.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {staffList.length > 0 && (
            <div className="pt-4 border-t border-slate-700/30">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#00B4D8]">
                  Anggota Tim
                </h3>
              </div>
              <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                {staffList.map((member) => (
                  <button
                    key={member.staffId}
                    type="button"
                    onClick={() =>
                      setDraftMessage((prev) =>
                        prev ? `${prev} @${member.name} ` : `@${member.name} `
                      )
                    }
                    className={`w-full p-2 rounded-lg text-left transition-colors flex items-center justify-between gap-2 ${
                      isDark ? 'hover:bg-slate-800/70' : 'hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 relative"
                        style={{ backgroundColor: member.avatarColor }}
                      >
                        {member.initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{member.name}</p>
                        <p className={`text-[10px] truncate ${mutedText}`}>
                          {member.role} · {member.branch}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Futari General Chat Room Stream & Composer */}
        <div
          className={`lg:col-span-8 rounded-xl border flex flex-col overflow-hidden ${surfaceCard}`}
        >
          {/* Room Header */}
          <div
            className={`px-5 py-3.5 border-b flex items-center justify-between ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4 text-[#00B4D8]" />
              <div>
                <h2 className="text-sm font-bold font-display">
                  Futari General Chat
                </h2>
                <p className={`text-[11px] ${mutedText}`}>
                  Terhubung sebagai <strong>{currentUser.name}</strong> ({currentUser.role} ·{' '}
                  {currentUser.branch})
                </p>
              </div>
            </div>
          </div>

          {/* Messages Feed */}
          <div
            data-testid="coworker-chat-feed"
            className="p-5 space-y-4 max-h-[460px] overflow-y-auto"
          >
            {filteredMessages.map((msg) => {
              const isMe = msg.staffId === currentUser.staffId;
              return (
                <div
                  key={msg.id}
                  className={`p-4 rounded-xl border transition-colors ${
                    msg.isAnnouncement
                      ? isDark
                        ? 'bg-[#0277BD]/15 border-[#00B4D8]/40'
                        : 'bg-sky-50/90 border-sky-200'
                      : isMe
                      ? isDark
                        ? 'bg-slate-800/90 border-[#00B4D8]/30'
                        : 'bg-sky-50/40 border-slate-200'
                      : isDark
                      ? 'bg-slate-950/60 border-slate-800'
                      : 'bg-slate-50/70 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ backgroundColor: msg.avatarColor }}
                      >
                        {msg.initials}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold">{msg.senderName}</span>
                          <span className={`text-[11px] ${mutedText}`}>
                            {msg.senderRole}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00B4D8]/15 text-[#00B4D8]">
                            {msg.branch}
                          </span>
                          {msg.isAnnouncement && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">
                              <Megaphone className="w-3 h-3" />
                              Pengumuman
                            </span>
                          )}
                        </div>
                        <p className={`text-[10px] font-mono mt-0.5 ${mutedText}`}>
                          {msg.channel} · {msg.timestamp}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs leading-relaxed mt-2.5 whitespace-pre-line">
                    {msg.message}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Message Input Form */}
          <form
            onSubmit={handleSubmit}
            className={`p-4 border-t space-y-3 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="futari-general-chat-input"
                className="text-xs font-semibold text-[#00B4D8]"
              >
                Kirim Pesan sebagai {currentUser.name} ({currentUser.role}):
              </label>

              <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={markAsAnnouncement}
                  onChange={(e) => setMarkAsAnnouncement(e.target.checked)}
                  className="rounded border-slate-600 text-[#00B4D8] focus:ring-[#00B4D8]"
                />
                <span>Tandai sebagai Pengumuman Tim</span>
              </label>
            </div>

            <div className="flex gap-2">
              <input
                id="futari-general-chat-input"
                type="text"
                value={draftMessage}
                onChange={(e) => setDraftMessage(e.target.value)}
                placeholder="Tulis pesan untuk rekan kerja di Futari General Chat..."
                className={`flex-1 px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#00B4D8] ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500'
                    : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                }`}
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#0277BD] to-[#00B4D8] hover:opacity-95 flex items-center gap-1.5 shrink-0 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim Pesan</span>
              </button>
            </div>

            {chatError && (
              <p className="text-xs text-rose-400 font-medium">{chatError}</p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
