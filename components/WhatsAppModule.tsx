import React, { useState } from 'react';
import { Send, Phone, Video, Search, MoreVertical, Paperclip, Smile } from 'lucide-react';
import { Contact, ChatMessage } from '../types';

export const WhatsAppModule: React.FC = () => {
  const [activeContact, setActiveContact] = useState<string>('1');
  
  const contacts: Contact[] = [
    { id: '1', name: 'Tech Solutions (João)', lastMessage: 'Obrigado pela nota fiscal!', avatar: 'TS', unread: 0 },
    { id: '2', name: 'Mercado Silva', lastMessage: 'Preciso da guia do simples.', avatar: 'MS', unread: 2 },
    { id: '3', name: 'Dra. Ana Paula', lastMessage: 'Pode confirmar o recebimento?', avatar: 'AP', unread: 0 },
  ];

  const messages: ChatMessage[] = [
    { id: '1', sender: 'contact', text: 'Bom dia! Vocês já emitiram a nota deste mês?', timestamp: '09:00' },
    { id: '2', sender: 'user', text: 'Bom dia, João! Sim, já foi emitida e enviada por e-mail.', timestamp: '09:05' },
    { id: '3', sender: 'contact', text: 'Obrigado pela nota fiscal!', timestamp: '09:10' },
  ];

  return (
    <div className="h-full flex bg-white dark:bg-slate-800 overflow-hidden border-t border-gray-200 dark:border-slate-700">
      {/* Sidebar List */}
      <div className="w-full md:w-80 border-r border-gray-200 dark:border-slate-700 flex flex-col bg-white dark:bg-slate-900">
        <div className="p-4 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Buscar conversa..." 
              className="w-full bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
            />
            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {contacts.map(contact => (
            <div 
              key={contact.id}
              onClick={() => setActiveContact(contact.id)}
              className={`p-4 flex gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors border-b border-gray-100 dark:border-slate-800 ${activeContact === contact.id ? 'bg-primary-50 dark:bg-slate-800' : ''}`}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                {contact.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{contact.name}</h4>
                  <span className="text-xs text-gray-500">09:10</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{contact.lastMessage}</p>
              </div>
              {contact.unread > 0 && (
                <div className="flex flex-col justify-center">
                  <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                    {contact.unread}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="hidden md:flex flex-1 flex-col bg-[#efeae2] dark:bg-slate-900 relative">
        <div className="absolute inset-0 opacity-10 dark:opacity-5 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] pointer-events-none"></div>
        
        {/* Chat Header */}
        <div className="bg-gray-50 dark:bg-slate-800 p-3 px-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
             <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                TS
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Tech Solutions (João)</h3>
                <p className="text-xs text-green-600 dark:text-green-400">Online</p>
              </div>
          </div>
          <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400">
            <Search size={20} className="cursor-pointer hover:text-gray-700" />
            <Phone size={20} className="cursor-pointer hover:text-gray-700" />
            <Video size={20} className="cursor-pointer hover:text-gray-700" />
            <MoreVertical size={20} className="cursor-pointer hover:text-gray-700" />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 z-10">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] rounded-lg p-3 relative shadow-sm ${
                msg.sender === 'user' 
                  ? 'bg-primary-500 text-white rounded-tr-none' 
                  : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 rounded-tl-none'
              }`}>
                <p className="text-sm">{msg.text}</p>
                <span className={`text-[10px] absolute bottom-1 right-2 ${msg.sender === 'user' ? 'text-primary-100' : 'text-gray-400'}`}>
                  {msg.timestamp}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="p-3 bg-gray-50 dark:bg-slate-800 z-10">
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full">
              <Smile size={24} />
            </button>
            <button className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full">
              <Paperclip size={24} />
            </button>
            <input 
              type="text" 
              placeholder="Digite uma mensagem..." 
              className="flex-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary-500 dark:text-white"
            />
            <button className="p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 shadow-md">
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};