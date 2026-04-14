import { useState, useEffect, useRef }           from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, MessageCircle, User, Trash2, X }  from "lucide-react";
import api from "../../../services/api";
import { useAuth } from "../../../contexts/AuthContext";
import { io }     from "socket.io-client";

export default function MessagesTab() {
  const { user, token } = useAuth();
  const qc = useQueryClient();
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [newMessage,      setNewMessage]      = useState("");
  const [delMsgId,        setDelMsgId]        = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn:  () => api.get("/messages/contacts").then((r) => r.data),
    refetchInterval: 10000,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["conversation", selectedContact?.id],
    queryFn:  () => selectedContact
      ? api.get(`/messages/conversation/${selectedContact.id}`).then((r) => r.data)
      : Promise.resolve([]),
    enabled:         !!selectedContact,
    refetchInterval: 5000,
  });

  const sendMessage = useMutation({
    mutationFn: (data: any) => api.post("/messages", data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ["conversation", selectedContact?.id] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      setNewMessage("");
    },
  });

  const deleteMessage = useMutation({
    mutationFn: (id: string) => api.delete(`/messages/${id}`),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ["conversation", selectedContact?.id] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      setDelMsgId(null);
    },
  });

  // Socket temps réel
  useEffect(() => {
    if (!token) return;
    const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", {
      auth: { token },
    });
    socket.on("new_message", () => {
      qc.invalidateQueries({ queryKey: ["conversation"] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
    });
    return () => { socket.disconnect(); };
  }, [token]);

  // Scroll vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const ROLE_LABELS: Record<string, string> = {
    SUPER_ADMIN: "Super Admin",
    ADMIN:       "Administrateur",
    DELEGATE:    "Délégué",
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">Messagerie Interne</h2>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex h-[600px]">

        {/* ── Contacts ─────────────────────────────────── */}
        <div className="w-72 border-r border-gray-100 flex flex-col flex-shrink-0">
          <div className="px-4 py-3 bg-slate-800">
            <h3 className="font-semibold text-white text-sm">Contacts</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {(contacts as any[]).map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedContact(c)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition
                  ${selectedContact?.id === c.id ? "bg-blue-50 border-l-2 border-l-blue-500" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      {c.avatar
                        ? <img src={c.avatar} className="w-8 h-8 rounded-full object-cover" alt="" />
                        : <User size={14} className="text-blue-600" />
                      }
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{c.firstName} {c.lastName}</p>
                      <p className="text-xs text-gray-400">{ROLE_LABELS[c.role] || c.role}</p>
                    </div>
                  </div>
                  {c.unread > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {c.unread > 9 ? "9+" : c.unread}
                    </span>
                  )}
                </div>
                {c.lastMessage && (
                  <p className="text-xs text-gray-400 mt-1 truncate pl-10">
                    {c.lastMessage.content}
                  </p>
                )}
              </button>
            ))}
            {(contacts as any[]).length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">Aucun contact</div>
            )}
          </div>
        </div>

        {/* ── Conversation ─────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedContact ? (
            <>
              {/* Header */}
              <div className="px-5 py-3 bg-slate-800 flex items-center gap-3 flex-shrink-0">
                <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center flex-shrink-0">
                  {selectedContact.avatar
                    ? <img src={selectedContact.avatar} className="w-8 h-8 rounded-full object-cover" alt="" />
                    : <User size={14} className="text-white" />
                  }
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">
                    {selectedContact.firstName} {selectedContact.lastName}
                  </p>
                  <p className="text-xs text-slate-400">{ROLE_LABELS[selectedContact.role] || selectedContact.role}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
                {(messages as any[]).map((m) => {
                  const isMe = m.senderId === user?.id;
                  return (
                    <div key={m.id} className={`flex group ${isMe ? "justify-end" : "justify-start"}`}>
                      {/* Bouton supprimer — visible au hover */}
                      {isMe && (
                        <button
                          onClick={() => setDelMsgId(m.id)}
                          className="opacity-0 group-hover:opacity-100 self-center mr-2 p-1 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition"
                          title="Supprimer ce message"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}

                      <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm shadow-sm
                        ${isMe
                          ? "bg-blue-600 text-white rounded-br-sm"
                          : "bg-white text-gray-800 rounded-bl-sm border border-gray-100"
                        }`}
                      >
                        <p className="leading-relaxed break-words">{m.content}</p>
                        <p className={`text-xs mt-1 ${isMe ? "text-blue-200" : "text-gray-400"}`}>
                          {new Date(m.createdAt).toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" })}
                          {isMe && <span className="ml-1">{m.isRead ? "✓✓" : "✓"}</span>}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {(messages as any[]).length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    Commencez la conversation...
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Saisie */}
              <div className="px-4 py-3 bg-white border-t border-gray-100 flex-shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newMessage.trim()) return;
                    sendMessage.mutate({ receiverId: selectedContact.id, content: newMessage.trim() });
                  }}
                  className="flex gap-2"
                >
                  <input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Écrire un message..."
                    maxLength={1000}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sendMessage.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition disabled:opacity-60 flex-shrink-0"
                  >
                    <Send size={18} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <MessageCircle size={48} className="mx-auto mb-3 text-gray-200" />
                <p className="font-medium">Sélectionnez un contact</p>
                <p className="text-sm mt-1">pour démarrer une conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal suppression message */}
      {delMsgId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setDelMsgId(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-600" />
            </div>
            <h3 className="font-bold text-gray-800 text-center mb-2">Supprimer ce message ?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Le message sera supprimé pour tout le monde.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDelMsgId(null)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                Annuler
              </button>
              <button
                onClick={() => deleteMessage.mutate(delMsgId)}
                disabled={deleteMessage.isPending}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-red-700 transition disabled:opacity-60">
                {deleteMessage.isPending ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
