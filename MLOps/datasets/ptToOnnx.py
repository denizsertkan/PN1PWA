#!/usr/bin/env python
"""
This script loads a YOLO11n PyTorch model checkpoint and exports it to the ONNX format.
It uses the Ultralytics package to load the model.

Usage:
    python convert_to_onnx.py

Make sure your 'yolo11n.pt' file is in the working directory.
"""

import torch
from ultralytics import YOLO

def convert_yolo_to_onnx(weights_path, output_path, dummy_input_shape=(1, 3, 640, 640)):
    # Load the YOLO11 model using the Ultralytics API.
    model_wrapper = YOLO(weights_path)
    # The underlying PyTorch model is stored in the .model attribute.
    pytorch_model = model_wrapper.model
    pytorch_model.eval()  # Set the model to evaluation mode

    # Create a dummy input tensor with the expected input shape.
    dummy_input = torch.randn(*dummy_input_shape)

    # Export the model to ONNX.
    torch.onnx.export(
        pytorch_model,                   # model being run
        dummy_input,                     # model input (or a tuple for multiple inputs)
        output_path,                     # where to save the model (can be a file or file-like object)
        export_params=True,              # store the trained parameter weights inside the model file
        opset_version=11,                # the ONNX version to export the model to
        do_constant_folding=True,        # whether to execute constant folding for optimization
        input_names=['input'],           # the model's input names
        output_names=['output'],         # the model's output names
        dynamic_axes={
            'input': {0: 'batch_size'},   # variable batch size for input
            'output': {0: 'batch_size'}   # variable batch size for output
        }
    )

    print(f"Model successfully exported to ONNX format at '{output_path}'.")

if __name__ == '__main__':
    # Path to your PyTorch model checkpoint; only managed to do 4/5 epochs
    weights_path = 'yolo11n.pt'
    # Desired output ONNX file path
    output_path = 'yolo11n.onnx'
    # Convert the model
    convert_yolo_to_onnx(weights_path, output_path)
