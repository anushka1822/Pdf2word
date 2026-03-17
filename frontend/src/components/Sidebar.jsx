import React, { useRef, useEffect } from 'react';
import API_BASE_URL from '../apiConfig';

const Sidebar = ({ setIsLoading, uploadedDocs, setUploadedDocs, selectedDocs, setSelectedDocs, clearChatHistory, onShowBirdseye, onShowMindmap, showToast, openConfirm }) => {
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
                console.log(`Retrying document fetch... (${retries} attempts left)`);
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
                throw new Error('Upload failed');
            }

            const data = await response.json();
            console.log('Upload success:', data);
            showToast('File uploaded and processed successfully!', 'success');
            fetchDocuments(); // Refresh list

        } catch (error) {
            console.error('Error uploading file:', error);
            showToast('Error uploading file. Please try again.', 'error');
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
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
        openConfirm(
            "Remove Document?",
            `Are you sure you want to remove "${docName}"?`,
            async () => {
                setIsLoading(true);
                try {
                    const response = await fetch(`${API_BASE_URL}/documents/delete/${encodeURIComponent(docName)}`, {
                        method: 'POST',
                    });

                    if (!response.ok) throw new Error('Delete failed');

                    showToast('Document removed successfully.', 'success');
                    setSelectedDocs(prev => prev.filter(d => d !== docName));
                    fetchDocuments();
                } catch (error) {
                    console.error('Error deleting document:', error);
                    showToast('Failed to remove document.', 'error');
                } finally {
                    setIsLoading(false);
                }
            }
        );
    };

    return (
        <div className="w-80 glass-dark border-r border-white/10 h-full p-6 flex flex-col z-20">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 premium-gradient rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">PDF2Word</h1>
                </div>
                <p className="text-sm text-gray-400 font-medium ml-1">Contextual AI Assistant</p>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-2">
                <div>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 premium-gradient text-white rounded-xl transition-all font-semibold shadow-lg shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Upload Document
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="application/pdf"
                        className="hidden"
                    />
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Library</p>
                        <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full border border-white/5">{uploadedDocs.length}</span>
                    </div>
                    
                    <div className="space-y-2">
                        {uploadedDocs.length === 0 ? (
                            <div className="text-center py-8 px-4 border border-dashed border-white/10 rounded-2xl bg-white/5">
                                <p className="text-sm text-gray-500 italic">No documents yet.</p>
                            </div>
                        ) : (
                            uploadedDocs.map((doc, idx) => (
                                <div 
                                    key={idx} 
                                    className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 border animate-slide-in ${
                                        selectedDocs.includes(doc) 
                                            ? 'bg-indigo-500/10 border-indigo-500/50 shadow-inner' 
                                            : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                                    }`}
                                    onClick={() => toggleDocSelection(doc)}
                                    style={{ animationDelay: `${idx * 50}ms` }}
                                >
                                    <div className={`w-2 h-2 rounded-full shrink-0 transition-all ${selectedDocs.includes(doc) ? 'bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.6)]' : 'bg-gray-600'}`} />
                                    <span className={`text-sm font-medium truncate flex-1 ${selectedDocs.includes(doc) ? 'text-indigo-200' : 'text-gray-300'}`} title={doc}>
                                        {doc}
                                    </span>
                                    
                                    <button 
                                        onClick={(e) => handleDelete(e, doc)}
                                        className="p-1.5 hover:bg-red-500/20 hover:text-red-400 text-gray-500 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        title="Remove"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Selected Document Actions */}
                {selectedDocs.length > 0 && (
                    <div className="pt-4 border-t border-white/10 space-y-3">
                         <p className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Selected Actions</p>
                         <div className="grid grid-cols-2 gap-2">
                             <button 
                                onClick={() => onShowBirdseye(selectedDocs[0])}
                                className="flex flex-col items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all group"
                             >
                                <svg className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Bird's-Eye</span>
                             </button>
                             <button 
                                onClick={() => onShowMindmap(selectedDocs[0])}
                                className="flex flex-col items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all group"
                             >
                                <svg className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Mind Map</span>
                             </button>
                         </div>
                         {selectedDocs.length > 1 && (
                             <p className="text-[10px] text-gray-500 text-center italic">Actions are available for the first selected document only</p>
                         )}
                    </div>
                )}
            </div>

            <div className="mt-auto pt-6 space-y-4">
                <button
                    onClick={clearChatHistory}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-transparent hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-lg transition-all text-xs font-semibold border border-transparent hover:border-red-500/20"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Clear All Chat History
                </button>

                <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="w-10 h-10 rounded-full premium-gradient shrink-0 flex items-center justify-center text-sm font-bold shadow-lg shadow-indigo-500/20 text-white">
                        U
                    </div>
                    <div className="text-sm truncate">
                        <p className="font-bold text-gray-200">Local User</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Workspace</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
