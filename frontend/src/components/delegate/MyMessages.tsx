import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, User, ArrowLeft } from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { io } from "socket.io-client";

export default function MyMessages() {
  const { user, token }           = useAuth();
  const qc                        = useQueryClient();
  const [selected, setSelected]   = useState<any>(null);
  const [newMsg,   setNewMsg]      = useState("");
  const messagesEndRef             = useRef<HTMLDivElement>(null);

  const { data: contacts = [] } = useQuery({
    queryKey:       ["contacts"],
    queryFn:        () => api.get("/messages/contacts").then((r) => r.data),
    refetchInterval: 10000,
  });

  const { data: messages = [] } = useQuery({
    queryKey:       ["conversation", selected?.id],
    queryFn:        () => selected
      ? api.get(`/messages/conversation/${selected.id}`).then((r) => r.data)
      : Promise.resolve([]),
    enabled:        !!selected,
    refetchInterval: 5000,
  });

  const sendMsg = useMutation({
    mutationFn: (data: any) => api.post("/messages", data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ["conversation", selected?.id] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["unread-count"] });
      setNewMsg("");
    },
  });

  useEffect(() => {
    if (!token) return;
    const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", { auth: { token } });
    socket.on("new_message", () => {
      qc.invalidateQueries({ queryKey: ["conversation"] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["unread-count"] });
    });
    return () => { socket.disconnect(); };
  }, [token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const ROLE_LABELS: Record<string, string> = {
    SUPER_ADMIN: "Super Admin", ADMIN: "Admin", DELEGATE: "Délégué",
  };

  if (selected) {
    return (
      <div className="flex flex-col h-[calc(100vh-160px)]">
        {/* Header conversation */}
        <div className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm border border-gray-100 mb-3">
          <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 p-1">
            <ArrowLeft size={18} />
          </button>
          <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center">
            <User size={16} className="text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-sm">{selected.firstName} {selected.lastName}</p>
            <p className="text-xs text-gray-400">{ROLE_LABELS[selected.role]}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-3">
          {(messages as any[]).map((m) => {
            const isMe = m.senderId === user?.id;
            return (
              <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm shadow-sm
                  ${isMe ? "bg-blue-600 text-white rounded-br-sm" : "bg-white text-gray-800 rounded-bl-sm border border-gray-100"}`}>
                  <p className="leading-relaxed">{m.content}</p>
                  <p className={`text-xs mt-1 ${isMe ? "text-blue-200" : "text-gray-400"}`}>
                    {new Date(m.createdAt).toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" })}
                    {isMe && <span className="ml-1">{m.isRead ? "✓✓" : "✓"}</span>}
                  </p>
                </div>
              </div>
            );
          })}
          {(messages as any[]).length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">Commencez la conversation...</div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Saisie */}
        <form onSubmit={(e) => { e.preventDefault(); if(newMsg.trim()) sendMsg.mutate({ receiverId: selected.id, content: newMsg }); }}
          className="flex gap-2">
          <input value={newMsg} onChange={(e) => setNewMsg(e.target.value)}
            className="flex-1 border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            placeholder="Écrire un message..." />
          <button type="submit" disabled={!newMsg.trim() || sendMsg.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition disabled:opacity-60">
            <Send size={18} />
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold text-gray-800">Messagerie</h2>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {(contacts as any[]).map((c, i) => (
          <button key={c.id} onClick={() => setSelected(c)}
            className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition flex items-center gap-3 ${i > 0 ? "border-t border-gray-50" : ""}`}>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User size={16} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-gray-800 text-sm">{c.firstName} {c.lastName}</p>
                {c.unread > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {c.unread}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">{ROLE_LABELS[c.role]}</p>
              {c.lastMessage && (
                <p className="text-xs text-gray-400 truncate mt-0.5">{c.lastMessage.content}</p>
              )}
            </div>
          </button>
        ))}
        {(contacts as any[]).length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">Aucun contact disponible</div>
        )}
      </div>
    </div>
  );
}