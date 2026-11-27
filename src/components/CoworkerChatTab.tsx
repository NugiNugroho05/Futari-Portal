import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  Users,
  Megaphone,
  ChevronDown,
} from 'lucide-react';
import {
  StaffMemberRecord,
  ChatMessageItem,
  formatBranchDisplay,
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

const CHAT_CHANNELS: Array<{
  id: 'ALL' | ChatMessageItem['channel'];
  label: string;
  shortLabel: string;
}> = [
  { id: 'ALL', label: 'Semua Pesan (Futari General Chat)', shortLabel: 'Semua' },
  { id: 'Futari General Chat', label: '# futari-general-chat', shortLabel: '#general' },
  { id: 'Event Operations & Venue', label: '# event-operations-venue', shortLabel: '#event-ops' },
  { id: 'Jawa Creative Hub', label: '# jawa-creative-hub', shortLabel: '#jawa-hub' },
];

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
  const [isMobileMembersOpen, setIsMobileMembersOpen] = useState(false);

  const filteredMessages =
    selectedChannel === 'ALL'
      ? messages
      : selectedChannel === 'Jawa Creative Hub'
      ? messages.filter(
          (m) =>
            m.channel === 'Jawa Creative Hub' ||
            m.channel === 'Bandung Creative Hub'
        )
      : messages.filter((m) => m.channel === selectedChannel);

  const formatChannelLabel = (ch: string) =>
    ch === 'Bandung Creative Hub' ? 'Jawa Creative Hub' : ch;

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
    <div className="space-y-3 md:space-y-6">
      {/* Header */}
      <div className="flex flex-row items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold font-display mt-0.5 truncate">
            Futari General Chat
          </h1>
          <p className={`text-[11px] md:text-xs mt-0.5 md:mt-1 truncate ${mutedText}`}>
            Komunikasi internal real-time antar tim Futari.
          </p>
        </div>

        {/* Mobile Compact Collapsible Team Members Mention Drawer Trigger */}
        {staffList.length > 0 && (
          <button
            type="button"
            data-testid="mobile-chat-members-toggle"
            onClick={() => setIsMobileMembersOpen((prev) => !prev)}
            className={`lg:hidden px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border flex items-center gap-1.5 shrink-0 cursor-pointer ${
              isMobileMembersOpen
                ? 'bg-[#0277BD] text-white border-[#00B4D8]'
                : isDark
                ? 'bg-slate-900 border-slate-700 text-slate-200'
                : 'bg-white border-slate-300 text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-[#00B4D8]" />
            <span>Tim ({staffList.length})</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${
                isMobileMembersOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        )}
      </div>

      {/* Mobile Compact Horizontal Channel Pill Bar + Optional Collapsible Mention Strip (< lg) */}
      <div className="lg:hidden space-y-2">
        <div
          data-testid="mobile-chat-channel-pills"
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-nowrap pb-0.5"
        >
          {CHAT_CHANNELS.map((ch) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => setSelectedChannel(ch.id)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors shrink-0 whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                selectedChannel === ch.id
                  ? 'bg-[#0277BD] text-white border-[#00B4D8] shadow-sm'
                  : isDark
                  ? 'bg-slate-900/80 border-slate-800 text-slate-300'
                  : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              <span>{ch.shortLabel}</span>
              {ch.id === 'ALL' && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-black/20">
                  {messages.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {isMobileMembersOpen && staffList.length > 0 && (
          <div
            data-testid="mobile-chat-members-drawer"
            className={`p-2.5 rounded-xl border ${surfaceCard}`}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#00B4D8] mb-2">
              Tap untuk mention (@) anggota tim:
            </p>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-nowrap pb-0.5">
              {staffList.map((member) => (
                <button
                  key={member.staffId}
                  type="button"
                  onClick={() => {
                    setDraftMessage((prev) =>
                      prev ? `${prev} @${member.name} ` : `@${member.name} `
                    );
                    setIsMobileMembersOpen(false);
                  }}
                  className={`px-2.5 py-1.5 rounded-full border text-[11px] font-semibold flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
                    isDark
                      ? 'bg-slate-950 border-slate-800 text-slate-200'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                    style={{ backgroundColor: member.avatarColor }}
                  >
                    {member.initials}
                  </span>
                  <span>{member.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Chat Grid: Left Channel & Online Directory (Desktop >= lg) + Right Chat Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-start">
        {/* Desktop Left Sidebar: Channels & Active Co-workers */}
        <div className={`hidden lg:block lg:col-span-4 p-5 rounded-xl border space-y-5 ${surfaceCard}`}>
          <div>
            <h2 className="text-sm font-bold font-display flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#00B4D8]" />
              <span>Saluran Diskusi Futari</span>
            </h2>
            <div className="mt-3 space-y-1.5">
              {CHAT_CHANNELS.map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setSelectedChannel(ch.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
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
                    className={`w-full p-2 rounded-lg text-left transition-colors flex items-center justify-between gap-2 cursor-pointer ${
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
                          {member.role} · {formatBranchDisplay(member.branch)}
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
            className={`px-3.5 md:px-5 py-2.5 md:py-3.5 border-b flex items-center justify-between ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2 md:gap-2.5 min-w-0">
              <Users className="w-4 h-4 text-[#00B4D8] shrink-0" />
              <div className="min-w-0">
                <h2 className="text-xs md:text-sm font-bold font-display truncate">
                  {selectedChannel === 'ALL'
                    ? 'Futari General Chat'
                    : formatChannelLabel(selectedChannel)}
                </h2>
                <p className={`text-[10px] md:text-[11px] truncate ${mutedText}`}>
                  <strong>{currentUser.name}</strong> ({currentUser.role} ·{' '}
                  {formatBranchDisplay(currentUser.branch)})
                </p>
              </div>
            </div>
          </div>

          {/* Messages Feed */}
          <div
            data-testid="coworker-chat-feed"
            className="p-3 md:p-5 space-y-2.5 md:space-y-4 min-h-[280px] max-h-[55vh] md:max-h-[460px] overflow-y-auto"
          >
            {filteredMessages.map((msg) => {
              const isMe = msg.staffId === currentUser.staffId;
              return (
                <div
                  key={msg.id}
                  className={`p-3 md:p-4 rounded-xl border transition-colors ${
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
                  <div className="flex items-start justify-between gap-2 md:gap-3">
                    <div className="flex items-center gap-2 md:gap-2.5 min-w-0">
                      <div
                        className="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-[11px] md:text-xs font-bold text-white shrink-0"
                        style={{ backgroundColor: msg.avatarColor }}
                      >
                        {msg.initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                          <span className="text-xs font-bold">{msg.senderName}</span>
                          <span className={`text-[10px] md:text-[11px] ${mutedText}`}>
                            {msg.senderRole}
                          </span>
                          <span className="text-[9px] md:text-[10px] font-mono px-1.5 md:px-2 py-0.5 rounded bg-[#00B4D8]/15 text-[#00B4D8]">
                            {formatBranchDisplay(msg.branch)}
                          </span>
                          {msg.isAnnouncement && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">
                              <Megaphone className="w-3 h-3" />
                              Pengumuman
                            </span>
                          )}
                        </div>
                        <p className={`text-[10px] font-mono mt-0.5 truncate ${mutedText}`}>
                          {formatChannelLabel(msg.channel)} · {msg.timestamp}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs leading-relaxed mt-2 md:mt-2.5 whitespace-pre-line break-words">
                    {msg.message}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Message Input Form */}
          <form
            onSubmit={handleSubmit}
            className={`p-3 md:p-4 border-t space-y-2 md:space-y-3 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="futari-general-chat-input"
                className="text-[11px] md:text-xs font-semibold text-[#00B4D8] truncate"
              >
                Pesan sebagai {currentUser.name}:
              </label>

              <label className="inline-flex items-center gap-1.5 text-[11px] md:text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={markAsAnnouncement}
                  onChange={(e) => setMarkAsAnnouncement(e.target.checked)}
                  className="rounded border-slate-600 text-[#00B4D8] focus:ring-[#00B4D8]"
                />
                <span>Pengumuman Tim</span>
              </label>
            </div>

            <div className="flex gap-2">
              <input
                id="futari-general-chat-input"
                type="text"
                value={draftMessage}
                onChange={(e) => setDraftMessage(e.target.value)}
                placeholder="Tulis pesan..."
                className={`flex-1 min-w-0 px-3 md:px-3.5 py-2 md:py-2.5 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#00B4D8] ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500'
                    : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                }`}
              />
              <button
                type="submit"
                className="px-3.5 md:px-4 py-2 md:py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#0277BD] to-[#00B4D8] hover:opacity-95 flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Kirim Pesan</span>
                <span className="sm:hidden">Kirim</span>
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
