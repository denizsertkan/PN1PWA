from sanic import Sanic, response
from sanic.request import File
from sanic.log import logger  # use Sanic's built-in logger
import os
import uuid
import asyncio
import tensorflow as tf
import numpy as np
import cv2
import librosa
import json

# Create Sanic app
app = Sanic("PN1")

# Constants
THRESHOLD = 30
AUDIO_MODEL_PATH = "models/audio_classifier.h5"
MICRO_MODEL_PATH = "models/micro_interaction.h5"
UPLOADS_DIR = "uploads"

# Load models once at startup
audio_model = tf.keras.models.load_model(AUDIO_MODEL_PATH)
micro_model = tf.keras.models.load_model(MICRO_MODEL_PATH)

# Map of possible emotions
EMOTIONS = [
    "Surprised",
    "Excited",
    "Happy",
    "Content",
    "Relaxed",
    "Tired",
    "Bored",
    "Sad",
    "Neutral",
    "Scared",
    "Angry",
]

# Serve static files
app.static("/", "./frontend/", name="frontend_static")
app.static("/uploads", "./uploads", name="uploads_static")


@app.get("/")
async def serve_frontend(request):
    """Serve index.html at the root."""
    return await response.file("./frontend/index.html")


@app.get("/view/<upload_id>")
async def view_upload(request, upload_id):
    """
    Serve view.html for a given upload_id, or list available if combo_analysis.json not found.
    """
    combo_path = os.path.join(UPLOADS_DIR, upload_id, "combo_analysis.json")

    if not os.path.exists(combo_path):
        # List available uploads that do have combo_analysis.json
        available_ids = [
            d
            for d in os.listdir(UPLOADS_DIR)
            if os.path.isfile(os.path.join(UPLOADS_DIR, d, "combo_analysis.json"))
        ]
        html_content = (
            f"<h1>Upload ID '{upload_id}' not found!</h1>"
            "<p>Available uploads:</p><ul>"
            + "".join(
                [f'<li><a href="/view/{uid}">{uid}</a></li>' for uid in available_ids]
            )
            + "</ul>"
        )
        return response.html(html_content, status=404)

    return await response.file("./frontend/view.html")


def preprocess_audio(audio_path: str) -> np.ndarray:
    """
    Load audio at 16kHz, compute 40 MFCCs, average over time -> shape (1, 40).
    """
    y, sr = librosa.load(audio_path, sr=16000)
    mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=40)
    mfccs_mean = np.mean(mfccs, axis=1)
    mfccs_mean = (mfccs_mean - np.min(mfccs_mean)) / (np.ptp(mfccs_mean) + 1e-6)
    return np.expand_dims(mfccs_mean.astype(np.float32), axis=0)


def analyze_audio(audio_path: str) -> dict:
    """Run the audio model on preprocessed audio, return emotion dict."""
    arr = preprocess_audio(audio_path)
    preds = audio_model.predict(arr)[0]
    # Only the first len(preds) of EMOTIONS
    return {EMOTIONS[i]: float(preds[i]) for i in range(len(preds))}


async def run_async_cmd(*cmd):
    """
    Run a command asynchronously, capturing stdout/stderr.
    Returns (returncode, stdout, stderr).
    """
    proc = await asyncio.create_subprocess_exec(
        *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await proc.communicate()
    return proc.returncode, stdout.decode(), stderr.decode()


def save_uploaded_file(upload_dir: str, video_file: File) -> str:
    """Save uploaded file (video.mp4) to upload_dir."""
    video_path = os.path.join(upload_dir, "video.mp4")
    with open(video_path, "wb") as f:
        f.write(video_file.body)
    return video_path


def save_combo_analysis(
    upload_dir: str, audio_emotions: dict, micro_analysis_path: str
) -> str:
    """Combine audio + micro analysis into combo_analysis.json."""
    with open(micro_analysis_path, "r") as f:
        micro_emotions = json.load(f)

    combo_data = {"audio_emotions": audio_emotions, "micro_emotions": micro_emotions}
    combo_path = os.path.join(upload_dir, "combo_analysis.json")
    with open(combo_path, "w") as f:
        json.dump(combo_data, f, indent=2)
    return combo_path


@app.post("/analyze")
async def analyze(request):
    """
    1) Save uploaded video
    2) Extract frames using extract_diff_frames.py
    3) Analyze frames (micro) using analyze_them_frames.py
    4) Extract audio via ffmpeg
    5) Analyze audio, combine with micro -> combo_analysis.json
    """
    video_file: File = request.files.get("video")
    if not video_file:
        return response.json({"error": "No video uploaded."}, status=400)

    upload_id = str(uuid.uuid4())
    upload_dir = os.path.join(UPLOADS_DIR, upload_id)
    os.makedirs(upload_dir, exist_ok=True)

    # 1) Save video
    video_path = save_uploaded_file(upload_dir, video_file)

    # 2) Run extract_diff_frames
    frames_dir = os.path.join(upload_dir, "frames")
    os.makedirs(frames_dir, exist_ok=True)

    retcode, _, stderr = await run_async_cmd(
        "python",
        "jobs/extract_diff_frames.py",
        video_path,
        frames_dir,
        "--threshold",
        str(THRESHOLD),
    )
    if retcode != 0:
        logger.error(f"Frame extraction error: {stderr}")
        return response.json({"error": "Frame extraction failed."}, status=500)

    # 3) Analyze frames -> micro_analysis.json
    micro_analysis_path = os.path.join(upload_dir, "micro_analysis.json")
    retcode, _, stderr = await run_async_cmd(
        "python",
        "jobs/analyze_them_frames.py",
        frames_dir,
        MICRO_MODEL_PATH,
        micro_analysis_path,
    )
    if retcode != 0:
        logger.error(f"Micro analysis error: {stderr}")
        return response.json({"error": "Frame analysis failed."}, status=500)

    # 4) Extract audio
    audio_path = os.path.join(upload_dir, "audio.wav")
    retcode, _, stderr = await run_async_cmd(
        "ffmpeg", "-y", "-i", video_path, "-vn", "-acodec", "pcm_s16le", audio_path
    )
    if retcode != 0:
        logger.error(f"Audio extraction error: {stderr}")
        return response.json({"error": "Audio extraction failed."}, status=500)

    # 5) Analyze audio + combine
    audio_emotions = analyze_audio(audio_path)
    combo_path = save_combo_analysis(upload_dir, audio_emotions, micro_analysis_path)

    logger.info(f"Analysis complete for upload_id: {upload_id}")

    return response.json(
        {
            "status": "success",
            "upload_id": upload_id,
            "paths": {
                "video": f"/uploads/{upload_id}/video.mp4",
                "frames_dir": f"/uploads/{upload_id}/frames/",
                "combo_analysis": f"/uploads/{upload_id}/combo_analysis.json",
                "audio": f"/uploads/{upload_id}/audio.wav",
            },
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=4200, debug=True)
