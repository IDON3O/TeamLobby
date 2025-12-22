
import React, { useState, useEffect, useRef } from 'react';
import { Message, User } from '../types';
import { Send, Bot, ShieldInfo } from 'lucide-react';
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
    if (text.toLowerCase().includes('@bot') || Math.random() > 0.85) {
        setIsTyping(true);
        try {
            const reply = await generateBotChat(text, "Users are discussing games to play in the squad lobby.");
            setTimeout(() => {
                onReceiveMessage({
                    id: `bot-${Date.now()}`,
                    userId: 'bot',
                    userName: 'Co-op Bot',
                    content: reply,
                    timestamp: Date.now(),
                    isSystem: false
                });
                setIsTyping(false);
            }, 1200);
        } catch (err) {
            setIsTyping(false);
        }
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface/40 backdrop-blur-md">
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {/* WELCOME SYSTEM MESSAGE - ALWAYS PRESENT */}
        <div className="flex flex-col items-center justify-center py-4 px-6 mb-8 border border-primary/20 bg-primary/5 rounded-[2rem] text-center space-y-3">
            <div className="bg-primary/20 p-3 rounded-full">
                <Bot size={24} className="text-primary"/>
            </div>
            <div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Squad Communications Hub</h4>
                <p className="text-[11px] text-gray-400 font-bold mt-2 leading-relaxed italic">
                    "Welcome to the lobby! Use this channel to coordinate picks. Add games from the library or suggest your own. Tag <span className="text-primary">@bot</span> for suggestions!"
                </p>
            </div>
        </div>

        {messages.map((msg) => {
          const isMe = msg.userId === currentUser.id;
          const isBot = msg.userId === 'bot';
          const isSystem = msg.isSystem;
          
          if (isSystem) return (
            <div key={msg.id} className="flex justify-center">
              <span className="text-[9px] font-black text-gray-500 bg-black/40 px-4 py-1.5 rounded-full border border-gray-800 uppercase tracking-widest">{msg.content}</span>
            </div>
          );

          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-2 mb-1.5 px-1">
                 {isBot && <Bot size={10} className="text-primary" />}
                 <span className={`text-[9px] font-black uppercase tracking-widest ${isBot ? 'text-primary' : 'text-gray-500'}`}>{msg.userName}</span>
              </div>
              <div className={`max-w-[85%] rounded-[1.3rem] px-4 py-3 text-xs leading-relaxed shadow-lg transition-all ${
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
             <div className="flex flex-col items-start animate-pulse">
               <span className="text-[9px] text-primary font-black mb-1.5 uppercase tracking-widest">Co-op Bot is thinking...</span>
               <div className="bg-gray-900 border border-primary/20 rounded-2xl px-4 py-3 rounded-tl-none">
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

      <form onSubmit={handleSend} className="p-6 bg-gray-900/90 border-t border-gray-800 backdrop-blur-2xl">
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
            disabled={!inputText.trim()}
            className={`absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-xl transition-all shadow-lg active:scale-90 ${inputText.trim() ? 'bg-primary text-white hover:bg-violet-600' : 'text-gray-600 cursor-not-allowed'}`}
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;
