#!/usr/bin/env bash
# Populate local NuGet cache for offline builds
set -euo pipefail

# Directory for local packages
CACHE_DIR="$(pwd)/.nuget/packages"
mkdir -p "$CACHE_DIR"

# Restore packages to local cache
NUGET_PACKAGES="$CACHE_DIR" dotnet restore conViver.sln

echo "Packages restored to $CACHE_DIR"
