
import React, { useState, useEffect, useRef } from 'react';
import { Message, User } from '../types';
import { Send, Bot, Info } from 'lucide-react';
import { useLanguage } from '../services/i18n';

interface ChatProps {
  messages: Message[];
  currentUser: User;
  onSendMessage: (text: string) => void;
  onReceiveMessage: (msg: Message) => void;
}

const Chat: React.FC<ChatProps> = ({ messages, currentUser, onSendMessage }) => {
  const [inputText, setInputText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    onSendMessage(inputText);
    setInputText('');
  };

  return (
    <div className="flex flex-col h-full bg-surface/40 backdrop-blur-md">
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {/* WELCOME SYSTEM MESSAGE - STATIC & PERSISTENT */}
        <div className="flex flex-col items-center justify-center py-5 px-6 mb-4 border border-primary/20 bg-primary/5 rounded-[2rem] text-center space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="bg-primary/20 p-3 rounded-full shadow-[0_0_15px_rgba(139,92,246,0.3)]">
                <Bot size={24} className="text-primary"/>
            </div>
            <div className="space-y-1">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white">{t('chat.welcome.title')}</h4>
                <p className="text-[11px] text-gray-400 font-bold leading-relaxed italic max-w-[240px]">
                    "{t('chat.welcome.text')}"
                </p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-black/40 rounded-full border border-gray-800">
                <Info size={10} className="text-gray-500"/>
                <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">{t('chat.system.sync')}</span>
            </div>
        </div>

        {messages.map((msg) => {
          const isMe = msg.userId === currentUser.id;
          const isSystem = msg.isSystem;
          
          if (isSystem) return (
            <div key={msg.id} className="flex justify-center my-2">
              <span className="text-[9px] font-black text-gray-500 bg-black/40 px-4 py-1.5 rounded-full border border-gray-800 uppercase tracking-widest">{msg.content}</span>
            </div>
          );

          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className="flex items-center gap-2 mb-1 px-1">
                 <span className={`text-[9px] font-black uppercase tracking-widest ${isMe ? 'text-primary' : 'text-gray-500'}`}>
                   {isMe ? t('chat.you') : msg.userName}
                 </span>
              </div>
              <div className={`max-w-[85%] rounded-[1.3rem] px-4 py-3 text-xs leading-relaxed shadow-lg transition-all hover:scale-[1.02] ${
                isMe 
                  ? 'bg-primary text-white rounded-tr-none' 
                  : 'bg-gray-900 border border-gray-800 text-gray-200 rounded-tl-none'
              }`}>
                {msg.content}
              </div>
              <span className="text-[8px] text-gray-700 font-bold mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="p-6 bg-gray-900/95 border-t border-gray-800 backdrop-blur-2xl">
        <div className="relative group">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={t('chat.placeholder')}
            className="w-full bg-black/60 border border-gray-800 text-white rounded-2xl py-4 pl-5 pr-14 text-xs font-bold focus:outline-none focus:border-primary transition-all shadow-inner placeholder:text-gray-700"
          />
          <button 
            type="submit"
            disabled={!inputText.trim()}
            className={`absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-xl transition-all shadow-lg active:scale-90 ${inputText.trim() ? 'bg-primary text-white hover:bg-violet-600 shadow-primary/20' : 'text-gray-800 cursor-not-allowed'}`}
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;
