#!/bin/bash

# Get current timestamp
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

# Commit message
COMMIT_MSG="Feature/AC-->> Front-end Changes --> ${TIMESTAMP}"

echo "Adding changes..."
git add .

echo "Committing changes..."
git commit -m "$COMMIT_MSG"

echo "Pushing to development branch..."
git push origin prod

echo "Done 🚀"
