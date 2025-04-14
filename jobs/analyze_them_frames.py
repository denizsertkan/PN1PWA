#!/usr/bin/env python3
import argparse
import os
import json
import cv2
import numpy as np
import tensorflow as tf

# Must match exactly the 5-class model output
EMOTIONS = ["Angry", "Happy", "Relaxed", "Sad", "Background"]


def preprocess_frame(gray):
    """
    We already read in grayscale.
    Resize to (192,192), normalize to [0,1],
    expand dims to (1,192,192,1).
    """
    gray = cv2.resize(gray, (192, 192))
    gray = gray / 255.0
    gray = np.expand_dims(gray, axis=(0, -1))  # -> (1,192,192,1)
    return gray


def analyze_extracted_frames(frames_dir, model_path, output_json):
    """
    1) Load the model (which expects grayscale 192x192).
    2) Loop over sorted .jpg frames in frames_dir.
    3) For each frame, parse its timestamp from the filename,
       read grayscale, preprocess, predict, store results.
    4) Save final list of dicts to output_json.
    """
    model = tf.keras.models.load_model(model_path)
    results = []

    # Sort by numeric part after underscore in "frame_XX.XX.jpg"
    frame_files = sorted(
        [f for f in os.listdir(frames_dir) if f.endswith(".jpg")],
        key=lambda x: float(os.path.splitext(x)[0].split("_")[1]),
    )

    for fname in frame_files:
        frame_path = os.path.join(frames_dir, fname)
        timestamp_str = os.path.splitext(fname)[0].split("_")[1]
        timestamp_sec = float(timestamp_str)

        print(f"\n=== Processing: {fname}")
        print(f"Timestamp (sec): {timestamp_sec}")

        # Read as GRAYSCALE explicitly
        img_gray = cv2.imread(frame_path, cv2.IMREAD_GRAYSCALE)
        if img_gray is None:
            print(f"WARNING: Could not read {frame_path} as grayscale. Skipping.")
            continue

        # Preprocess
        preprocessed = preprocess_frame(img_gray)

        # Predict
        preds = model.predict(preprocessed)
        print("DEBUG: raw preds shape =", preds.shape)

        preds = np.squeeze(preds)  # e.g. shape -> (5,)
        print("DEBUG: after squeeze =", preds.shape)
        print("DEBUG: EMOTIONS =", EMOTIONS)
        print("DEBUG: len(EMOTIONS) =", len(EMOTIONS))
        print("DEBUG: preds =", preds)

        # Build emotion dict
        n = min(len(preds), len(EMOTIONS))
        scores = {}
        for i in range(n):
            scores[EMOTIONS[i]] = float(preds[i])

        scores["time"] = round(timestamp_sec, 2)
        results.append(scores)

    with open(output_json, "w") as f:
        json.dump(results, f, indent=2)

    print(f"\nAnalysis complete. Saved {len(results)} entries to {output_json}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Analyze extracted grayscale frames with a 5-class model."
    )
    parser.add_argument("frames_dir", help="Directory containing extracted frames")
    parser.add_argument("model_path", help="Path to the .h5 model file")
    parser.add_argument("output_json", help="Path to save output JSON")
    args = parser.parse_args()

    analyze_extracted_frames(args.frames_dir, args.model_path, args.output_json)
