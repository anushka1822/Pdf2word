import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../apiConfig';
import ReactMarkdown from 'react-markdown';

const BirdseyeModal = ({ docName, onClose }) => {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchBirdseye = async () => {
            setLoading(true);
            try {
                const response = await fetch(`${API_BASE_URL}/birdseye/${encodeURIComponent(docName)}`);
                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.detail || 'Failed to fetch overview');
                }
                const data = await response.json();
                setContent(data.birdseye);
            } catch (err) {
                console.error('Error fetching Bird\'s-Eye View:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (docName) {
            fetchBirdseye();
        }
    }, [docName]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-indigo-950/20 backdrop-blur-md transition-all duration-500 animate-in fade-in">
            <div 
                className="bg-white border border-white/40 rounded-3xl w-full max-w-5xl max-h-[85vh] flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden animate-in slide-in-from-bottom-8 duration-500"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 premium-gradient rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Bird's-Eye View</h2>
                            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mt-0.5 flex items-center gap-2">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                {docName}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-3 hover:bg-gray-50 rounded-2xl text-gray-400 hover:text-indigo-600 transition-all border border-transparent hover:border-gray-100"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-10 md:p-14 custom-scrollbar bg-white">
                    {loading ? (
                        <div className="h-96 flex flex-col items-center justify-center space-y-6">
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-indigo-100 rounded-full animate-spin"></div>
                                <div className="absolute inset-0 border-t-4 border-indigo-600 rounded-full animate-spin"></div>
                            </div>
                            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs animate-pulse">Analyzing with Advanced Intelligence...</p>
                        </div>
                    ) : error ? (
                        <div className="h-96 flex flex-col items-center justify-center text-center p-6">
                            <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-red-100/50">
                                <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">Review Required</h3>
                            <p className="text-gray-500 mt-2 max-w-sm text-lg font-medium">{error}</p>
                            <button 
                                onClick={onClose}
                                className="mt-8 px-8 py-3 bg-gray-50 hover:bg-white text-gray-700 font-bold rounded-xl transition-all border border-gray-200 shadow-sm"
                            >
                                Back to Chat
                            </button>
                        </div>
                    ) : (
                        <div className="prose prose-indigo max-w-none 
                            prose-headings:text-gray-900 prose-headings:font-bold prose-headings:tracking-tight 
                            prose-p:text-gray-700 prose-p:text-xl prose-p:leading-relaxed prose-p:font-medium
                            prose-li:text-gray-700 prose-li:text-xl prose-li:font-medium
                            prose-strong:text-indigo-600 prose-strong:font-bold
                            prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl
                            prose-blockquote:border-indigo-200 prose-blockquote:bg-indigo-50/50 prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:rounded-r-2xl">
                            <ReactMarkdown>{content}</ReactMarkdown>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-6 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Grounded AI Analysis • Synthesis Engine v2.0</p>
                    <button 
                        onClick={onClose}
                        className="px-8 py-3 premium-gradient text-white rounded-2xl font-bold text-sm transition-all shadow-xl shadow-indigo-600/20 hover:scale-[1.05] active:scale-95"
                    >
                        Finish Review
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BirdseyeModal;
