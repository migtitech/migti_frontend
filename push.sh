#!/bin/bash

# Get current timestamp
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

# Commit message
COMMIT_MSG="Feature/AC-->> Back-end Changes --> ${TIMESTAMP}"

echo "Adding changes..."
git add .

echo "Committing changes..."
git commit -m "$COMMIT_MSG"

echo "Pushing to development branch..."
git push origin development

echo "Done 🚀"
