import os
import glob
import uuid
import tempfile
from yt_dlp import YoutubeDL
import os, subprocess
from google.cloud import storage

# No explicit credentials needed - uses service account automatically
client = storage.Client()
bucket = client.bucket('shorts-scenes')

def download_tiktok_no_watermark(url: str, output_path: str) -> None:
    """
    Download a TikTok video (no watermark) to the specified output path.

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

def preprocess_tiktok_video(url: str, split_mode: str = 'thorough') -> str:
    """
    Download a TikTok video without watermark and save scene images.

    Args:
        url:         The full TikTok video URL.
        split_mode:  How to split the video into scenes ('thorough' or 'adaptive').

    Returns:
        return project_id: A unique identifier for the project, which can be used to retrieve the images later.
    """
    with tempfile.TemporaryDirectory() as temp_dir:
        # Download the TikTok video
        video_path = os.path.join(temp_dir, "video.mp4")
        download_tiktok_no_watermark(url, video_path)
        
        # Save scene images to temp directory
        image_dir = os.path.join(temp_dir, "reference_scene_images")
        save_scene_images(video_path, image_dir, split_mode)
        
        # Read all generated images into memory
        project_id = str(uuid.uuid4())
        image_file_path = os.path.join(image_dir, "*.jpg")
        image_files = glob.glob(image_file_path)
        for img_path in sorted(image_files):
            blob = bucket.blob(f"{project_id}/reference_scene_images/{os.path.basename(img_path)}")
            blob.upload_from_filename(img_path)
        
        # store all the file paths in the bucket in a text file
        file_list_path = os.path.join(temp_dir, f"{project_id}_files.txt")
        with open(file_list_path, 'w') as f:
            for img_path in sorted(image_files):
                f.write(f"{project_id}/reference_scene_images/{os.path.basename(img_path)}\n")
        
        blob = bucket.blob(f"{project_id}/file_list.txt")
        blob.upload_from_filename(file_list_path)
        
        # Clean up the temporary directory
        print(f"All images uploaded to Google Cloud Storage at {project_id}/")
        return project_id

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python download_video.py <video_url>")
        sys.exit(1)
    
    url = sys.argv[1]
    project_id = preprocess_tiktok_video(url, split_mode='thorough')
    print(f"Project ID: {project_id}")
    print("Video processed and scenes saved to Google Cloud Storage.")
