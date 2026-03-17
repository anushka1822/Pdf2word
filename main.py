import os
import shutil
import time
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import PromptTemplate

from langchain_pinecone import PineconeVectorStore
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
import tempfile
import logging
from datetime import datetime
from sqlalchemy import create_engine, Column, String, DateTime, Text, JSON, Integer
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

# Load environment variables
load_dotenv()

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Startup Checks
logger.info("Starting application and verifying environment variables...")
logger.info(f"DATABASE_URL present: {'Yes' if os.environ.get('DATABASE_URL') else 'No'}")
logger.info(f"GOOGLE_API_KEY present: {'Yes' if os.environ.get('GOOGLE_API_KEY') else 'No'}")
logger.info(f"PINECONE_API_KEY present: {'Yes' if os.environ.get('PINECONE_API_KEY') else 'No'}")
logger.info(f"PINECONE_INDEX_NAME: {os.environ.get('PINECONE_INDEX_NAME', 'pdf2word')}")

# Database Configuration (Neon PostgreSQL)
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    logger.warning("DATABASE_URL not found in environment variables. Persistence will be disabled.")
    # Fallback to sqlite for local dev if needed, or just handle None
    # engine = create_engine("sqlite:///./test.db") 
    engine = None
else:
    # Neon/Postgres connection with stability settings for serverless environments
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,  # Check connection health before use
        pool_recycle=300     # Refresh connections every 5 minutes
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Models
class DBDocument(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

class DBChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, index=True)
    sender = Column(String) # 'user' or 'ai'
    text = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)
    document_context = Column(JSON, nullable=True) # List of documents queried

# Create tables
if engine:
    Base.metadata.create_all(bind=engine)

def get_db():
    if not engine:
        raise HTTPException(status_code=500, detail="Database engine not initialized. Check your DATABASE_URL.")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Initialize FastAPI app
app = FastAPI(title="RAG Application REST API", description="A FastAPI wrapper for a RAG architecture using Pinecone and Gemini.")

frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:5173")
frontend_url_2 = os.environ.get("FRONTEND_URL_2", "http://127.0.0.1:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        frontend_url,
        frontend_url_2,
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "https://pdf2word-rho.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Configuration Constants
EMBEDDING_MODEL_NAME = "models/gemini-embedding-001" 
GEMINI_MODEL_NAME = "models/gemma-3-27b-it"
PINECONE_INDEX_NAME = os.environ.get("PINECONE_INDEX_NAME", "pdf2word")

# Declare a global variable to cache the vectorstore
_vectorstore = None

from google import genai as google_genai
from langchain_core.embeddings import Embeddings
from langchain_google_genai import ChatGoogleGenerativeAI

# Native dimension of gemini-embedding-001 is 3072
EMBEDDING_DIMENSIONS = 3072

class GenAIEmbeddings(Embeddings):
    def __init__(self):
        self.client = google_genai.Client(api_key=os.environ.get("GOOGLE_API_KEY"))
        self.model = "models/gemini-embedding-001"

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        # Using native 3072 dimensions
        res = self.client.models.embed_content(
            model=self.model,
            contents=texts
        )
        return [list(item.values) for item in res.embeddings]

    def embed_query(self, text: str) -> List[float]:
        # Using native 3072 dimensions
        res = self.client.models.embed_content(
            model=self.model,
            contents=text
        )
        return list(res.embeddings[0].values)

    async def aembed_documents(self, texts: List[str]) -> List[List[float]]:
        return self.embed_documents(texts)

    async def aembed_query(self, text: str) -> List[float]:
        return self.embed_query(text)

embeddings = GenAIEmbeddings()

# STARTUP TEST - confirms actual output dimension
print("--- RUNNING DIMENSION TEST ---", flush=True)
_test_vecs = embeddings.embed_documents(["test1", "test2"])
print(f"--- DIMENSION TEST: Got {len(_test_vecs[0])} dims (target: {EMBEDDING_DIMENSIONS}) ---", flush=True)

# Initialize LLM
llm = ChatGoogleGenerativeAI(model=GEMINI_MODEL_NAME, temperature=0.3)

def get_vectorstore():
    global _vectorstore
    if _vectorstore is None:
        _vectorstore = PineconeVectorStore(
            index_name=PINECONE_INDEX_NAME,
            embedding=embeddings
        )
    return _vectorstore

# Helper for performance logging
def log_performance(message):
    logger.info(message)
    print(message)

class ChatMessage(BaseModel):
    text: str
    sender: str

class ChatRequest(BaseModel):
    question: str
    history: list[ChatMessage] = []
    selected_docs: list[str] = []

class MindMapNode(BaseModel):
    name: str = Field(description="The name or label of the mind map node (1-5 words). For leaf nodes, this should contain the actual content/detail.")
    children: Optional[List['MindMapNode']] = Field(default=None, description="Detailed sub-sections or specific information points. Use this to create a rich hierarchy.")

# Essential for self-referential Pydantic models (Pydantic V2)
MindMapNode.model_rebuild()

@app.get("/documents")
async def get_documents(db: Session = Depends(get_db)):
    try:
        if not engine:
            return {"documents": []}
        
        # Fetch unique document names from Postgres
        docs = db.query(DBDocument).order_by(DBDocument.uploaded_at.desc()).all()
        return {"documents": [doc.name for doc in docs]}
    except Exception as e:
        logger.error(f"Error fetching documents from DB: {e}")
        # Fallback to empty list or handle error
        return {"documents": []}

@app.post("/documents/delete/{filename}")
async def delete_document(filename: str, db: Session = Depends(get_db)):
    try:
        logger.info(f"--- DELETE DOCUMENT TRIGGERED --- Filename: {filename}")
        vectorstore = get_vectorstore()
        
        # Pinecone allows deletion by metadata filter
        logger.info(f"Attempting to delete from Pinecone: {filename}")
        vectorstore.delete(filter={"source_name": filename})
        logger.info(f"Pinecone deletion call finished for {filename}")
        
        # Delete from Postgres
        if engine:
            logger.info(f"Attempting to delete from DB: {filename}")
            db_doc = db.query(DBDocument).filter(DBDocument.name == filename).first()
            if db_doc:
                db.delete(db_doc)
                db.commit()
                logger.info(f"Successfully deleted {filename} from DB.")
            else:
                logger.warning(f"Document {filename} not found in DB, but continuing.")
                
        return {"status": "success", "message": f"Deleted {filename} and its associated vector data."}
            
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"Error deleting document: {error_details}")
        raise HTTPException(status_code=500, detail=f"Error deleting document: {str(e)}")
@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File must be a PDF")

    # Save PDF temporarily to disk
    # Use /tmp for Linux/Render/Vercel compatibility
    suffix = f"_{int(time.time())}.pdf"
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
            tmp_path = tmp_file.name
            shutil.copyfileobj(file.file, tmp_file)
            tmp_file.flush() # Ensure it's written

            # Load the PDF
            from langchain_community.document_loaders import PyPDFLoader
            loader = PyPDFLoader(tmp_path)
            documents = loader.load()

            # Split the text
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000,
                chunk_overlap=200
            )
            chunks = text_splitter.split_documents(documents)

            # Embed and store chunks into Pinecone
            vectorstore = get_vectorstore()
            
            # Step 1: Prevent Duplication - Delete existing vectors for this filename
            # This ensures re-uploads replace the old data instead of stacking it
            try:
                vectorstore.delete(filter={"source_name": file.filename})
                logger.info(f"Cleared existing vectors for {file.filename} before re-upload.")
            except Exception as e:
                logger.warning(f"Could not clear existing vectors for {file.filename}: {e}")

            # Add metadata to identify the source file correctly for Pinecone
            logger.info(f"Adding {len(chunks)} chunks to Pinecone for {file.filename}")
            
            for i, chunk in enumerate(chunks):
                chunk.metadata["source_name"] = file.filename
                if i == 0:
                    logger.info(f"Sample metadata for first chunk: {chunk.metadata}")
            
            vectorstore.add_documents(chunks)
            logger.info(f"Successfully added documents for {file.filename} to Pinecone.")
            
            # Save metadata to Postgres
            if engine:
                # Check if exists
                existing_doc = db.query(DBDocument).filter(DBDocument.name == file.filename).first()
                if not existing_doc:
                    db_doc = DBDocument(name=file.filename)
                    db.add(db_doc)
                    db.commit()
            
            return {
                "status": "success",
                "chunks_added": len(chunks)
            }

    except Exception as e:
        import traceback
        traceback.print_exc()
        logger.error(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")
    
    finally:
        # Clean up the temporary file
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)

@app.post("/chat")
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    question = request.question
    
    try:
        # Save user message to Postgres
        if engine:
            user_msg = DBChatMessage(sender="user", text=question, document_context=request.selected_docs)
            db.add(user_msg)
            db.commit()

        vectorstore = get_vectorstore()
        
        # ... (rest of logic remains same for retrieval)
        if request.selected_docs:
            if len(request.selected_docs) == 1:
                filter_dict = {"source_name": request.selected_docs[0]}
            else:
                filter_dict = {"source_name": {"$in": request.selected_docs}}
            docs = vectorstore.similarity_search(question, k=15, filter=filter_dict)
        else:
            docs = vectorstore.similarity_search(question, k=15)

        # Group context chunks by source_name to prevent AI confusion
        grouped_context = {}
        seen_contents = set()
        
        for doc in docs:
            # Simple deduplication within the k=15 results
            content_snippet = doc.page_content.strip()
            if content_snippet in seen_contents:
                continue
            seen_contents.add(content_snippet)
            
            source = doc.metadata.get('source_name', 'Unknown Source')
            if source not in grouped_context:
                grouped_context[source] = []
            grouped_context[source].append(doc.page_content)

        # Build a structured, professional context string
        context_parts = []
        for source, items in grouped_context.items():
            combined_items = "\n\n".join(items)
            context_parts.append(f"### DOCUMENT SOURCE: {source}\n{combined_items}")
        
        context = "\n\n---\n\n".join(context_parts) if context_parts else "No relevant information found in the selected documents."
        
        from langchain_core.messages import HumanMessage, AIMessage
        
        system_prompt = (
            "You are a sophisticated AI document assistant, similar in personality and capability to ChatGPT or Gemini. "
            "Your persona is highly intelligent, conversational, and helpful. "
            "\n\nCORE INSTRUCTIONS:"
            "\n1. SOURCE OF TRUTH: Use the 'Retrieved Document Context' as your primary knowledge source. If the answer is in the documents, stay faithful to the facts provided."
            "\n2. SUMMARIES & ANALYSES: When asked for summaries, don't just list facts. Provide a cohesive, well-structured, and insightful overview of the content."
            "\n3. NATURAL CONVERSATION: Greet users warmly, acknowledge their requests, and feel free to use conversational transitions. Avoid being robotic or overly brief unless specifically asked."
            "\n4. HANDLE GAPS GRACEFULLY: If the provided context doesn't contain a specific answer, explain what you *can* find in the documents that might be related, or offer suggestions on what the user might look for."
            "\n5. PROFESSIONAL & POLITE: Maintain a friendly, supportive, and professional tone at all times."
        )
        
        messages = []
        # Gemma 3 doesn't support SystemMessage yet, so we use HumanMessage for instructions
        messages.append(HumanMessage(content=f"SYSTEM INSTRUCTIONS:\n{system_prompt}"))
        messages.append(HumanMessage(content=f"Retrieved Document Context:\n{context}"))
        
        for msg in request.history:
            if msg.sender == "user":
                messages.append(HumanMessage(content=msg.text))
            else:
                messages.append(AIMessage(content=msg.text))
        
        messages.append(HumanMessage(content=question))
        response = llm.invoke(messages)
        answer = response.content

        # Save AI message to Postgres
        if engine:
            ai_msg = DBChatMessage(sender="ai", text=answer, document_context=request.selected_docs)
            db.add(ai_msg)
            db.commit()

        return {"answer": answer}
 
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error(f"Error processing question: {traceback.format_exc()}")
        # Check if it's a rate limit error (often contains '429' or 'quota')
        if "429" in str(e) or "quota" in str(e).lower():
            raise HTTPException(
                status_code=429, 
                detail="The AI is currently busy (Rate Limit). Please wait a few seconds and try again."
            )
        raise HTTPException(status_code=500, detail=f"Error processing question: {str(e)}")

@app.get("/birdseye/{filename}")
async def get_birdseye_view(filename: str):
    try:
        vectorstore = get_vectorstore()
        # Pinecone uses 'similarity_search' with a filter
        results = vectorstore.similarity_search(" ", k=50, filter={"source_name": filename})
        
        if not results:
            raise HTTPException(status_code=404, detail=f"Document {filename} not found or has no content.")
            
        # Combine chunks
        all_text = "\n\n".join([doc.page_content for doc in results])
        
        system_prompt = (
            "You are an expert document analyst. Your task is to provide a 'Bird's-Eye View' of the provided document text."
            "\n\nFormat your response in structured Markdown with the following sections:"
            "\n1. # Summary: A concise 1 paragraph overview of the document."
            "\n2. # Key Insights: A bulleted list of the most important points or findings."
            "\n3. # FAQ: 5 common questions and answers that someone reading this document might have."
            "\n4. # Core Topics: A list of the main subjects covered."
            
            "\n\nBe professional, accurate, and focus only on the provided text."
        )
        
        messages = [
            HumanMessage(content=f"System Instructions: {system_prompt}"),
            HumanMessage(content=f"Document Text:\n{all_text}"),
            HumanMessage(content="Generate the Bird's-Eye View overview now.")
        ]
        
        # Use a slightly higher temperature for synthesis
        response = llm.invoke(messages)
        
        return {"birdseye": response.content}
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error(f"Error generating Bird's-Eye View: {traceback.format_exc()}")
        if "429" in str(e) or "quota" in str(e).lower():
            raise HTTPException(status_code=429, detail="AI is busy. Please try again in a moment.")
        raise HTTPException(status_code=500, detail=f"Error generating Bird's-Eye View: {str(e)}")

@app.get("/mindmap/{filename}")
async def get_mindmap(filename: str):
    logging.info(f"Generating optimized substance-first mindmap for: {filename}")
    try:
        vectorstore = get_vectorstore()
        # Balanced retrieval for speed and substance
        logger.info(f"Searching Pinecone for {filename} with filter...")
        results = vectorstore.similarity_search(" ", k=40, filter={"source_name": filename})
        logger.info(f"Search returned {len(results)} results for {filename}")
        
        if not results:
            # Try a search without filter to see if ANYTHING is in the index
            total_results = vectorstore.similarity_search(" ", k=1)
            logger.info(f"Diagnostic: Search without filter returned {len(total_results)} results total in index.")
            raise HTTPException(status_code=404, detail=f"Document {filename} not found or has no content in vector store.")
            
        all_text = "\n\n".join([doc.page_content for doc in results])
        
        # STEP 1: SUBSTANTIVE EXTRACTION
        extraction_prompt = (
            "You are a critical document analyst. Extract 15-20 highly significant technical, functional, or strategic facts from the text below. "
            "Focus on 'Hard Data' and 'Core Concepts'. Avoid administrative boilerplate. "
            "Output ONLY the bulleted list. Each bullet must be 2-5 words. Be precise and substantive.\n\n"
            f"Document Text:\n{all_text}"
        )
        
        extraction_response = llm.invoke([HumanMessage(content=extraction_prompt)])
        extracted_facts = extraction_response.content.strip()
        
        # STEP 2: BALANCED STRUCTURING
        parser = JsonOutputParser(pydantic_object=MindMapNode)
        format_instructions = parser.get_format_instructions()
        
        structuring_prompt = (
            "You are a professional information architect. Transform the following facts into a high-density, balanced mind map JSON object.\n\n"
            f"{format_instructions}\n\n"
            "STRICT ARCHITECTURAL RULES:\n"
            "1. NO VAGUENESS: Use the specific facts provided. If a fact is about 'AES-256 Encryption', use exactly that phrase.\n"
            "2. DEPTH & BREVITY: Max 3 levels deep. Every node must be 2-5 words. No long sentences.\n"
            "3. COMPREHENSIVE COVERAGE: Ensure major document sections (e.g., Security, Architecture, Compliance) are represented as root themes.\n"
            "4. CLEAN HIERARCHY: Group related details logically. Ensure the tree feels balanced and professional.\n\n"
            f"Extracted Facts:\n{extracted_facts}"
        )
        
        try:
            structuring_response = llm.invoke([HumanMessage(content=structuring_prompt)])
            hierarchy = parser.parse(structuring_response.content)
            return hierarchy
        except Exception as e:
            logger.error(f"Error parsing mind map logic: {e}")
            raise HTTPException(status_code=500, detail="Failed to structure the mind map. Please try again.")
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error(f"Error generating Mind Map: {traceback.format_exc()}")
        if "429" in str(e) or "quota" in str(e).lower():
            raise HTTPException(status_code=429, detail="AI is busy. Please try again.")
        raise HTTPException(status_code=500, detail=f"Error generating Mind Map: {str(e)}")

@app.get("/chat/history")
async def get_chat_history(db: Session = Depends(get_db)):
    try:
        if not engine:
            return {"history": []}
        
        messages = db.query(DBChatMessage).order_by(DBChatMessage.timestamp.asc()).all()
        return {
            "history": [
                {"sender": msg.sender, "text": msg.text} for msg in messages
            ]
        }
    except Exception as e:
        logger.error(f"Error fetching chat history: {e}")
        return {"history": []}

@app.post("/chat/clear")
async def delete_chat_history(db: Session = Depends(get_db)):
    try:
        logger.info("--- CLEAR CHAT HISTORY TRIGGERED ---")
        if not engine:
            logger.error("Database engine not initialized during clear request.")
            raise HTTPException(status_code=500, detail="Database engine not initialized.")
        
        # Clear all messages from the database
        logger.info("Deleteting all messages from DBChatMessage table...")
        rows_deleted = db.query(DBChatMessage).delete()
        db.commit()
        logger.info(f"Successfully cleared {rows_deleted} messages from DB.")
        return {"status": "success", "message": f"Chat history cleared successfully ({rows_deleted} messages removed)."}
    except Exception as e:
        logger.error(f"Error clearing chat history: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error clearing chat history: {str(e)}")

# Run the app with: uvicorn main:app --reload
