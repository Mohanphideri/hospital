// Split out of ../Section.jsx (see that file's renderTicket usage) to keep Section.jsx a manageable size. All state lives in Section.jsx; this file receives everything it
// needs explicitly via the deps object rather than closing over outer state, so it can
// be reasoned about (and tested) on its own.


export function renderTicketThreadImpl(query, { user }) {
  const messages = query.messages && query.messages.length > 0 ? query.messages : [{
    _id: `${query._id}-legacy-message`,
    text: query.message,
    senderModel: "Patient",
    senderName: query.patientId?.name || query.patientId?.phone || "Patient",
    senderRole: "patient",
    createdAt: query.createdAt
  }, ...(query.reply ? [{
    _id: `${query._id}-legacy-reply`,
    text: query.reply,
    senderModel: "User",
    senderName: query.repliedBy?.name || "Hospital",
    senderRole: query.repliedBy?.role || "staff",
    createdAt: query.repliedAt
  }] : [])];
  return <div className="mt-3 space-y-3">
        {messages.map(msg => {
      const isPatient = msg.senderModel === "Patient";
      const isMe = (msg.sender?._id || msg.sender) === user?._id || (msg.sender?._id || msg.sender) === user?.id;
      return <div key={msg._id || `${msg.senderModel}-${msg.createdAt}`} className={`rounded-xl p-4 text-sm leading-relaxed ${isPatient ? "bg-mist text-ink" : "bg-navy text-white"} ${isMe ? "ring-2 ring-crimson/30" : ""}`}>
              <div className={`flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wide ${isPatient ? "text-slate-soft/80" : "text-white/70"}`}>
                <span>
                  {isPatient ? "Patient" : msg.senderName || "Hospital"}
                  {!isPatient && msg.senderRole ? ` · ${msg.senderRole}` : ""}
                </span>
                {msg.createdAt && <span className="font-normal normal-case">
                    {new Date(msg.createdAt).toLocaleString([], {
              dateStyle: "medium",
              timeStyle: "short"
            })}
                  </span>}
              </div>
              <div className="mt-1.5">{msg.text}</div>
            </div>;
    })}
      </div>;
}
