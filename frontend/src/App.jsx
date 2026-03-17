import React, { useState, useEffect } from 'react';
import ChatArea from './components/ChatArea';
import SourcesSidebar from './components/SourcesSidebar';
import StudioSidebar from './components/StudioSidebar';
import BirdseyeModal from './components/BirdseyeModal';
import MindmapModal from './components/MindmapModal';
import Toast from './components/Toast';
import ConfirmationModal from './components/ConfirmationModal';
import API_BASE_URL from './apiConfig';

function App() {
  console.log("--- APP INITIALIZED: CORE VERSION 2.0 ---");
  console.log("API BASE URL IS:", API_BASE_URL);
  
  const [messages, setMessages] = useState([]);
  const [selectedDocs, setSelectedDocs] = useState(() => {
    const saved = localStorage.getItem('pdf2word_selectedDocs');
    return saved ? JSON.parse(saved) : [];
  });

  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isSidebarLoading, setIsSidebarLoading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [birdseyeDoc, setBirdseyeDoc] = useState(null);
  const [mindmapDoc, setMindmapDoc] = useState(null);

  // Toast State
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'info') => setToast({ message, type });

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, onConfirm: () => {}, title: '', message: '' });
  const openConfirm = (title, message, onConfirm) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
    }});
  };

  // Fetch initial history from Server
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/chat/history`);
        if (!response.ok) throw new Error('History fetch failed');
        const data = await response.json();
        if (data.history) setMessages(data.history);
      } catch (error) {
        console.error("Error fetching history:", error);
      }
    };
    fetchHistory();
  }, []);

  // Sync selected docs to localStorage (local device preference)
  useEffect(() => {
    localStorage.setItem('pdf2word_selectedDocs', JSON.stringify(selectedDocs));
  }, [selectedDocs]);

  // Clean up selected docs that are no longer present on the server
  useEffect(() => {
    if (uploadedDocs.length > 0) {
      const validDocs = selectedDocs.filter(doc => uploadedDocs.includes(doc));
      if (validDocs.length !== selectedDocs.length) {
        setSelectedDocs(validDocs);
      }
    }
  }, [uploadedDocs]);

  const clearChatHistory = async () => {
    openConfirm(
        "Clear History?",
        "This will permanently delete all messages in this conversation. This action cannot be undone.",
        async () => {
            try {
                setIsChatLoading(true);
                const url = `${API_BASE_URL}/chat/clear`;
                console.log("Attempting to clear chat history. URL:", url);
                const response = await fetch(url, {
                    method: 'POST',
                });
                console.log("Clear history response status:", response.status);
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Failed to clear history on server (Status ${response.status}): ${errorText}`);
                }
                setMessages([]);
                localStorage.removeItem('pdf2word_messages');
                showToast("Chat history cleared!", "success");
            } catch (error) {
                console.error("Error clearing chat history:", error);
                showToast(`Failed to clear history: ${error.message}`, "error");
            } finally {
                setIsChatLoading(false);
            }
        }
    );
  };

  return (
    <div className="flex h-screen bg-[#f8f9fa] text-gray-900 font-sans overflow-hidden">
      {/* Sources - Left Column */}
      <SourcesSidebar 
        isLoading={isSidebarLoading}
        setIsLoading={setIsSidebarLoading} 
        uploadedDocs={uploadedDocs} 
        setUploadedDocs={setUploadedDocs}
        selectedDocs={selectedDocs}
        setSelectedDocs={setSelectedDocs}
        clearChatHistory={clearChatHistory}
        showToast={showToast}
        openConfirm={openConfirm}
      />
      
      {/* Studio Chat - Middle Column */}
      <main className="flex-1 flex flex-col relative z-10 overflow-hidden">
        <ChatArea
          messages={messages}
          setMessages={setMessages}
          isLoading={isChatLoading}
          setIsLoading={setIsChatLoading}
          selectedDocs={selectedDocs}
        />
      </main>

      {/* Studio - Right Column */}
      <StudioSidebar 
        selectedDocs={selectedDocs}
        onShowBirdseye={setBirdseyeDoc}
        onShowMindmap={setMindmapDoc}
      />

      {/* Modals */}
      {birdseyeDoc && (
        <BirdseyeModal 
          docName={birdseyeDoc} 
          onClose={() => setBirdseyeDoc(null)} 
        />
      )}

      {mindmapDoc && (
        <MindmapModal 
          docName={mindmapDoc} 
          onClose={() => setMindmapDoc(null)} 
        />
      )}

      {/* Global UI Components */}
      {toast && (
        <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
        />
      )}

      <ConfirmationModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

export default App;
