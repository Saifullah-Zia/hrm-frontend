"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import {
  chatApi,
  ConversationDTO,
  ChatMessageDTO,
  EmployeeSearchDTO,
  MemberDTO,
} from "@/services/chatApi";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import {
  MessageSquare,
  Search,
  Send,
  Plus,
  Users,
  ChevronLeft,
  Paperclip,
  Image as ImageIcon,
  Check,
  CheckCheck,
  User,
  X,
  MoreVertical,
} from "lucide-react";

export default function ChatPage() {
  const { user } = useAuthStore();
  const token = user?.token;
  const currentEmail = user?.email;
  const currentName = user?.username || "Me";

  // State
  const [conversations, setConversations] = useState<ConversationDTO[]>([]);
  const [activeConv, setActiveConv] = useState<ConversationDTO | null>(null);
  const [messages, setMessages] = useState<ChatMessageDTO[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<EmployeeSearchDTO[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  
  // Group creation state
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedEmployeesForGroup, setSelectedEmployeesForGroup] = useState<number[]>([]);

  // Add Member state
  const [showAddMember, setShowAddMember] = useState(false);
  const [addMemberQuery, setAddMemberQuery] = useState("");
  const [addMemberResults, setAddMemberResults] = useState<EmployeeSearchDTO[]>([]);

  // Real-time states
  const [typingUsers, setTypingUsers] = useState<{ [key: string]: boolean }>({});
  const [presenceMap, setPresenceMap] = useState<{ [key: string]: string }>({});

  // Refs for WebSockets and scroll behavior
  const stompClientRef = useRef<Client | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const activeConvRef = useRef<ConversationDTO | null>(null);

  // Sync activeConv state to a ref so WebSocket callbacks can always access the freshest selection
  useEffect(() => {
    activeConvRef.current = activeConv;
  }, [activeConv]);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, typingUsers]);

  // Load conversations initially
  const loadConversations = async () => {
    try {
      const data = await chatApi.getMyConversations();
      // For each conversation, initialize status presence if possible
      const newPresence: { [key: string]: string } = {};
      data.forEach((c) => {
        c.members.forEach((m) => {
          if (m.email !== currentEmail && m.presenceStatus) {
            newPresence[m.email] = m.presenceStatus;
          }
        });
      });
      setPresenceMap((prev) => ({ ...prev, ...newPresence }));
      setConversations(data);

      if (typeof window !== "undefined") {
        const totalUnread = data.reduce((acc, conv) => acc + (conv.unreadCount ?? 0), 0);
        window.dispatchEvent(new CustomEvent("unread-chat-count-changed", { detail: totalUnread }));
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  // WebSockets Setup
  useEffect(() => {
    if (!token) return;

    const socketUrl = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/ws-chat`;
    const stompClient = new Client({
      webSocketFactory: () => new SockJS(socketUrl),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: (str) => {
        // Safe logging
      },
    });

    stompClient.onConnect = () => {
      // Connect/presence broadcast
      stompClient.publish({
        destination: "/app/presence",
        body: JSON.stringify({ status: "online" }),
      });

      // Subscribe to global presence channel
      stompClient.subscribe("/topic/presence", (message) => {
        try {
          const event = JSON.parse(message.body);
          if (event.employeeId) {
            setPresenceMap((prev) => ({
              ...prev,
              [event.employeeId]: event.status,
            }));
          }
        } catch (e) {
          console.error("Presence parse error", e);
        }
      });

      // Subscribe to personal notification channel
      stompClient.subscribe(`/user/queue/notifications`, (message) => {
        try {
          const notification = JSON.parse(message.body);
          // Reload list to update unread counts or last messages
          loadConversations();
        } catch (e) {
          console.error("Notification parse error", e);
        }
      });

      // If there is an active conversation, subscribe immediately upon reconnect
      if (activeConvRef.current) {
        subscribeToConversation(activeConvRef.current.id, stompClient);
      }
    };

    stompClient.activate();
    stompClientRef.current = stompClient;

    return () => {
      if (stompClient.connected) {
        stompClient.publish({
          destination: "/app/presence",
          body: JSON.stringify({ status: "offline" }),
        });
      }
      stompClient.deactivate();
    };
  }, [token]);

  // Subscription manager for active conversation
  const activeSubscriptions = useRef<any[]>([]);

  const subscribeToConversation = (conversationId: string, client: Client) => {
    // Unsubscribe from previous subscriptions
    activeSubscriptions.current.forEach((sub) => sub.unsubscribe());
    activeSubscriptions.current = [];

    if (!client.connected) return;

    // 1. Subscribe to new messages
    const msgSub = client.subscribe(`/topic/conversation/${conversationId}`, (message) => {
      try {
        const newMsg: ChatMessageDTO = JSON.parse(message.body);
        
        // Append message
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });

        // Mark read if it's currently focused and sender isn't me
        if (activeConvRef.current?.id === conversationId && newMsg.senderEmail !== currentEmail) {
          client.publish({
            destination: `/app/chat.read/${conversationId}`,
          });
        }

        // Refresh conversation sidebar
        loadConversations();
      } catch (e) {
        console.error("Message parse error", e);
      }
    });
    activeSubscriptions.current.push(msgSub);

    // 2. Subscribe to typing indicator
    const typingSub = client.subscribe(`/topic/typing/${conversationId}`, (message) => {
      try {
        const event = JSON.parse(message.body);
        if (event.employeeName && event.employeeName !== currentEmail) {
          setTypingUsers((prev) => ({ ...prev, [event.employeeName]: event.isTyping }));

          // Clear previous timeout for this user
          if (typingTimeoutRef.current[event.employeeName]) {
            clearTimeout(typingTimeoutRef.current[event.employeeName]);
          }

          // Auto-expire typing status in 3 seconds
          if (event.isTyping) {
            typingTimeoutRef.current[event.employeeName] = setTimeout(() => {
              setTypingUsers((prev) => ({ ...prev, [event.employeeName]: false }));
            }, 3000);
          }
        }
      } catch (e) {
        console.error("Typing indicator error", e);
      }
    });
    activeSubscriptions.current.push(typingSub);

    // 3. Subscribe to read receipts
    const readSub = client.subscribe(`/topic/read/${conversationId}`, (message) => {
      try {
        const event = JSON.parse(message.body);
        if (event.reader && event.reader !== currentEmail) {
          setMessages((prev) =>
            prev.map((msg) => (msg.senderEmail === currentEmail ? { ...msg, isRead: true } : msg))
          );
        }
      } catch (e) {
        console.error("Read receipt error", e);
      }
    });
    activeSubscriptions.current.push(readSub);

    // Mark as read immediately on entry
    client.publish({
      destination: `/app/chat.read/${conversationId}`,
    });
  };

  // Change Active Conversation
  const selectConversation = async (conv: ConversationDTO) => {
    setActiveConv(conv);
    setMessages([]);
    setTypingUsers({});

    try {
      const history = await chatApi.getMessages(conv.id, 0, 50);
      // Backend returns desc, let's reverse to show oldest first in UI
      setMessages([...history.content].reverse());

      if (stompClientRef.current) {
        subscribeToConversation(conv.id, stompClientRef.current);
      }

      // Clear local unread count
      setConversations((prev) => {
        const updated = prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c));
        if (typeof window !== "undefined") {
          const totalUnread = updated.reduce((acc, c) => acc + (c.unreadCount ?? 0), 0);
          window.dispatchEvent(new CustomEvent("unread-chat-count-changed", { detail: totalUnread }));
        }
        return updated;
      });
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  };

  // Send Chat Message
  const handleSendMessage = () => {
    if (!inputText.trim() || !activeConv || !stompClientRef.current?.connected) return;

    const payload = {
      content: inputText,
      messageType: "TEXT",
    };

    stompClientRef.current.publish({
      destination: `/app/chat.send/${activeConv.id}`,
      body: JSON.stringify(payload),
    });

    setInputText("");

    // Notify typing is stopped
    stompClientRef.current.publish({
      destination: `/app/chat.typing/${activeConv.id}`,
      body: JSON.stringify({ isTyping: false }),
    });
  };

  // Typing trigger
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    if (activeConv && stompClientRef.current?.connected) {
      stompClientRef.current.publish({
        destination: `/app/chat.typing/${activeConv.id}`,
        body: JSON.stringify({ isTyping: e.target.value.length > 0 }),
      });
    }
  };

  // Search Employees to start chat
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const data = await chatApi.searchEmployees(searchQuery);
        setSearchResults(data);
      } catch (err) {
        console.error("Search query failed:", err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search Employees for Add Member modal
  useEffect(() => {
    if (!addMemberQuery.trim()) {
      setAddMemberResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const data = await chatApi.searchEmployees(addMemberQuery);
        // Exclude people who are already members
        const currentMemberIds = activeConv?.members.map((m) => m.id) || [];
        setAddMemberResults(data.filter((emp) => !currentMemberIds.includes(emp.id)));
      } catch (err) {
        console.error("Add member search failed:", err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [addMemberQuery, activeConv]);

  // Start private chat
  const handleStartPrivateChat = async (employee: EmployeeSearchDTO) => {
    try {
      const newConv = await chatApi.startPrivateChat(employee.id);
      await loadConversations();
      await selectConversation(newConv);
      setShowSearch(false);
      setSearchQuery("");
    } catch (err) {
      console.error("Failed to start private chat:", err);
    }
  };

  // Start group chat
  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedEmployeesForGroup.length === 0) return;
    try {
      const newGroup = await chatApi.createGroupChat(groupName, selectedEmployeesForGroup);
      await loadConversations();
      await selectConversation(newGroup);
      setShowCreateGroup(false);
      setGroupName("");
      setSelectedEmployeesForGroup([]);
    } catch (err) {
      console.error("Failed to create group:", err);
    }
  };

  // Toggle group member selection
  const toggleGroupMemberSelection = (id: number) => {
    setSelectedEmployeesForGroup((prev) =>
      prev.includes(id) ? prev.filter((mid) => mid !== id) : [...prev, id]
    );
  };

  // Add member to existing group
  const handleAddMemberToGroup = async (employee: EmployeeSearchDTO) => {
    if (!activeConv) return;
    try {
      await chatApi.addMember(activeConv.id, employee.id);
      
      // Reload active conversation details
      const freshConversations = await chatApi.getMyConversations();
      setConversations(freshConversations);
      const updatedConv = freshConversations.find((c) => c.id === activeConv.id);
      if (updatedConv) {
        setActiveConv(updatedConv);
      }
      setShowAddMember(false);
      setAddMemberQuery("");
    } catch (err) {
      console.error("Failed to add member:", err);
    }
  };

  // Remove member from group
  const handleRemoveMember = async (memberId: number) => {
    if (!activeConv) return;
    if (!confirm("Are you sure you want to remove this member?")) return;
    try {
      await chatApi.removeMember(activeConv.id, memberId);
      
      // Reload details
      const freshConversations = await chatApi.getMyConversations();
      setConversations(freshConversations);
      const updatedConv = freshConversations.find((c) => c.id === activeConv.id);
      if (updatedConv) {
        setActiveConv(updatedConv);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove member");
    }
  };

  // Helper to resolve display name of conversation
  const getConversationName = (conv: ConversationDTO) => {
    if (conv.type === "GROUP") return conv.name || "Group Chat";
    const other = conv.members.find((m) => m.email !== currentEmail);
    return other?.fullName || "Private Chat";
  };

  const getConversationPresence = (conv: ConversationDTO) => {
    if (conv.type === "GROUP") return undefined;
    const other = conv.members.find((m) => m.email !== currentEmail);
    return other ? presenceMap[other.email] || "offline" : "offline";
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] bg-[#11131c] rounded-2xl overflow-hidden border border-white/[0.05] shadow-2xl relative">
      
      {/* ── SIDEBAR pane (Conversations list) ── */}
      <div
        className={`w-full md:w-80 flex flex-col border-r border-white/[0.05] bg-[#141724] ${
          activeConv ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/[0.05] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-white text-lg font-bold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-400" />
              Team Chat
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowCreateGroup(true)}
                title="New Group Chat"
                className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/[0.05] border border-transparent hover:border-white/10 transition-all"
              >
                <Users className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowSearch(true)}
                title="Search employees to chat"
                className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/[0.05] border border-transparent hover:border-white/10 transition-all bg-indigo-500/10 text-indigo-300"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center px-4">
              <p className="text-white/30 text-sm">No chats yet.</p>
              <button
                onClick={() => setShowSearch(true)}
                className="mt-3 px-4 py-2 bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/20 text-indigo-300 rounded-xl text-xs font-semibold transition"
              >
                Find Coworkers
              </button>
            </div>
          ) : (
            conversations.map((conv) => {
              const name = getConversationName(conv);
              const presence = getConversationPresence(conv);
              const lastMsg = conv.lastMessage;
              const isSelected = activeConv?.id === conv.id;
              const unread = conv.unreadCount ?? 0;

              return (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition text-left group border ${
                    isSelected
                      ? "bg-indigo-600/15 border-indigo-500/30 text-white"
                      : "border-transparent text-white/60 hover:bg-white/[0.03] hover:text-white"
                  }`}
                >
                  {/* Avatar / Presence badge */}
                  <div className="relative flex-shrink-0">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-inner ${
                        conv.type === "GROUP"
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                          : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                      }`}
                    >
                      {conv.type === "GROUP" ? (
                        <Users className="w-4 h-4" />
                      ) : (
                        name[0]?.toUpperCase() ?? "?"
                      )}
                    </div>

                    {conv.type === "PRIVATE" && presence === "online" && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#141724] ring-1 ring-emerald-400 animate-pulse" />
                    )}
                  </div>

                  {/* Conv Name & Last Msg */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm truncate group-hover:text-white">
                        {name}
                      </span>
                      {lastMsg && (
                        <span className="text-[10px] text-white/30">
                          {new Date(lastMsg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/40 truncate mt-0.5">
                      {lastMsg ? (
                        <>
                          <span className="font-medium text-white/50">{lastMsg.senderName}: </span>
                          {lastMsg.content}
                        </>
                      ) : (
                        "No messages yet"
                      )}
                    </p>
                  </div>

                  {/* Unread badge */}
                  {unread > 0 && (
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-500 text-white font-extrabold text-[10px] flex items-center justify-center shadow-lg shadow-indigo-500/20">
                      {unread}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── ACTIVE CHAT WINDOW pane ── */}
      <div className={`flex-1 flex flex-col bg-[#11131c] ${activeConv ? "flex" : "hidden md:flex"}`}>
        {activeConv ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-white/[0.05] bg-[#141724] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveConv(null)}
                  className="md:hidden p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/[0.05]"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="relative">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border ${
                      activeConv.type === "GROUP"
                        ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                        : "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                    }`}
                  >
                    {activeConv.type === "GROUP" ? (
                      <Users className="w-4 h-4" />
                    ) : (
                      getConversationName(activeConv)[0]?.toUpperCase() ?? "?"
                    )}
                  </div>
                  {activeConv.type === "PRIVATE" &&
                    getConversationPresence(activeConv) === "online" && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#141724]" />
                    )}
                </div>

                <div>
                  <h3 className="text-white text-sm font-bold leading-tight">
                    {getConversationName(activeConv)}
                  </h3>
                  <p className="text-[10px] text-white/40 mt-0.5">
                    {activeConv.type === "GROUP"
                      ? `${activeConv.members.length} members`
                      : getConversationPresence(activeConv) === "online"
                      ? "Online"
                      : "Offline"}
                  </p>
                </div>
              </div>

              {/* Group Chat Controls */}
              {activeConv.type === "GROUP" && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAddMember(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-semibold rounded-xl border border-indigo-500/25 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Member
                  </button>
                  
                  {/* Member dropdown trigger list */}
                  <div className="relative group">
                    <button className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/[0.05] border border-transparent">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    <div className="absolute right-0 top-10 w-56 bg-[#161925] border border-white/[0.08] rounded-xl shadow-xl p-2 hidden group-hover:block z-55">
                      <p className="px-3 py-1.5 text-[10px] font-bold text-white/40 uppercase tracking-wider border-b border-white/[0.05]">
                        Group Members
                      </p>
                      <div className="max-h-48 overflow-y-auto mt-1 space-y-1">
                        {activeConv.members.map((m) => (
                          <div key={m.id} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/[0.02]">
                            <span className="text-xs text-white/80 truncate max-w-[120px]">
                              {m.fullName}
                            </span>
                            {m.email !== currentEmail && (
                              <button
                                onClick={() => handleRemoveMember(m.id)}
                                className="text-[10px] text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-1.5 py-0.5 rounded"
                              >
                                Kick
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0b141a]">
              {messages.map((msg, index) => {
                const isMe = !!(msg.senderEmail && currentEmail && msg.senderEmail === currentEmail) || 
                             !!(msg.senderName && currentName && msg.senderName.trim().toLowerCase() === currentName.trim().toLowerCase());
                return (
                  <div key={msg.id || index} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`flex flex-col max-w-[70%] ${isMe ? "items-end" : "items-start"}`}>
                      {/* Sender label */}
                      {!isMe && activeConv.type === "GROUP" && (
                        <span className="text-[10px] text-indigo-400 font-bold mb-1 ml-2">
                          {msg.senderName}
                        </span>
                      )}

                      {/* Bubble */}
                      <div
                        className={`p-3 pb-4 rounded-2xl text-sm leading-relaxed shadow-lg relative min-w-[75px] ${
                          isMe
                            ? "bg-[#005c4b] text-[#e9edef] rounded-tr-none shadow-black/20"
                            : "bg-[#202c33] text-[#e9edef] rounded-tl-none shadow-black/20"
                        }`}
                      >
                        <div className="pr-12 whitespace-pre-wrap break-words">{msg.content}</div>
                        <div className="absolute bottom-1 right-2 flex items-center gap-1 select-none">
                          <span className="text-[9px] text-[#8696a0]">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {isMe && (
                            <span>
                              {msg.isRead ? (
                                <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-[#8696a0]" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {Object.keys(typingUsers).map(
                (typingName) =>
                  typingUsers[typingName] && (
                    <div key={typingName} className="flex justify-start">
                      <div className="bg-[#181a26] border border-white/[0.02] text-white/50 text-xs px-3 py-2 rounded-2xl rounded-tl-none flex items-center gap-2">
                        <span className="font-bold text-indigo-400">{typingName}</span>
                        <span>is writing</span>
                        <span className="flex gap-0.5 items-center">
                          <span className="w-1 h-1 bg-white/40 rounded-full animate-bounce" />
                          <span className="w-1 h-1 bg-white/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                          <span className="w-1 h-1 bg-white/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                        </span>
                      </div>
                    </div>
                  )
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t border-white/[0.05] bg-[#141724] flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Type your message..."
                className="flex-1 bg-[#1c1f2e] border border-white/[0.05] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 transition"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim()}
                className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition shadow-lg shadow-indigo-600/20"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-[#0e1017]">
            <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mb-4 shadow-2xl shadow-indigo-500/10">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="text-white text-lg font-bold">Your Workspace Chat</h3>
            <p className="text-white/40 text-sm max-w-sm mt-2">
              Connect in real-time with your team members. Select a chat from the sidebar or find colleagues to start.
            </p>
          </div>
        )}
      </div>

      {/* ── MODAL: START CHAT ── */}
      {showSearch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-[#161825] border border-white/[0.08] rounded-2xl w-full max-w-md p-5 flex flex-col shadow-2xl relative">
            <button
              onClick={() => {
                setShowSearch(false);
                setSearchQuery("");
              }}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.05]"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-white text-md font-bold flex items-center gap-2 mb-4">
              <Plus className="w-5 h-5 text-indigo-400" />
              New Conversation
            </h3>

            <div className="relative">
              <input
                type="text"
                placeholder="Search coworker by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1e2133] border border-white/[0.05] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50"
              />
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-white/30" />
            </div>

            {/* Results list */}
            <div className="flex-1 overflow-y-auto max-h-60 mt-4 space-y-1">
              {searchResults.length > 0 ? (
                searchResults.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => handleStartPrivateChat(emp)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left hover:bg-indigo-600/10 hover:text-white text-white/70 transition"
                  >
                    <div className="w-9 h-9 rounded-full bg-indigo-500/10 text-indigo-300 font-bold flex items-center justify-center text-xs">
                      {emp.fullName[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{emp.fullName}</p>
                      <p className="text-[10px] text-white/40">{emp.email}</p>
                    </div>
                  </button>
                ))
              ) : (
                searchQuery.trim() && (
                  <p className="text-center text-xs text-white/30 py-4">No coworkers found.</p>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE GROUP CHAT ── */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-[#161825] border border-white/[0.08] rounded-2xl w-full max-w-md p-5 flex flex-col shadow-2xl relative">
            <button
              onClick={() => {
                setShowCreateGroup(false);
                setGroupName("");
                setSelectedEmployeesForGroup([]);
              }}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.05]"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-white text-md font-bold flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-indigo-400" />
              Create Group Chat
            </h3>

            {/* Group Name input */}
            <div className="space-y-1 mb-4">
              <label className="text-xs text-white/50 font-semibold">Group Name</label>
              <input
                type="text"
                placeholder="e.g. Design Team, Sales Support..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full bg-[#1e2133] border border-white/[0.05] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            {/* Employee search to add members */}
            <div className="space-y-1 mb-2">
              <label className="text-xs text-white/50 font-semibold">Add Members</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Type name to filter coworkers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#1e2133] border border-white/[0.05] rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none"
                />
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-white/30" />
              </div>
            </div>

            {/* List of checked coworkers */}
            <div className="overflow-y-auto max-h-40 space-y-1 border border-white/[0.04] p-1.5 rounded-xl bg-black/10">
              {searchResults.length > 0 ? (
                searchResults.map((emp) => {
                  const isChecked = selectedEmployeesForGroup.includes(emp.id);
                  return (
                    <button
                      key={emp.id}
                      onClick={() => toggleGroupMemberSelection(emp.id)}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition ${
                        isChecked ? "bg-indigo-600/10 text-white" : "hover:bg-white/[0.02] text-white/60"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/15 text-indigo-300 font-bold flex items-center justify-center text-xs">
                          {emp.fullName[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold">{emp.fullName}</p>
                          <p className="text-[10px] text-white/40">{emp.email}</p>
                        </div>
                      </div>
                      <div
                        className={`w-4.5 h-4.5 rounded border flex items-center justify-center transition ${
                          isChecked ? "bg-indigo-600 border-indigo-500" : "border-white/20"
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </button>
                  );
                })
              ) : (
                <p className="text-center text-[11px] text-white/30 py-4">Search coworkers to check them.</p>
              )}
            </div>

            {/* Selected Count & Create Button */}
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-white/40 font-medium">
                {selectedEmployeesForGroup.length} members selected
              </span>
              <button
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || selectedEmployeesForGroup.length === 0}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition disabled:opacity-40"
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD MEMBER TO GROUP ── */}
      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-[#161825] border border-white/[0.08] rounded-2xl w-full max-w-md p-5 flex flex-col shadow-2xl relative">
            <button
              onClick={() => {
                setShowAddMember(false);
                setAddMemberQuery("");
                setAddMemberResults([]);
              }}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.05]"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-white text-md font-bold flex items-center gap-2 mb-4">
              <Plus className="w-5 h-5 text-indigo-400" />
              Add Group Member
            </h3>

            <div className="relative">
              <input
                type="text"
                placeholder="Search colleague by name or email..."
                value={addMemberQuery}
                onChange={(e) => setAddMemberQuery(e.target.value)}
                className="w-full bg-[#1e2133] border border-white/[0.05] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50"
              />
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-white/30" />
            </div>

            {/* Results list */}
            <div className="flex-1 overflow-y-auto max-h-60 mt-4 space-y-1">
              {addMemberResults.length > 0 ? (
                addMemberResults.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => handleAddMemberToGroup(emp)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left hover:bg-indigo-600/10 hover:text-white text-white/70 transition"
                  >
                    <div className="w-9 h-9 rounded-full bg-indigo-500/10 text-indigo-300 font-bold flex items-center justify-center text-xs">
                      {emp.fullName[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{emp.fullName}</p>
                      <p className="text-[10px] text-white/40">{emp.email}</p>
                    </div>
                  </button>
                ))
              ) : (
                addMemberQuery.trim() && (
                  <p className="text-center text-xs text-white/30 py-4">No colleagues match filter or all are in group.</p>
                )
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
