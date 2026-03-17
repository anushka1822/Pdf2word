import React, { useRef, useEffect, useState } from 'react';
import API_BASE_URL from '../apiConfig';

const ChatMessage = ({ message }) => {
    const isUser = message.sender === 'user';
    return (
        <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-8 px-4 animate-slide-in`}>
            <div
                className={`max-w-[85%] md:max-w-[80%] px-6 py-4 transition-all duration-300 ${isUser
                    ? 'bg-indigo-50/80 text-gray-800 border border-indigo-100 rounded-2xl shadow-sm'
                    : 'bg-white text-gray-800 border border-gray-100 rounded-2xl shadow-sm'
                    }`}
            >
                {!isUser && (
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-5 h-5 rounded-md premium-gradient flex items-center justify-center text-[10px] font-bold text-white">
                            AI
                        </div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Assistant</span>
                    </div>
                )}
                <div className="text-base md:text-lg leading-relaxed whitespace-pre-wrap font-medium text-gray-800">
                    {message.text}
                </div>
            </div>
        </div>
    );
};

const ChatArea = ({ messages, setMessages, isLoading, setIsLoading, selectedDocs }) => {
    const [inputVal, setInputVal] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleSend = async (e) => {
        e.preventDefault();
        const text = inputVal.trim();
        if (!text) return;

        const userMsg = { text: text, sender: 'user' };
        setMessages(prev => [...prev, userMsg]);
        setInputVal('');
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    question: text,
                    history: messages,
                    selected_docs: selectedDocs
                }),
            });

            if (!response.ok) throw new Error('Chat request failed');

            const data = await response.json();
            const aiMsg = { text: data.answer || "Sorry, I couldn't process that.", sender: 'ai' };
            setMessages(prev => [...prev, aiMsg]);

        } catch (error) {
            console.error("Chat error:", error);
            setMessages(prev => [...prev, { text: "Network Error: Please check your connection.", sender: 'ai' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col w-full h-full relative bg-[#f8f9fa] overflow-hidden">
            {/* Header / Source Info */}
            <div className="px-10 py-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em]">AI Studio</h2>
                    <div className="h-4 w-[1px] bg-gray-200"></div>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        {selectedDocs.length} {selectedDocs.length === 1 ? 'source' : 'sources'}
                    </span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="document-page min-h-[calc(100%-48px)] flex flex-col">
                    <div className="p-10 pb-4">
                        <h1 className="text-4xl font-bold text-gray-800 tracking-tight mb-2">Workspace</h1>
                        {selectedDocs.length > 0 && (
                            <p className="text-sm text-gray-500 font-medium italic">
                                Using: {selectedDocs.join(', ')}
                            </p>
                        )}
                        <div className="h-[2px] w-12 premium-gradient mt-6 rounded-full"></div>
                    </div>

                    <div className="flex-1 p-6 md:p-10 space-y-2">
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center py-20">
                                <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-6 border border-gray-100">
                                    <svg className="w-8 h-8 text-indigo-500 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                </div>
                                <h3 className="font-bold text-xl text-gray-800">Your AI Assistant</h3>
                                <p className="text-gray-500 mt-2 max-w-sm text-sm">Your conversation and findings will be preserved here as a digital document.</p>
                            </div>
                        ) : (
                            messages.map((msg, idx) => <ChatMessage key={idx} message={msg} />)
                        )}

                        {isLoading && (
                            <div className="flex w-full justify-start mb-8 px-4">
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-md premium-gradient flex items-center justify-center text-[10px] font-bold text-white">AI</div>
                                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest animate-pulse">Thinking...</span>
                                    </div>
                                    <div className="px-6 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm flex items-center gap-2 w-fit">
                                       <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"></div>
                                       <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                       <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>
            </div>

            {/* Floating Input Area */}
            <div className="p-8 pb-10">
                <form onSubmit={handleSend} className="relative max-w-3xl mx-auto">
                    <div className="relative group">
                        <input
                            type="text"
                            value={inputVal}
                            onChange={(e) => setInputVal(e.target.value)}
                            disabled={isLoading}
                            placeholder="Type to chat with your sources..."
                            className="w-full bg-white text-gray-800 placeholder-gray-400 border border-gray-200 rounded-[32px] pl-8 pr-20 py-5 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all shadow-xl shadow-gray-200/50 disabled:opacity-50 text-base font-semibold"
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !inputVal.trim()}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-3 rounded-full bg-gray-900 text-white hover:bg-gray-800 active:scale-95 disabled:opacity-20 transition-all shadow-lg"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </button>
                    </div>
                </form>
                <p className="text-center text-[10px] font-bold text-gray-300 uppercase tracking-widest mt-4">
                    Document-Grounded Intelligence
                </p>
            </div>
        </div>
    );
};

export default ChatArea;
