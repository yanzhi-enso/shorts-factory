gsutil cors set cors.json gs://shorts-scenes

echo "GCS updated, fetch current state for verification"

gsutil cors get gs://shorts-scenes

