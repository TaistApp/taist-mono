#!/bin/bash
# Set Android Emulator Location
# Usage: ./set-emulator-location.sh [latitude] [longitude]
# Default: Chicago coordinates (41.8781, -87.6298)

LAT=${1:-41.8781}
LNG=${2:-"-87.6298"}

echo "🌍 Setting emulator location to: $LAT, $LNG"
adb emu geo fix $LNG $LAT

if [ $? -eq 0 ]; then
    echo "✅ Location set successfully!"
    echo ""
    echo "📍 Coordinates: Latitude $LAT, Longitude $LNG"
    echo ""
    echo "💡 Now try the 'Use My Current Location' button in your app!"
else
    echo "❌ Failed to set location. Make sure the emulator is running."
fi

