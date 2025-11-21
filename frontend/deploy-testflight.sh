#!/bin/bash

# Taist TestFlight Deployment Script
# This script builds and submits the app to TestFlight

set -e  # Exit on error

echo "🚀 Starting TestFlight Deployment..."
echo "=================================="
echo ""

# Check if we're in the frontend directory
if [ ! -f "app.json" ]; then
    echo "❌ Error: Please run this script from the frontend directory"
    exit 1
fi

# Show current version
VERSION=$(grep -o '"version": "[^"]*' app.json | cut -d'"' -f4)
echo "📦 Current Version: $VERSION"
echo ""

# Ask which profile to build
echo "Select build profile:"
echo "1) Production (for App Store/TestFlight)"
echo "2) Preview (staging environment)"
read -p "Enter choice (1 or 2): " choice

if [ "$choice" == "1" ]; then
    PROFILE="production"
    echo "✅ Building for PRODUCTION"
elif [ "$choice" == "2" ]; then
    PROFILE="preview"
    echo "✅ Building for PREVIEW (staging)"
else
    echo "❌ Invalid choice"
    exit 1
fi

echo ""
echo "🔨 Building iOS app with profile: $PROFILE"
echo "=================================="
eas build --platform ios --profile $PROFILE

echo ""
echo "📱 Build complete! Now submitting to TestFlight..."
echo "=================================="
eas submit --platform ios --latest

echo ""
echo "✅ SUCCESS! Your app has been submitted to TestFlight"
echo "🎉 Check App Store Connect for processing status"
echo ""
echo "Next steps:"
echo "1. Go to https://appstoreconnect.apple.com"
echo "2. Select your app (Taist)"
echo "3. Go to TestFlight tab"
echo "4. Wait for processing (usually 5-15 minutes)"
echo "5. Add internal/external testers"
echo "6. Distribute the build"

