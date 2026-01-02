"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/app/context/AuthContext";
import api from "@/lib/api";
import io, { Socket } from "socket.io-client";
import { Send, User as UserIcon } from "lucide-react";

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
}

export default function ChatPage() {
  const { user, token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get("/users");
        // Filter out current user from the list
        setUsers(response.data.filter((u: any) => u.id !== user?.id));
      } catch (err) {
        console.error("Failed to fetch users", err);
      }
    };
    if (user) fetchUsers();
  }, [user]);

  // 2. Initialize Socket
  useEffect(() => {
    if (!token) return;

    const newSocket = io(
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
      {
        auth: { token },
        path: "/socket.io",
        transports: ["websocket"], // Force WebSocket
      }
    );

    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id);
    });

    newSocket.on("receive_private_message", (message: Message) => {
      // Only append if the message is from/to the selected user
      if (
        (selectedUser && message.senderId === selectedUser.id) ||
        (selectedUser &&
          message.receiverId === selectedUser.id &&
          message.senderId === user?.id)
      ) {
        setMessages((prev) => [...prev, message]);
        scrollToBottom();
      }
    });

    newSocket.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token, selectedUser, user]); // Re-bind listener if selectedUser changes? No, better logic inside listener or state

  // Better approach for socket listener to access current state without re-connecting:
  // Using a ref or just relying on the fact that we append to state.
  // Actually, filtering inside the effect is tricky if selectedUser changes.
  // Let's refine: The socket listener should just add to a global store or we filter in render?
  // For simplicity: We add ALL incoming messages to state, and UI filters?
  // No, that might be too much.
  // Let's stick to: If we receive a message, and it belongs to the conversation, add it.

  // 3. Fetch History when User Selected
  useEffect(() => {
    if (!selectedUser) return;

    const fetchHistory = async () => {
      try {
        const response = await api.get(`/messages/${selectedUser.id}`);
        setMessages(response.data);
        scrollToBottom();
      } catch (err) {
        console.error("Failed to fetch history", err);
      }
    };

    fetchHistory();
  }, [selectedUser]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || !socket) return;

    const messageData = {
      to: selectedUser.id,
      content: newMessage,
    };

    socket.emit("send_private_message", messageData);

    // Optimistically add to UI (or wait for server ack? server emits back to sender too?)
    // Our server implementation emits to BOTH sender and receiver room.
    // So we don't need to manually add it here if the server echoes it back.
    // Let's check server code:
    // io.to(receiverSocketId).emit('receive_private_message', savedMessage);
    // io.to(senderSocketId).emit('receive_private_message', savedMessage);
    // Perfect.

    setNewMessage("");
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-lg shadow overflow-hidden">
      {/* Users List Sidebar */}
      <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Users</h2>
        </div>
        <ul className="divide-y divide-gray-200">
          {users.map((u) => (
            <li
              key={u.id}
              onClick={() => setSelectedUser(u)}
              className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedUser?.id === u.id
                  ? "bg-indigo-50 hover:bg-indigo-50"
                  : ""
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600">
                    <UserIcon className="h-6 w-6" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {u.firstName} {u.lastName}
                  </p>
                  <p className="text-sm text-gray-500 truncate">{u.email}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-medium text-gray-900">
                Chat with {selectedUser.firstName} {selectedUser.lastName}
              </h3>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-100">
              {messages.map((msg, index) => {
                const isMe = msg.senderId === user?.id;
                return (
                  <div
                    key={index} // MongoDB _id might be better if available
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg text-sm ${
                        isMe
                          ? "bg-indigo-600 text-white rounded-br-none"
                          : "bg-white text-gray-900 shadow-sm rounded-bl-none"
                      }`}
                    >
                      <p>{msg.content}</p>
                      <span
                        className={`text-xs block mt-1 ${
                          isMe ? "text-indigo-200" : "text-gray-400"
                        }`}
                      >
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-gray-200">
              <form onSubmit={sendMessage} className="flex space-x-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <p className="text-gray-500 text-lg">
              Select a user to start chatting
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
