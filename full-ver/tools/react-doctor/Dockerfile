# react-doctor runner image
# Provides a minimal Node.js environment for running react-doctor.
# The source code is mounted at runtime via -v; nothing is bundled here.
#
# Build:
#   docker build -t react-doctor-runner:local -f tools/react-doctor/Dockerfile tools/react-doctor/
#
# Run (see tools/react-doctor/run.sh for the full invocation):
#   docker run --rm \
#     -v "$(pwd)/projects/apps/web:/app:ro" \
#     react-doctor-runner:local \
#     /app [--diff <base>] [--verbose]

FROM node:20-alpine

# Install react-doctor globally so it is cached in the image layer.
# Uses @latest to always pick up new rules; rebuild image with --build to refresh.
RUN npm install -g react-doctor@latest 2>&1

WORKDIR /app

ENTRYPOINT ["react-doctor"]
CMD ["."]
