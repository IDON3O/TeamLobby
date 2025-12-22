
import React, { useState, useEffect, useRef } from 'react';
import { Message, User } from '../types';
import { Send, Bot } from 'lucide-react';
import { generateBotChat } from '../services/geminiService';
import { useLanguage } from '../services/i18n';

interface ChatProps {
  messages: Message[];
  currentUser: User;
  onSendMessage: (text: string) => void;
  onReceiveMessage: (msg: Message) => void;
}

const Chat: React.FC<ChatProps> = ({ messages, currentUser, onSendMessage, onReceiveMessage }) => {
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const text = inputText;
    setInputText('');
    onSendMessage(text);

    // Simulate Bot Response if triggered
    if (text.toLowerCase().includes('@bot') || Math.random() > 0.8) {
        setIsTyping(true);
        try {
            const reply = await generateBotChat(text, "Users are discussing games to play.");
            setTimeout(() => {
                onReceiveMessage({
                    id: Date.now().toString(),
                    userId: 'bot',
                    userName: 'AI System',
                    content: reply,
                    timestamp: Date.now(),
                    isSystem: true
                });
                setIsTyping(false);
            }, 1500);
        } catch (err) {
            setIsTyping(false);
        }
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface/40 backdrop-blur-md">
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {messages.map((msg) => {
          const isMe = msg.userId === currentUser.id;
          const isBot = msg.userId === 'bot';
          const isSystem = msg.isSystem;
          
          if (isSystem) return (
            <div key={msg.id} className="flex justify-center">
              <span className="text-[10px] font-black text-gray-600 bg-black/20 px-4 py-1.5 rounded-full border border-gray-800 uppercase tracking-widest">{msg.content}</span>
            </div>
          );

          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-2 mb-1.5 px-1">
                 {isBot && <Bot size={12} className="text-primary" />}
                 <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">{msg.userName}</span>
              </div>
              <div className={`max-w-[85%] rounded-[1.2rem] px-4 py-3 text-xs leading-relaxed shadow-lg ${
                isMe 
                  ? 'bg-primary text-white rounded-tr-none' 
                  : isBot 
                    ? 'bg-surface border border-primary/40 text-gray-200'
                    : 'bg-gray-900 border border-gray-800 text-gray-200 rounded-tl-none'
              }`}>
                {msg.content}
              </div>
            </div>
          );
        })}
        {isTyping && (
             <div className="flex flex-col items-start">
             <span className="text-[9px] text-gray-500 font-black mb-1.5 uppercase tracking-widest">{t('chat.aiTyping')}</span>
             <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 rounded-tl-none">
               <div className="flex gap-1.5">
                 <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></div>
                 <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce delay-75"></div>
                 <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce delay-150"></div>
               </div>
             </div>
           </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="p-6 bg-gray-900/80 border-t border-gray-800 backdrop-blur-xl">
        <div className="relative group">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={t('chat.placeholder')}
            className="w-full bg-black/60 border border-gray-800 text-white rounded-2xl py-4 pl-5 pr-14 text-xs font-bold focus:outline-none focus:border-primary transition-all shadow-inner"
          />
          <button 
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-primary text-white p-2.5 rounded-xl hover:bg-violet-600 transition-all shadow-lg active:scale-90"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;
