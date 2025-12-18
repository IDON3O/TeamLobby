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
    <div className="flex flex-col h-full bg-surface border border-gray-800 rounded-lg overflow-hidden">
      <div className="p-3 border-b border-gray-800 bg-gray-900/50 flex justify-between items-center">
        <h3 className="font-mono text-sm font-semibold text-gray-300">{t('chat.title')}</h3>
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg) => {
          const isMe = msg.userId === currentUser.id;
          const isBot = msg.userId === 'bot';
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-2 mb-1 px-1">
                 {isBot && <Bot size={12} className="text-primary" />}
                 <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">{msg.userName}</span>
              </div>
              <div className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-lg ${
                isMe 
                  ? 'bg-primary text-white rounded-tr-none' 
                  : isBot 
                    ? 'bg-gray-800 border border-primary/50 text-gray-200 rounded-tl-none'
                    : 'bg-black/40 text-gray-200 rounded-tl-none border border-gray-800'
              }`}>
                {msg.content}
              </div>
            </div>
          );
        })}
        {isTyping && (
             <div className="flex flex-col items-start">
             <span className="text-[10px] text-gray-500 font-mono mb-1">{t('chat.aiTyping')}</span>
             <div className="bg-gray-800 rounded-lg px-3 py-2 rounded-tl-none">
               <div className="flex gap-1">
                 <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></div>
                 <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-75"></div>
                 <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-150"></div>
               </div>
             </div>
           </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 bg-gray-900/80 border-t border-gray-800">
        <div className="relative">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={t('chat.placeholder')}
            className="w-full bg-black border border-gray-700 text-gray-200 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-primary transition-colors shadow-inner"
          />
          <button 
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-primary transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;