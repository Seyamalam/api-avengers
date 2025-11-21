import { useEffect, useState, useRef } from 'react';
import { MessageSquare, X, Send, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Message {
  type: string;
  roomId?: string;
  content?: string;
  user?: string;
  timestamp?: string;
}

export default function Chat() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [roomId, setRoomId] = useState('general');
  const ws = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    ws.current = new WebSocket('ws://localhost:3007/ws');

    ws.current.onopen = () => {
      console.log('Connected to Chat Service');
      // Join default room
      ws.current?.send(JSON.stringify({ type: 'join', roomId }));
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'message') {
          setMessages(prev => [...prev, data]);
        }
      } catch (err) {
        console.error('Failed to parse chat message', err);
      }
    };

    return () => {
      ws.current?.close();
    };
  }, [isOpen, roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !ws.current) return;

    const message = {
      type: 'message',
      roomId,
      content: input,
      user: user?.name || user?.email || 'Anonymous'
    };

    ws.current.send(JSON.stringify(message));
    // Optimistically add message
    // setMessages(prev => [...prev, { ...message, timestamp: new Date().toISOString() }]);
    setInput('');
  };

  if (!user) return null; // Only show chat for logged in users

  return (
    <div className="fixed bottom-4 right-24 z-50">
      {isOpen ? (
        <div className="bg-white rounded-lg shadow-xl w-80 h-96 flex flex-col border border-gray-200 overflow-hidden">
          <div className="bg-slate-900 text-white p-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <MessageSquare size={18} />
              <span className="font-bold">Community Chat</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
              <X size={18} />
            </button>
          </div>
          
          <div className="bg-gray-50 p-2 border-b flex gap-2 overflow-x-auto">
            {['general', 'support', 'random'].map(r => (
              <button
                key={r}
                onClick={() => {
                  setRoomId(r);
                  setMessages([]);
                }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  roomId === r 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-600 border hover:bg-gray-100'
                }`}
              >
                #{r}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((msg, idx) => {
              const isMe = msg.user === (user?.name || user?.email);
              return (
                <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`flex items-center gap-1 mb-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center">
                      <User size={10} className="text-gray-600" />
                    </div>
                    <span className="text-xs text-gray-500">{msg.user}</span>
                  </div>
                  <div 
                    className={`max-w-[80%] p-2 rounded-lg text-sm ${
                      isMe 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} className="p-3 bg-white border-t flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
            <button 
              type="submit"
              className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition disabled:opacity-50"
              disabled={!input.trim()}
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white p-4 rounded-full shadow-lg transition"
        >
          <MessageSquare size={24} />
        </button>
      )}
    </div>
  );
}
