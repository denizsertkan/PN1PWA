from sanic import Sanic, response
from sanic.request import File
from sanic.log import logger
from sanic.response import json as sanic_json
from datetime import datetime
import os
import uuid
import asyncio
import tensorflow as tf
import numpy as np
import cv2
import librosa
import json
import shutil
from dotenv import load_dotenv

load_dotenv()

# --- Configuration ---
app = Sanic("PN1")
THRESHOLD = 30
AUDIO_MODEL_PATH = "models/audio_classifier.h5"
MICRO_MODEL_PATH = "models/micro_interaction.keras"
UPLOADS_DIR = "uploads"

# --- Load Models Once ---
audio_model = tf.keras.models.load_model(AUDIO_MODEL_PATH)
micro_model = tf.keras.models.load_model(MICRO_MODEL_PATH)

EMOTIONS = [
    "Surprised", "Excited", "Happy", "Content", "Relaxed",
    "Tired", "Bored", "Sad", "Neutral", "Scared", "Angry"
]

# --- Static Files ---
app.static("/", "./frontend/", name="frontend_static")
app.static("/uploads", "./uploads", name="uploads_static")

@app.get("/")
async def serve_frontend(request):
    return await response.file("./frontend/index.html")

# --- Audio Processing ---
def preprocess_audio(audio_path: str) -> np.ndarray:
    y, sr = librosa.load(audio_path, sr=16000)
    mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=40)
    mfccs_mean = np.mean(mfccs, axis=1)
    mfccs_mean = (mfccs_mean - np.min(mfccs_mean)) / (np.ptp(mfccs_mean) + 1e-6)
    return np.expand_dims(mfccs_mean.astype(np.float32), axis=0)

def analyze_audio(audio_path: str) -> dict:
    arr = preprocess_audio(audio_path)
    preds = audio_model.predict(arr)[0]
    return {EMOTIONS[i]: float(preds[i]) for i in range(len(preds))}

# --- Helpers ---
async def run_async_cmd(*cmd):
    proc = await asyncio.create_subprocess_exec(
        *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await proc.communicate()
    return proc.returncode, stdout.decode(), stderr.decode()

def save_uploaded_file(upload_dir: str, video_file: File) -> str:
    video_path = os.path.join(upload_dir, "video.mp4")
    with open(video_path, "wb") as f:
        f.write(video_file.body)
    return video_path

def save_combo_analysis(upload_dir: str, audio_emotions: dict, micro_path: str) -> str:
    with open(micro_path, "r") as f:
        micro_emotions = json.load(f)
    combo = {"audio_emotions": audio_emotions, "micro_emotions": micro_emotions}
    combo_path = os.path.join(upload_dir, "combo_analysis.json")
    with open(combo_path, "w") as f:
        json.dump(combo, f, indent=2)
    return combo_path

# --- Main Upload/Analyze Route ---
@app.post("/analyze")
async def analyze(request):
    video_file: File = request.files.get("video")
    if not video_file:
        return response.json({"error": "No video uploaded."}, status=400)

    upload_id = str(uuid.uuid4())[:8]
    upload_dir = os.path.join(UPLOADS_DIR, upload_id)
    frames_dir = os.path.join(upload_dir, "frames")
    os.makedirs(frames_dir, exist_ok=True)

    video_path = save_uploaded_file(upload_dir, video_file)

    # Extract frames
    retcode, _, stderr = await run_async_cmd(
        "python", "jobs/extract_diff_frames.py", video_path, frames_dir,
        "--threshold", str(THRESHOLD)
    )
    if retcode != 0:
        logger.error(f"Frame extraction error: {stderr}")
        return response.json({"error": "Frame extraction failed."}, status=500)

    # Analyze frames
    micro_path = os.path.join(upload_dir, "micro_analysis.json")
    retcode, _, stderr = await run_async_cmd(
        "python", "jobs/analyze_them_frames.py", frames_dir, MICRO_MODEL_PATH, micro_path
    )
    if retcode != 0:
        logger.error(f"Frame analysis error: {stderr}")
        return response.json({"error": "Frame analysis failed."}, status=500)

    # Extract audio
    audio_path = os.path.join(upload_dir, "audio.wav")
    retcode, _, stderr = await run_async_cmd(
        "ffmpeg", "-y", "-i", video_path, "-vn", "-acodec", "pcm_s16le", audio_path
    )
    if retcode != 0:
        logger.error(f"Audio extraction error: {stderr}")
        return response.json({"error": "Audio extraction failed."}, status=500)

    # Analyze + Combine
    audio_emotions = analyze_audio(audio_path)
    combo_path = save_combo_analysis(upload_dir, audio_emotions, micro_path)

    return response.json({
        "status": "success",
        "upload_id": upload_id,
        "timestamp": datetime.now().isoformat(),
        "paths": {
            "video": f"/uploads/{upload_id}/video.mp4",
            "frames_dir": f"/uploads/{upload_id}/frames/",
            "combo_analysis": f"/uploads/{upload_id}/combo_analysis.json",
            "audio": f"/uploads/{upload_id}/audio.wav",
        },
    })

# --- Supporting Routes ---
@app.get("/replay")
async def replay_page(request):
    return await response.file("./frontend/replay.html")

@app.get("/uploads_index.json")
async def list_uploaded_sessions(request):
    entries = []
    for upload_id in os.listdir(UPLOADS_DIR):
        up_path = os.path.join(UPLOADS_DIR, upload_id)
        if os.path.isfile(os.path.join(up_path, "combo_analysis.json")):
            entries.append({
                "id": upload_id,
                "timestamp": os.path.getmtime(os.path.join(up_path, "video.mp4"))
            })
    entries.sort(key=lambda x: x["timestamp"], reverse=True)
    return sanic_json(entries)

@app.post("/delete_video")
async def delete_video(request):
    data = request.json
    upload_id = data.get("upload_id")
    if not upload_id:
        return response.json({"error": "Missing upload_id"}, status=400)

    path = os.path.join(UPLOADS_DIR, upload_id)
    if os.path.exists(path):
        shutil.rmtree(path)
        return response.json({"status": "deleted", "upload_id": upload_id})
    else:
        return response.json({"error": "Upload not found."}, status=404)

# --- Run ---
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=4200, debug=True, single_process=True)
