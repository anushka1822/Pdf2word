import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.environ.get("GOOGLE_API_KEY")
genai.configure(api_key=api_key)

print("--- Embedding Models ---")
try:
    models = [m for m in genai.list_models() if 'embedContent' in m.supported_generation_methods]
    results = []
    for m in models:
        print(f"Checking {m.name}...")
        try:
            res = genai.embed_content(model=m.name, content="test")
            dim = len(res['embedding'])
            results.append(f"{m.name}: {dim}")
        except Exception as e:
            results.append(f"{m.name}: Error ({e})")
    
    with open("model_dimensions.txt", "w") as f:
        f.write("\n".join(results))
    print("Done checking all models.")
except Exception as e:
    print(f"Error listing: {e}")
