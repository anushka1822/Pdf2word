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

  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isSidebarLoading, setIsSidebarLoading] = useState(false);
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
    }
  }, [uploadedDocs]);

  const clearChatHistory = async () => {
    if (window.confirm("Are you sure you want to clear the chat history?")) {
      try {
        setIsChatLoading(true);
        const response = await fetch(`${API_BASE_URL}/chat/clear`, {
          method: 'POST',
        });
        if (!response.ok) throw new Error('Failed to clear history on server');
        setMessages([]);
        localStorage.removeItem('pdf2word_messages');
      } catch (error) {
        console.error("Error clearing chat history:", error);
        alert("Failed to clear chat history on server.");
      } finally {
        setIsChatLoading(false);
      }
    }
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
    </div>
  );
}

export default App;
