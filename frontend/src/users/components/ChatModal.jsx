import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, MessageCircle, Paperclip, Smile } from 'lucide-react';
import { useSelector } from 'react-redux';
import { API } from '../../services/api/api';
import { io } from 'socket.io-client';


const RECIEVER_ID = import.meta.env.VITE_REACT_APP_ADMIN_ID; 
const RECIEVER_IDd = import.meta.env.VITE_RAZORPAY_KEY_ID; 
export default function ChatModal({ open, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const { userInfo } = useSelector((state) => state.auth);

  const socketRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (open && userInfo?._id) {
      fetchMessages();

      const socketUrl = (import.meta.env.VITE_API_BASE_URL || "https://www.vintagefashion.site/api").replace('/api', '');
      const socket = io(socketUrl, {
        withCredentials: true,
        transports: ['websocket', 'polling']
      });

      socketRef.current = socket;

      socket.emit("join_room", userInfo._id);

      socket.on("receive_message", (message) => {
        setMessages((prev) => {
          if (prev.some(m => m._id === message._id)) return prev;
          return [...prev, message];
        });
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [open, userInfo]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await API.get('/chat/user/messages');
      setMessages(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();    
    if (!newMessage.trim()) return;

    try {
      const response = await API.post('/chat/user/messages', {
        text: newMessage,
        receiverId: RECIEVER_ID, // Set this in your environment variables
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

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[999999] p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col h-[520px] animate-scale-in">
        {/* Premium Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-5 py-4 text-white flex justify-between items-center relative shadow-md">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-white font-bold text-sm bg-gradient-to-tr from-blue-700 to-indigo-600">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white animate-pulse"></span>
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-white m-0">Vintage Support Desk</h2>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[11px] text-green-400 font-medium">Online</span>
                <span className="text-[10px] text-slate-300">• We reply in minutes</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-white/10 rounded-full text-slate-300 hover:text-white transition-all"
            title="Close chat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-20 flex flex-col items-center justify-center">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <MessageCircle className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-xs font-semibold text-slate-700">No messages yet</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">Send a message to start a real-time conversation with our support team!</p>
            </div>
          ) : (
            messages.map((message, index) => {
              const isMe = message.senderId === userInfo._id;
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

        {/* Floating Style Input Bar */}
        <form onSubmit={sendMessage} className="p-4 bg-white border-t border-slate-100">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-full px-3 py-1.5 shadow-inner focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <button type="button" className="p-1 hover:bg-slate-200/50 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
              <Smile className="h-5 w-5" />
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 text-sm px-2 text-slate-700 placeholder-slate-400 py-1"
            />
            <button type="button" className="p-1 hover:bg-slate-200/50 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
              <Paperclip className="h-5 w-5" />
            </button>
            <button
              type="submit"
              className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white p-2.5 rounded-full hover:shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center shadow-md ml-1"
              disabled={loading || !newMessage.trim()}
            >
              <Send className="h-4 w-4 text-white" />
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}