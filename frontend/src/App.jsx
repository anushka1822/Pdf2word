import React, { useState, useEffect } from 'react';
import ChatArea from './components/ChatArea';
import SourcesSidebar from './components/SourcesSidebar';
import StudioSidebar from './components/StudioSidebar';
import BirdseyeModal from './components/BirdseyeModal';
import MindmapModal from './components/MindmapModal';
import API_BASE_URL from './apiConfig';

function App() {
  const [messages, setMessages] = useState([]);
  const [selectedDocs, setSelectedDocs] = useState(() => {
    const saved = localStorage.getItem('pdf2word_selectedDocs');
    return saved ? JSON.parse(saved) : [];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [birdseyeDoc, setBirdseyeDoc] = useState(null);
  const [mindmapDoc, setMindmapDoc] = useState(null);

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
    } else if (uploadedDocs.length === 0 && selectedDocs.length > 0) {
        // If server says zero docs, we clear selection too (once loaded)
        // Only do this if we actually fetched (messages or something to indicate ready)
    }
  }, [uploadedDocs]);

  const clearChatHistory = () => {
    if (window.confirm("Are you sure you want to clear the chat history?")) {
      setMessages([]);
      // Note: In a full app, you'd have a DELETE /chat/history endpoint too.
      // For now, we clear the UI and local device cache.
      localStorage.removeItem('pdf2word_messages');
    }
  };

  return (
    <div className="flex h-screen bg-[#f8f9fa] text-gray-900 font-sans overflow-hidden">
      {/* Sources - Left Column */}
      <SourcesSidebar 
        setIsLoading={setIsLoading} 
        uploadedDocs={uploadedDocs} 
        setUploadedDocs={setUploadedDocs}
        selectedDocs={selectedDocs}
        setSelectedDocs={setSelectedDocs}
        clearChatHistory={clearChatHistory}
      />
      
      {/* Blueprint Chat - Middle Column */}
      <main className="flex-1 flex flex-col relative z-10 overflow-hidden">
        <ChatArea
          messages={messages}
          setMessages={setMessages}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
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

      {isLoading && (
          <div className="fixed inset-0 bg-white/40 backdrop-blur-[2px] z-[100] flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                  <p className="text-sm font-bold text-gray-800 uppercase tracking-widest animate-pulse">Processing...</p>
              </div>
          </div>
      )}
    </div>
  );
}

export default App;
