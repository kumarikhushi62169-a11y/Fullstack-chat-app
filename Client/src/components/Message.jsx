import { Check, CheckCheck } from "lucide-react";

export default function Message({ msg }) {
  const isMe = msg.sender === "me";

  return (
    <div
      className={`flex mb-4 ${
        isMe ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`max-w-[70%] px-4 py-3 rounded-2xl shadow-md ${
          isMe
            ? "bg-green-600 text-white rounded-br-sm"
            : "bg-slate-800 text-white rounded-bl-sm"
        }`}
      >
        {/* Message */}
        <p className="text-sm break-words ">
          {msg.text}
        </p>

        {/* Time + Status */}
        <div className="flex items-center justify-end gap-1 mt-2">
          <span className="text-[10px] opacity-70">
            {msg.time}
          </span>

          {isMe && (
            <span className="opacity-80">
              {msg.seen ? (
                <CheckCheck size={14} />
              ) : (
                <Check size={14} />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}