import glob
import os

def process_label_file(file_path):
    with open(file_path, "r") as f:
        lines = f.readlines()

    new_lines = []
    for line in lines:
        parts = line.strip().split()
        if not parts:
            continue  # skip empty lines
        
        # Keep the first 5 numbers (class and bounding box info)
        header = parts[:5]
        keypoints = parts[5:]
        
        # Ensure that keypoints are in multiples of 3
        if len(keypoints) % 3 != 0:
            print(f"Warning: {file_path} has an unexpected number of keypoint values.")
            continue
        
        new_keypoints = []
        # Remove every third element (the flag)
        for i in range(0, len(keypoints), 3):
            # Keep only the x and y coordinates
            new_keypoints.extend(keypoints[i:i+2])
        
        new_line = " ".join(header + new_keypoints)
        new_lines.append(new_line)
    
    # Overwrite the file with the corrected content
    with open(file_path, "w") as f:
        f.write("\n".join(new_lines))

# List of label directories to process
directories = ["train/labels", "val/labels"]

for d in directories:
    if os.path.exists(d):
        for file_path in glob.glob(os.path.join(d, "*.txt")):
            process_label_file(file_path)
            print(f"Processed {file_path}")

print("Label processing complete.")
