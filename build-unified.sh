#!/bin/bash
set -e

# Change directory relative to script path
cd "$(dirname "$0")"

echo "=== 1. Building React Frontend ==="
cd frontend
npm install
npm run build
cd ..

echo "=== 2. Cleaning Backend Static Resources ==="
rm -rf backend/src/main/resources/static/*
mkdir -p backend/src/main/resources/static/

echo "=== 3. Copying Frontend Assets to Backend ==="
cp -R frontend/dist/* backend/src/main/resources/static/

echo "=== 4. Packaging Spring Boot Backend ==="
cd backend
./mvnw clean package -DskipTests
cd ..

echo "============================================="
echo "=== UNIFIED BUILD SUCCESSFUL ==="
echo "============================================="
echo "You can launch the single JAR file locally:"
echo "  java -jar backend/target/invoice-0.0.1-SNAPSHOT.jar"
echo "============================================="
