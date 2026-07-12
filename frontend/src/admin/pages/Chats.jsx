import React, { useState, useEffect, useRef } from 'react';
import { Send, Search, MessageSquare, User, ShieldCheck, Smile, Paperclip } from 'lucide-react';
import { API } from '../../services/api/api';
import { io } from 'socket.io-client';

function Chats() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef(null);

  const getInitials = (user) => {
    const first = user.firstname?.[0] || '';
    const last = user.lastname?.[0] || '';
    return `${first}${last}`.toUpperCase() || 'U';
  };

  const getAvatarColor = (userId) => {
    const colors = [
      'bg-emerald-500/10 text-emerald-600 border-emerald-200',
      'bg-indigo-500/10 text-indigo-600 border-indigo-200',
      'bg-rose-500/10 text-rose-600 border-rose-200',
      'bg-amber-500/10 text-amber-600 border-amber-200',
      'bg-sky-500/10 text-sky-600 border-sky-200',
    ];
    const code = userId ? userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
    return colors[code % colors.length];
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const socketRef = useRef(null);
  const ADMIN_ID = import.meta.env.VITE_REACT_APP_ADMIN_ID;

  useEffect(() => {
    fetchUsers();

    const socketUrl = (import.meta.env.VITE_API_BASE_URL || "https://www.vintagefashion.site/api").replace('/api', '');
    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.emit("join_room", ADMIN_ID);

    socket.on("receive_message", (message) => {
      setSelectedUser(currentSelected => {
        if (currentSelected && message.senderId === currentSelected._id) {
          setMessages(prev => {
            if (prev.some(m => m._id === message._id)) return prev;
            return [...prev, message];
          });
        }
        return currentSelected;
      });
      fetchUsers();
    });

    const interval = setInterval(fetchUsers, 15000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser._id);
    }
  }, [selectedUser]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await API.get('/chat/admin/chat-users');
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (userId) => {
    try {
      const response = await API.get(`/chat/admin/messages/${userId}`);
      setMessages(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages([]);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    try {
      const response = await API.post('/chat/admin/messages', {
        text: newMessage,
        receiverId: selectedUser._id,
        time: new Date(),
      });

      setMessages(prev => [...prev, response.data]);
      setNewMessage('');

      if (socketRef.current) {
        socketRef.current.emit("send_message", response.data);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };



  const filteredUsers = users.filter(user => 
    `${user.firstname || ''} ${user.lastname || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] bg-slate-50/50 overflow-hidden">
      {/* Users List Sidebar */}
      <div className="w-[340px] border-r border-slate-200 bg-white flex flex-col h-full flex-shrink-0">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
              Conversations
              <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-semibold">
                {users.length}
              </span>
            </h2>
          </div>
          {/* Search Box */}
          <div className="relative flex items-center bg-slate-100 border border-slate-200/50 rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 focus-within:bg-white transition-all">
            <Search className="h-4 w-4 text-slate-400 mr-2 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent border-0 outline-none focus:outline-none focus:ring-0 text-sm py-0.5 text-slate-700 placeholder-slate-400"
            />
          </div>
        </div>

        {/* Sidebar Users Thread */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredUsers.length === 0 ? (
            <div className="text-center text-slate-400 py-12 px-4 text-xs">
              {searchTerm ? 'No matching conversations' : 'No active conversations'}
            </div>
          ) : (
            filteredUsers.map((user) => {
              const isSelected = selectedUser?._id === user._id;
              return (
                <button
                  key={user._id}
                  onClick={() => setSelectedUser(user)}
                  className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 border ${
                    isSelected
                      ? 'bg-primary/5 border-primary/20 shadow-xs'
                      : 'border-transparent hover:bg-slate-50'
                  }`}
                >
                  {/* Dynamic Initials Avatar */}
                  <div className={`h-10 w-10 rounded-full border flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm ${getAvatarColor(user._id)}`}>
                    {getInitials(user)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold tracking-tight truncate ${isSelected ? 'text-primary' : 'text-slate-800'}`}>
                      {user.firstname} {user.lastname}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {user.email || 'Verified Customer'}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0"></div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Conversation Area */}
      <div className="flex-1 flex flex-col h-full bg-slate-50/50">
        {selectedUser ? (
          <>
            {/* Active Header */}
            <div className="p-4 bg-white border-b border-slate-200/60 flex items-center justify-between flex-shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full border flex items-center justify-center font-bold text-sm ${getAvatarColor(selectedUser._id)}`}>
                  {getInitials(selectedUser)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 tracking-tight m-0">
                    {selectedUser.firstname} {selectedUser.lastname}
                  </h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-[11px] text-slate-500 font-medium">Customer Verified</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Conversation Stream */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-20 flex flex-col items-center justify-center">
                  <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                    <MessageSquare className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700">No messages yet</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">Send a reply below to initiate the support ticket conversation.</p>
                </div>
              ) : (
                messages.map((message, index) => {
                  const isMe = message.isAdminMessage;
                  return (
                    <div
                      key={index}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] px-4 py-2.5 shadow-sm text-sm border transition-all ${
                          isMe
                            ? 'bg-gradient-to-br from-blue-700 to-indigo-700 text-white rounded-2xl rounded-tr-none border-blue-600/30'
                            : 'bg-white text-slate-800 rounded-2xl rounded-tl-none border-slate-100'
                        }`}
                      >
                        <p className="leading-relaxed break-words m-0">{message.text}</p>
                        <span className={`text-[9px] block mt-1.5 font-medium ${isMe ? 'text-blue-200 text-right' : 'text-slate-400'}`}>
                          {new Date(message.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Floating Style Input footer */}
            <form onSubmit={sendMessage} className="p-4 bg-white border-t border-slate-200/60 flex-shrink-0">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-full px-3 py-1.5 shadow-inner focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all max-w-4xl mx-auto">
                <button type="button" className="p-1 hover:bg-slate-200/50 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                  <Smile className="h-5 w-5" />
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your reply here..."
                  className="flex-1 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 text-sm px-2 text-slate-700 placeholder-slate-400 py-1"
                />
                <button type="button" className="p-1 hover:bg-slate-200/50 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                  <Paperclip className="h-5 w-5" />
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white p-2.5 rounded-full hover:shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center shadow-md ml-1"
                  disabled={!newMessage.trim()}
                >
                  <Send className="h-4 w-4 text-white" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
            <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <MessageSquare className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Conversation Selected</h3>
            <p className="text-[11px] text-slate-400 mt-1 max-w-[280px] text-center">
              Please choose a customer conversation from the left thread list to view messages and engage in real-time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Chats;