gcloud run deploy shorts-factory \
    --source . \
    --region us-west1 \
    --cpu 2 \
    --memory 8Gi \
    --timeout 180 \
    --service-account="shorts-factory-sa@pure-lantern-394915.iam.gserviceaccount.com" \
    --build-service-account "projects/pure-lantern-394915/serviceAccounts/cloud-build@pure-lantern-394915.iam.gserviceaccount.com"
