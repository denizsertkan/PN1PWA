FROM gitpod/workspace-full

USER root

RUN sudo apt-get update && sudo apt-get install -y libgl1 && sudo apt update && sudo apt install -y ffmpeg

USER gitpod
