from sanic import Sanic, response
from sanic.request import File
import tempfile
import os
import uuid
import subprocess
from typing import Dict
import tensorflow as tf
import numpy as np
import cv2
import librosa
import asyncio

app = Sanic("PN1-Server")

# Load models once globally for performance
AUDIO_MODEL_PATH = "models/audio_classifier"
POSE_MODEL_PATH = "models/dog_pose_estimator"
MICRO_MODEL_PATH = "models/micro_interaction"

audio_model = tf.keras.models.load_model(AUDIO_MODEL_PATH)
pose_model = tf.keras.models.load_model(POSE_MODEL_PATH)
micro_model = tf.keras.models.load_model(MICRO_MODEL_PATH)

# Define expanded emotion list
EMOTIONS = [
    "Surprised", "Excited", "Happy", "Content", "Relaxed", "Tired",
    "Bored", "Sad", "Neutral", "Scared", "Angry"
]


def preprocess_audio(audio_path: str) -> np.ndarray:
    y, sr = librosa.load(audio_path, sr=16000)
    mel = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=128)
    mel_db = librosa.power_to_db(mel, ref=np.max)
    mel_db = mel_db[:128, :128]
    if mel_db.shape != (128, 128):
        padded = np.zeros((128, 128))
        padded[:mel_db.shape[0], :mel_db.shape[1]] = mel_db
        mel_db = padded
    mel_db = (mel_db - mel_db.min()) / (mel_db.max() - mel_db.min())
    return np.expand_dims(mel_db, axis=(0, -1))


def preprocess_frame(frame: np.ndarray) -> np.ndarray:
    frame = cv2.resize(frame, (224, 224))
    frame = frame / 255.0
    return np.expand_dims(frame, axis=0)


def analyze_audio(audio_path: str) -> Dict[str, float]:
    input_tensor = preprocess_audio(audio_path)
    predictions = audio_model.predict(input_tensor)[0]
    return dict(zip(EMOTIONS, predictions.tolist()))


def analyze_frames(video_path: str) -> Dict[str, Dict[str, float]]:
    cap = cv2.VideoCapture(video_path)
    pose_scores = []
    micro_scores = []
    frame_interval = 5
    frame_count = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if frame_count % frame_interval == 0:
            input_tensor = preprocess_frame(frame)
            pose_scores.append(pose_model.predict(input_tensor)[0])
            micro_scores.append(micro_model.predict(input_tensor)[0])
        frame_count += 1

    cap.release()

    pose_avg = np.mean(pose_scores, axis=0).tolist() if pose_scores else [1.0/len(EMOTIONS)]*len(EMOTIONS)
    micro_avg = np.mean(micro_scores, axis=0).tolist() if micro_scores else [1.0/len(EMOTIONS)]*len(EMOTIONS)

    return {
        "pose": dict(zip(EMOTIONS, pose_avg)),
        "micro": dict(zip(EMOTIONS, micro_avg))
    }


def combine_results(audio, pose, micro) -> Dict[str, float]:
    return {
        emotion: audio.get(emotion, 0) * 0.2 + pose.get(emotion, 0) * 0.4 + micro.get(emotion, 0) * 0.4
        for emotion in EMOTIONS
    }


@app.post("/analyze")
async def analyze(request):
    if not request.files.get("video"):
        return response.json({"error": "No video uploaded."}, status=400)

    video_file: File = request.files.get("video")
    temp_dir = tempfile.mkdtemp()
    video_path = os.path.join(temp_dir, f"{uuid.uuid4()}.mp4")

    with open(video_path, "wb") as f:
        f.write(video_file.body)

    audio_path = os.path.join(temp_dir, f"{uuid.uuid4()}.wav")
    ffmpeg_command = [
        "ffmpeg", "-y", "-i", video_path,
        "-vn", "-acodec", "pcm_s16le", audio_path
    ]
    subprocess.run(ffmpeg_command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    audio_future = asyncio.to_thread(analyze_audio, audio_path)
    frame_future = asyncio.to_thread(analyze_frames, video_path)

    audio_result, frame_results = await asyncio.gather(audio_future, frame_future)

    final_result = combine_results(audio_result, frame_results["pose"], frame_results["micro"])

    return response.json({
        "result": final_result,
        "weights": {"audio": 20, "pose": 40, "micro": 40}
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
