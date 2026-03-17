import React, { useRef, useEffect } from 'react';
import API_BASE_URL from '../apiConfig';

const SourcesSidebar = ({ isLoading, setIsLoading, uploadedDocs, setUploadedDocs, selectedDocs, setSelectedDocs, clearChatHistory }) => {
    const fileInputRef = useRef(null);

    const fetchDocuments = async (retries = 3, delay = 1000) => {
        try {
            const response = await fetch(`${API_BASE_URL}/documents`);
            if (!response.ok) throw new Error('Failed to fetch');
            const data = await response.json();
            setUploadedDocs(data.documents || []);
        } catch (error) {
            console.error('Error fetching documents:', error);
            if (retries > 0) {
                setTimeout(() => fetchDocuments(retries - 1, delay * 1.5), delay);
            }
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${API_BASE_URL}/upload`, {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Upload failed');
            }
            await fetchDocuments();
            alert('Document uploaded and processed successfully!');
        } catch (error) {
            console.error('Error uploading file:', error);
            alert(`Error uploading file: ${error.message}`);
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const toggleDocSelection = (docName) => {
        setSelectedDocs(prev => 
            prev.includes(docName) 
                ? prev.filter(d => d !== docName) 
                : [...prev, docName]
        );
    };

    const handleDelete = async (e, docName) => {
        e.stopPropagation();
        if (!window.confirm(`Remove "${docName}"?`)) return;

        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/documents/${encodeURIComponent(docName)}`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error('Delete failed');
            
            setSelectedDocs(prev => prev.filter(d => d !== docName));
            await fetchDocuments();
        } catch (error) {
            console.error('Error deleting document:', error);
            alert('Error deleting document.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="sources-sidebar">
            <div className="p-6 pb-4 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800 tracking-tight mb-4">Sources</h2>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all font-medium text-sm"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Sources
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="application/pdf" className="hidden" />
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {isLoading && (
                    <div className="flex items-center gap-3 p-3 mb-2 bg-indigo-50/50 border border-indigo-100 rounded-xl animate-pulse">
                        <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                        <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Processing...</span>
                    </div>
                )}
                {uploadedDocs.length === 0 ? (
                    <div className="text-center py-10 opacity-40">
                        <p className="text-sm font-medium">No sources uploaded</p>
                    </div>
                ) : (
                    uploadedDocs.map((doc, idx) => (
                        <div 
                            key={idx}
                            onClick={() => toggleDocSelection(doc)}
                            className={`group p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                                selectedDocs.includes(doc)
                                    ? 'bg-indigo-50/50 border-indigo-200 shadow-sm'
                                    : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                            }`}
                        >
                            <input 
                                type="checkbox" 
                                checked={selectedDocs.includes(doc)} 
                                readOnly 
                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-semibold truncate ${selectedDocs.includes(doc) ? 'text-indigo-700' : 'text-gray-700'}`}>
                                    {doc}
                                </p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">PDF Document</p>
                            </div>
                            <button 
                                onClick={(e) => handleDelete(e, doc)}
                                className="p-1.5 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    ))
                )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                <button
                    onClick={clearChatHistory}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all text-xs font-bold"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Clear Chat History
                </button>
            </div>
        </div>
    );
};

export default SourcesSidebar;
