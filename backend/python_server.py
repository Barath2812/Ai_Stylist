from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import subprocess
import json
import os
import tempfile
import shutil
from pathlib import Path

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...), occasion: str = "Casual"):
    if not file.content_type.startswith('image/'):
        raise HTTPException(400, "Image file required")

    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp_file:
        shutil.copyfileobj(file.file, tmp_file)
        image_path = tmp_file.name

    try:
        # Run face_analysis.py
        script_path = os.path.join(os.path.dirname(__file__), "face_analysis.py")
        result = subprocess.run([
            'python', script_path, image_path, occasion
        ], capture_output=True, text=True, timeout=60)

        if result.returncode != 0:
            raise HTTPException(500, f"Analysis failed: {result.stderr}")

        # Parse JSON output
        try:
            json_start = result.stdout.find('{')
            json_end = result.stdout.rfind('}') + 1
            data = json.loads(result.stdout[json_start:json_end])
        except:
            raise HTTPException(500, "Invalid analysis output")

        if 'error' in data:
            raise HTTPException(400, data['error'])

        return data

    finally:
        # Cleanup
        os.unlink(image_path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7070)
