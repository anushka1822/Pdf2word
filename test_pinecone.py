import os
from dotenv import load_dotenv
from typing import List
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_core.embeddings import Embeddings

load_dotenv()

EMBEDDING_MODEL_NAME = "models/gemini-embedding-001"

class TruncatedEmbeddings(Embeddings):
    def __init__(self, model_name: str):
        self._base = GoogleGenerativeAIEmbeddings(model=model_name)
        
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        full_embeddings = self._base.embed_documents(texts)
        truncated = [e[:768] for e in full_embeddings]
        return truncated
        
    def embed_query(self, text: str) -> List[float]:
        full_embedding = self._base.embed_query(text)
        truncated = full_embedding[:768]
        return truncated

print("Testing TruncatedEmbeddings...")
embeddings = TruncatedEmbeddings(model_name=EMBEDDING_MODEL_NAME)

test_query = "Hello world"
vec = embeddings.embed_query(test_query)
print(f"Query vector dimension: {len(vec)}")

test_docs = ["Document 1", "Document 2"]
vecs = embeddings.embed_documents(test_docs)
print(f"Documents vector dimension: {[len(v) for v in vecs]}")

import pinecone
from pinecone import Pinecone

pc = Pinecone(api_key=os.environ.get("PINECONE_API_KEY"))
index_name = os.environ.get("PINECONE_INDEX_NAME", "pdf2word")
index = pc.Index(index_name)

print(f"Connected to Pinecone index: {index_name}")
desc = index.describe_index_stats()
print(f"Index stats: {desc}")
