"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/app/context/AuthContext";
import api from "@/lib/api";
import io, { Socket } from "socket.io-client";
import { Send, MessageCircle, Check, CheckCheck } from "lucide-react";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  receiverId?: string;
  content: string;
  createdAt: string;
  readAt?: string;
}

const AVATAR_COLORS = [
  "bg-indigo-500",
  "bg-emerald-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-violet-500",
  "bg-sky-500",
  "bg-teal-500",
  "bg-orange-500",
];

function getAvatarColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const time = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === now.toDateString()) return time;
  if (date.toDateString() === yesterday.toDateString())
    return `Yesterday ${time}`;
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
}

function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === now.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function Avatar({
  firstName,
  lastName,
  userId,
  size = "md",
}: {
  firstName: string;
  lastName: string;
  userId: string;
  size?: "sm" | "md" | "lg";
}) {
  const color = getAvatarColor(userId);
  const sizeClass =
    size === "sm"
      ? "w-8 h-8 text-xs"
      : size === "lg"
      ? "w-12 h-12 text-base"
      : "w-10 h-10 text-sm";
  return (
    <div
      className={`${color} ${sizeClass} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}
    >
      {getInitials(firstName, lastName)}
    </div>
  );
}

export default function ChatPage() {
  const { user, token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch users
  useEffect(() => {
    if (!user) return;
    api
      .get("/users")
      .then((res) => {
        setUsers(
          res.data.filter((u: any) => (u.id || u._id) !== user.id)
        );
      })
      .catch(console.error);
  }, [user]);

  // Initialize socket
  useEffect(() => {
    if (!token) return;

    const newSocket = io(
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
      { auth: { token }, path: "/socket.io", transports: ["websocket"] }
    );

    newSocket.on("connect", () => console.log("✅ Socket connected"));

    newSocket.on("receive_private_message", (message: Message) => {
      setAllMessages((prev) =>
        prev.some((m) => m.id === message.id) ? prev : [...prev, message]
      );
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => !m.id.startsWith("temp-"));
        if (withoutTemp.some((m) => m.id === message.id)) return withoutTemp;
        return [...withoutTemp, message].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });
      scrollToBottom();
    });

    newSocket.on("online_users", (userIds: string[]) => {
      setOnlineUsers(new Set(userIds));
    });

    newSocket.on("user_typing", ({ userId }: { userId: string }) => {
      setTypingUsers((prev) => new Set(prev).add(userId));
    });

    newSocket.on("user_stop_typing", ({ userId }: { userId: string }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    newSocket.on(
      "messages_read",
      ({ by, at }: { by: string; at: string }) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.senderId === user?.id && m.receiverId === by && !m.readAt
              ? { ...m, readAt: at }
              : m
          )
        );
      }
    );

    newSocket.on("connect_error", console.error);
    newSocket.on("disconnect", () => console.log("🔌 Socket disconnected"));

    setSocket(newSocket);
    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  // Fetch history + mark read when selecting a user
  useEffect(() => {
    if (!selectedUser || !socket) return;

    const userId = selectedUser.id || (selectedUser as any)._id;
    api
      .get(`/messages/${userId}`)
      .then((res) => {
        setMessages(res.data);
        scrollToBottom();
      })
      .catch(console.error);

    socket.emit("mark_read", { from: userId });
  }, [selectedUser, socket]);

  // Merge real-time messages into current conversation
  useEffect(() => {
    if (!selectedUser || !user) return;
    const selectedUserId = selectedUser.id || (selectedUser as any)._id;

    const relevant = allMessages.filter(
      (msg) =>
        (msg.senderId === user.id && msg.receiverId === selectedUserId) ||
        (msg.senderId === selectedUserId && msg.receiverId === user.id)
    );

    setMessages((prev) => {
      const merged = [...prev];
      relevant.forEach((m) => {
        if (!merged.some((x) => x.id === m.id)) merged.push(m);
      });
      return merged.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    });

    scrollToBottom();
  }, [allMessages, selectedUser, user]);

  const getUnreadCount = (userId: string) => {
    if (!user) return 0;
    return allMessages.filter(
      (msg) =>
        msg.senderId === userId &&
        msg.receiverId === user.id &&
        !msg.readAt
    ).length;
  };

  const getLastMessage = (userId: string): Message | undefined => {
    return allMessages
      .filter(
        (msg) =>
          (msg.senderId === userId && msg.receiverId === user?.id) ||
          (msg.senderId === user?.id && msg.receiverId === userId)
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
  };

  const handleTyping = (socketRef: Socket) => {
    if (!selectedUser) return;
    const userId = selectedUser.id || (selectedUser as any)._id;
    socketRef.emit("typing", { to: userId });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.emit("stop_typing", { to: userId });
    }, 2000);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedUser || !socket || !user) return;

    const userId = selectedUser.id || (selectedUser as any)._id;
    const content = newMessage.trim();

    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      senderId: user.id,
      senderName: `${user.firstName} ${user.lastName}`,
      receiverId: userId,
      content,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMessage]);
    setNewMessage("");
    scrollToBottom();

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    socket.emit("send_private_message", { to: userId, content });
    socket.emit("stop_typing", { to: userId });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextareaChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setNewMessage(e.target.value);
    if (socket) handleTyping(socket);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const shouldShowDateSeparator = (
    msg: Message,
    prev?: Message
  ): boolean => {
    if (!prev) return true;
    return (
      new Date(msg.createdAt).toDateString() !==
      new Date(prev.createdAt).toDateString()
    );
  };

  const isGrouped = (msg: Message, prev?: Message): boolean => {
    if (!prev || msg.senderId !== prev.senderId) return false;
    return (
      new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() <
      5 * 60 * 1000
    );
  };

  const selectedUserId = selectedUser
    ? selectedUser.id || (selectedUser as any)._id
    : null;
  const isSelectedUserTyping = selectedUserId
    ? typingUsers.has(selectedUserId)
    : false;

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      {/* Users Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-4 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {users.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              No users available
            </div>
          ) : (
            users.map((u) => {
              const userId = u.id || (u as any)._id;
              const isSelected =
                selectedUser &&
                (selectedUser.id || (selectedUser as any)._id) === userId;
              const unreadCount = getUnreadCount(userId);
              const lastMsg = getLastMessage(userId);
              const isOnline = onlineUsers.has(userId);

              return (
                <button
                  key={userId}
                  onClick={() => setSelectedUser(u)}
                  className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                    isSelected
                      ? "bg-indigo-50 border-l-2 border-l-indigo-600"
                      : ""
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar
                      firstName={u.firstName}
                      lastName={u.lastName}
                      userId={userId}
                      size="lg"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                        isOnline ? "bg-emerald-400" : "bg-gray-300"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={`text-sm font-semibold truncate ${
                          unreadCount > 0 ? "text-gray-900" : "text-gray-700"
                        }`}
                      >
                        {u.firstName} {u.lastName}
                      </p>
                      {lastMsg && (
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {formatMessageTime(lastMsg.createdAt)}
                        </span>
                      )}
                    </div>
                    {lastMsg ? (
                      <p
                        className={`text-xs truncate mt-0.5 ${
                          unreadCount > 0
                            ? "text-gray-800 font-medium"
                            : "text-gray-500"
                        }`}
                      >
                        {lastMsg.senderId === user?.id ? "You: " : ""}
                        {lastMsg.content}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {isOnline ? "Online" : "Offline"}
                      </p>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <span className="flex-shrink-0 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-xs text-white font-bold">
                      {unreadCount}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
              <div className="relative">
                <Avatar
                  firstName={selectedUser.firstName}
                  lastName={selectedUser.lastName}
                  userId={selectedUserId!}
                />
                <span
                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                    onlineUsers.has(selectedUserId!)
                      ? "bg-emerald-400"
                      : "bg-gray-300"
                  }`}
                />
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {selectedUser.firstName} {selectedUser.lastName}
                </p>
                <p className="text-xs text-gray-500">
                  {isSelectedUserTyping
                    ? "typing..."
                    : onlineUsers.has(selectedUserId!)
                    ? "Online"
                    : "Offline"}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                  <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-8 h-8 text-indigo-400" />
                  </div>
                  <p className="text-gray-500">No messages yet. Say hi!</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {messages.map((msg, index) => {
                    const isMyMessage = msg.senderId === user?.id;
                    const prevMsg =
                      index > 0 ? messages[index - 1] : undefined;
                    const showSeparator = shouldShowDateSeparator(
                      msg,
                      prevMsg
                    );
                    const grouped = isGrouped(msg, prevMsg);

                    return (
                      <div key={msg.id}>
                        {showSeparator && (
                          <div className="flex items-center gap-3 my-4">
                            <div className="flex-1 h-px bg-gray-200" />
                            <span className="text-xs text-gray-400 font-medium px-2">
                              {getDateLabel(msg.createdAt)}
                            </span>
                            <div className="flex-1 h-px bg-gray-200" />
                          </div>
                        )}
                        <div
                          className={`flex ${
                            isMyMessage ? "justify-end" : "justify-start"
                          } ${grouped ? "mt-0.5" : "mt-3"}`}
                        >
                          {!isMyMessage && !grouped && (
                            <div className="mr-2 self-end">
                              <Avatar
                                firstName={selectedUser.firstName}
                                lastName={selectedUser.lastName}
                                userId={selectedUserId!}
                                size="sm"
                              />
                            </div>
                          )}
                          {!isMyMessage && grouped && (
                            <div className="w-10 mr-2 flex-shrink-0" />
                          )}
                          <div className="max-w-sm lg:max-w-md xl:max-w-lg">
                            <div
                              className={`px-4 py-2 rounded-2xl text-sm leading-relaxed ${
                                isMyMessage
                                  ? `bg-indigo-600 text-white ${
                                      grouped ? "rounded-tr-md" : ""
                                    }`
                                  : `bg-white text-gray-900 border border-gray-200 shadow-sm ${
                                      grouped ? "rounded-tl-md" : ""
                                    }`
                              } ${
                                msg.id.startsWith("temp-") ? "opacity-70" : ""
                              }`}
                            >
                              {msg.content}
                            </div>
                            <div
                              className={`flex items-center gap-1 mt-0.5 ${
                                isMyMessage ? "justify-end" : "justify-start"
                              }`}
                            >
                              <span className="text-xs text-gray-400">
                                {formatMessageTime(msg.createdAt)}
                              </span>
                              {isMyMessage &&
                                (msg.readAt ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-indigo-500" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-gray-400" />
                                ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Typing indicator */}
                  {isSelectedUserTyping && (
                    <div className="flex justify-start mt-3">
                      <div className="mr-2 self-end">
                        <Avatar
                          firstName={selectedUser.firstName}
                          lastName={selectedUser.lastName}
                          userId={selectedUserId!}
                          size="sm"
                        />
                      </div>
                      <div className="bg-white border border-gray-200 shadow-sm px-4 py-3 rounded-2xl rounded-tl-md flex items-center gap-1">
                        <span
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <span
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="bg-white border-t border-gray-200 px-4 py-3">
              <div className="flex items-end gap-2 bg-gray-50 rounded-2xl border border-gray-200 px-4 py-2">
                <textarea
                  ref={textareaRef}
                  value={newMessage}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message…"
                  rows={1}
                  className="flex-1 bg-transparent resize-none focus:outline-none text-sm text-gray-900 placeholder-gray-400 max-h-28 py-1"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0 mb-0.5"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1 ml-2">
                Enter to send · Shift+Enter for new line
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center">
              <MessageCircle className="w-10 h-10 text-indigo-400" />
            </div>
            <div>
              <p className="text-gray-700 font-medium text-lg">
                Your Messages
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Select a person to start chatting
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
