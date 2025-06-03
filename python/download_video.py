import os
import glob
import uuid
from yt_dlp import YoutubeDL
import os, subprocess

DIR_NAME = str(uuid.uuid4())

def download_tiktok_no_watermark(url: str, output_path: str = VIDEO_DIR+"/shots/tiktok_video.mp4") -> None:
    """
    Download a TikTok video (no watermark) to the specified output path.

    Dependencies:
      pip install yt-dlp

    Args:
      url:         The full TikTok video URL.
      output_path: Where to save the MP4 (e.g. "myvideo.mp4").
    """
    # yt-dlp options
    ydl_opts = {
        # select best video+audio in mp4 and merge them
        "format": "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]",
        "merge_output_format": "mp4",
        "outtmpl": output_path,
        "noplaylist": True,
        "quiet": False,
        "no_warnings": True,
        "retries": 3,
        # TikTok sometimes blocks non-browser clients:
        "user_agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/114.0.0.0 Safari/537.36"
        ),
    }

    with YoutubeDL(ydl_opts) as ydl:
        # this will download and merge automatically
        ydl.download([url])

    return [{'filename': output_path, 'localfile': output_path}]


def save_scene_images(mp4_path, output_folder, split_mode='thorough'):
    """
    Detects scenes in a video and saves the first frame of each scene using PySceneDetect.

    Parameters:
        mp4_path (str): Path to the input MP4 file.
        output_folder (str): Directory to save the scene images.

    Raises:
        subprocess.CalledProcessError: If the scenedetect command fails.
    """
    print("Analyzing scenes ...")
    os.makedirs(output_folder, exist_ok=True)

    # Clean out any existing .jpg files
    for jpg_file in glob.glob(os.path.join(output_folder, "*.jpg")):
        try:
            os.remove(jpg_file)
        except OSError as e:
            print(f"Warning: could not remove {jpg_file}: {e}")

    command = [
        "scenedetect",
        "-i", mp4_path,
        "detect-content" if split_mode == 'thorough' else "detect-adaptive",
        "save-images",
        "-o", output_folder
    ]
    subprocess.run(command, check=True)
    print("Analyzing finished!")
