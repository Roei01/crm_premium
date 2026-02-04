"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";
import io, { Socket } from "socket.io-client";
import { Send, User as UserIcon, Search } from "lucide-react";

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
  readAt?: string | null;
}

export default function ChatPage() {
  const { user, token } = useAuth();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Ref to keep track of selected user inside socket listeners without recreating them
  const selectedUserRef = useRef<User | null>(null);

  // Sync ref with state
  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  // 1. Fetch Users & Unread Counts
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch users
        const usersResponse = await api.get("/users");
        const filteredUsers = usersResponse.data
          .filter((u: any) => (u.id || u._id) !== user?.id)
          .map((u: any) => ({
            ...u,
            id: u.id || u._id,
          }));
        setUsers(filteredUsers);

        // Check if there's a user parameter in the URL
        const userIdParam = searchParams.get("user");
        if (userIdParam) {
          const userToSelect = filteredUsers.find(
            (u: User) => u.id === userIdParam
          );
          if (userToSelect) {
            setSelectedUser(userToSelect);
          }
        }

        // Fetch unread message counts for each user
        const unreadPromises = filteredUsers
          .filter((u: User) => u.id) // Ensure ID exists
          .map(async (u: User) => {
            try {
              const response = await api.get(`/messages/${u.id}/unread-count`);
              return { userId: u.id, count: response.data.count || 0 };
            } catch {
              return { userId: u.id, count: 0 };
            }
          });

        const unreadData = await Promise.all(unreadPromises);
        const unreadMap: Record<string, number> = {};
        unreadData.forEach((item) => {
          if (item.count > 0) {
            unreadMap[item.userId] = item.count;
          }
        });
        setUnreadCounts(unreadMap);
      } catch (err) {
        console.error("Failed to fetch users", err);
      }
    };
    if (user) fetchData();
  }, [user, searchParams]);

  // 2. Initialize Socket (Run once when token is available)
  useEffect(() => {
    if (!token) return;

    console.log("Initializing socket...");

    const newSocket = io(
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
      {
        auth: { token },
        path: "/socket.io",
        transports: ["websocket"],
        reconnectionAttempts: 5,
      }
    );

    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id);
    });

    newSocket.on("receive_private_message", (message: Message) => {
      console.log("Received message:", message);
      
      const currentSelectedUser = selectedUserRef.current;
      const currentUserId = user?.id;

      // Determine if the message belongs to the currently open chat
      const isCurrentChat = 
        currentSelectedUser && 
        ((message.senderId === currentSelectedUser.id && message.receiverId === currentUserId) ||
         (message.senderId === currentUserId && message.receiverId === currentSelectedUser.id));

      if (isCurrentChat) {
        setMessages((prev) => [...prev, message]);
        // Scroll to bottom will be handled by the messages effect or manual call
        
        // If I received it (not sent it) and it's current chat, mark as read
        if (message.senderId === currentSelectedUser.id) {
            // Note: We can't easily call markAsRead here without complex circular deps or moving functions.
            // But we can trigger it via API.
            api.put(`/messages/${message.id}/read`).catch(console.error);
        }
      } else {
        // Not current chat
        if (message.receiverId === currentUserId && message.senderId !== currentUserId) {
             setUnreadCounts((prev) => ({
                ...prev,
                [message.senderId]: (prev[message.senderId] || 0) + 1,
              }));
        }
      }
    });

    newSocket.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
    });

    setSocket(newSocket);

    return () => {
      console.log("Disconnecting socket...");
      newSocket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]); // Only re-run if token changes

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 3. Fetch History when User Selected & Mark as Read
  useEffect(() => {
    if (!selectedUser) {
        setMessages([]); // Clear messages if no user selected
        return;
    }

    // Clear messages immediately when switching user to avoid showing old chat
    setMessages([]);

    const fetchHistory = async () => {
      try {
        const response = await api.get(`/messages/${selectedUser.id}`);
        setMessages(response.data);
        
        // Mark all messages from this user as read
        const unreadMessages = response.data.filter(
          (msg: Message) => msg.senderId === selectedUser.id && !msg.readAt
        );

        if (unreadMessages.length > 0) {
          await api.post(`/messages/${selectedUser.id}/mark-read`);
          // Reset unread count for this user
          setUnreadCounts((prev) => {
            const newCounts = { ...prev };
            delete newCounts[selectedUser.id];
            return newCounts;
          });
        }
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
    setNewMessage("");
  };

  // Filter users based on search query
  const filteredUsers = users.filter(
    (u) =>
      u.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-lg shadow overflow-hidden">
      {/* Users List Sidebar */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 mb-3">Users</h2>
          {/* Search Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>
        </div>
        <ul className="divide-y divide-gray-200 overflow-y-auto flex-1">
          {filteredUsers.length === 0 ? (
            <li className="p-6 text-center text-gray-500 text-sm">
              No users found
            </li>
          ) : (
            filteredUsers.map((u) => (
              <li
                key={u.id}
                onClick={() => setSelectedUser(u)}
                className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors relative ${
                  selectedUser?.id === u.id
                    ? "bg-indigo-50 hover:bg-indigo-50"
                    : ""
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 relative">
                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600">
                      <UserIcon className="h-6 w-6" />
                    </div>
                    {/* Unread Badge */}
                    {unreadCounts[u.id] && unreadCounts[u.id] > 0 && (
                      <div className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">
                          {unreadCounts[u.id] > 9 ? "9+" : unreadCounts[u.id]}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {u.firstName} {u.lastName}
                    </p>
                    <p className="text-sm text-gray-500 truncate">{u.email}</p>
                  </div>
                </div>
              </li>
            ))
          )}
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
                    key={msg.id || index}
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
