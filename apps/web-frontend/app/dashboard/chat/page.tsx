"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/app/context/AuthContext";
import api from "@/lib/api";
import io, { Socket } from "socket.io-client";
import { Send, User as UserIcon, Circle } from "lucide-react";

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

export default function ChatPage() {
  const { user, token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [allMessages, setAllMessages] = useState<Message[]>([]); // Store all messages
  const [newMessage, setNewMessage] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 1. Fetch Users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get("/users");
        setUsers(
          response.data.filter((u: any) => {
            const uId = u.id || u._id;
            return uId !== user?.id;
          })
        );
      } catch (err) {
        console.error("Failed to fetch users", err);
      }
    };
    if (user) fetchUsers();
  }, [user]);

  // 2. Initialize Socket (ONCE - not dependent on selectedUser)
  useEffect(() => {
    if (!token) return;

    const newSocket = io(
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
      {
        auth: { token },
        path: "/socket.io",
        transports: ["websocket"],
      }
    );

    newSocket.on("connect", () => {
      console.log("✅ Socket connected:", newSocket.id);
    });

    newSocket.on("receive_private_message", (message: Message) => {
      console.log("📩 Received message:", message);

      // Add to all messages - don't filter here
      setAllMessages((prev) => {
        // Check if message already exists
        if (prev.some((m) => m.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });

      // Also update current conversation messages to replace temp message
      setMessages((prev) => {
        // If this is a real message from server, remove any temp message with same content/time
        const withoutTemp = prev.filter((m) => !m.id.startsWith("temp-"));

        // Check if already exists
        if (withoutTemp.some((m) => m.id === message.id)) {
          return withoutTemp;
        }

        // Add the real message
        return [...withoutTemp, message].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });

      scrollToBottom();
    });

    newSocket.on("connect_error", (err) => {
      console.error("❌ Socket connection error:", err);
    });

    newSocket.on("disconnect", () => {
      console.log("🔌 Socket disconnected");
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token]); // Only depends on token

  // 3. Fetch History when User Selected
  useEffect(() => {
    if (!selectedUser) return;

    const fetchHistory = async () => {
      try {
        const userId = selectedUser.id || (selectedUser as any)._id;
        const response = await api.get(`/messages/${userId}`);
        setMessages(response.data);
        scrollToBottom();
      } catch (err) {
        console.error("Failed to fetch chat history", err);
      }
    };

    fetchHistory();
  }, [selectedUser]);

  // 4. Filter messages for current conversation
  useEffect(() => {
    if (!selectedUser || !user) return;

    const selectedUserId = selectedUser.id || (selectedUser as any)._id;

    // Combine fetched history with new real-time messages
    const conversationMessages = allMessages.filter(
      (msg) =>
        (msg.senderId === user.id && msg.receiverId === selectedUserId) ||
        (msg.senderId === selectedUserId && msg.receiverId === user.id)
    );

    // Merge with existing messages without duplicates
    setMessages((prev) => {
      const merged = [...prev];
      conversationMessages.forEach((newMsg) => {
        if (!merged.some((m) => m.id === newMsg.id)) {
          merged.push(newMsg);
        }
      });
      // Sort by createdAt
      return merged.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    });

    scrollToBottom();
  }, [allMessages, selectedUser, user]);

  // Count unread messages per user
  const getUnreadCount = (userId: string) => {
    if (!user) return 0;
    return allMessages.filter(
      (msg) =>
        msg.senderId === userId && msg.receiverId === user.id && !msg.readAt
    ).length;
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedUser || !socket || !user) return;

    const userId = selectedUser.id || (selectedUser as any)._id;
    const messageContent = newMessage.trim();

    console.log("📤 Sending message to:", userId);

    // Optimistic UI update - add message immediately
    const tempMessage: Message = {
      id: `temp-${Date.now()}`, // Temporary ID
      senderId: user.id,
      senderName: `${user.firstName} ${user.lastName}`,
      receiverId: userId,
      content: messageContent,
      createdAt: new Date().toISOString(),
    };

    // Add to messages immediately for instant feedback
    setMessages((prev) => [...prev, tempMessage]);
    scrollToBottom();

    // Send to server
    socket.emit("send_private_message", {
      to: userId,
      content: messageContent,
    });

    setNewMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      {/* Users List */}
      <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {users.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No users available
            </div>
          ) : (
            users.map((u) => {
              const userId = u.id || (u as any)._id;
              const isSelected =
                selectedUser &&
                (selectedUser.id || (selectedUser as any)._id) === userId;
              const unreadCount = getUnreadCount(userId);

              return (
                <button
                  key={userId}
                  onClick={() => setSelectedUser(u)}
                  className={`w-full p-4 flex items-center space-x-3 hover:bg-gray-50 transition-colors ${
                    isSelected
                      ? "bg-indigo-50 border-l-4 border-indigo-600"
                      : ""
                  }`}
                >
                  <div className="relative">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                      <UserIcon className="w-6 h-6 text-indigo-600" />
                    </div>
                    {unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white font-bold">
                          {unreadCount}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900">
                      {u.firstName} {u.lastName}
                    </p>
                    <p className="text-sm text-gray-500 truncate">{u.email}</p>
                  </div>
                  {unreadCount > 0 && (
                    <Circle className="w-3 h-3 text-indigo-600 fill-indigo-600" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4 flex items-center space-x-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {selectedUser.firstName} {selectedUser.lastName}
                </p>
                <p className="text-sm text-gray-500">{selectedUser.email}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">
                    No messages yet. Start the conversation!
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMyMessage = msg.senderId === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${
                        isMyMessage ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-2 rounded-lg ${
                          isMyMessage
                            ? "bg-indigo-600 text-white"
                            : "bg-white text-gray-900 border border-gray-200"
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            isMyMessage ? "text-indigo-200" : "text-gray-500"
                          }`}
                        >
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <UserIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                Select a user to start chatting
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
