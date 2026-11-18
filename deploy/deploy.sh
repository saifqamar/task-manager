#!/usr/bin/env bash
# Runs on the EC2 instance (invoked by GitHub Actions via SSM).
# Usage: deploy.sh <ecr-repo-uri> <image-tag>
set -euo pipefail

ECR_REPO="$1"
IMAGE_TAG="$2"
APP_DIR=/opt/task-app
REGISTRY="${ECR_REPO%%/*}"
REGION="$(echo "$REGISTRY" | cut -d. -f4)"

cd "$APP_DIR"
export ECR_REPO

compose() {
  docker compose -f "$APP_DIR/docker-compose.prod.yml" --project-directory "$APP_DIR" "$@"
}

deploy_tag() {
  export IMAGE_TAG="$1"
  compose pull api
  compose up -d
}

healthy() {
  for _ in $(seq 1 30); do
    if curl -fsS http://localhost/health >/dev/null 2>&1; then return 0; fi
    sleep 2
  done
  return 1
}

echo "Logging in to $REGISTRY"
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$REGISTRY"

echo "Deploying $IMAGE_TAG"
deploy_tag "$IMAGE_TAG"

if healthy; then
  echo "$IMAGE_TAG" > .last-good-tag
  # Remove dangling images left behind by previous deploys.
  docker image prune --force >/dev/null
  echo "Deploy of $IMAGE_TAG succeeded"
  exit 0
fi

echo "Health check failed for $IMAGE_TAG" >&2
compose logs --tail=50 api >&2 || true
if [[ -f .last-good-tag ]]; then
  PREVIOUS="$(cat .last-good-tag)"
  echo "Rolling back to $PREVIOUS" >&2
  deploy_tag "$PREVIOUS"
fi
exit 1
