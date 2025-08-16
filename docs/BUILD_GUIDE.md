# Build and Distribution Guide

This guide explains how to build and distribute your 20 Questions app for both Android and iOS platforms using command-line tools.

## Overview

Your build setup is now configured for local builds using Xcode and Android Studio/Gradle, avoiding EAS Build costs. All build outputs are stored in the `builds/` directory and properly gitignored.

## Prerequisites

- Xcode (for iOS builds)
- Android Studio with SDK (for Android builds)
- Node.js and npm
- React Native development environment

## Build Commands

All build commands are available as npm scripts in `package.json`:

### iOS Builds

```bash
# Build iOS archive and IPA (requires Apple Developer account setup)
npm run build:ios

# Note: You'll need to configure your Apple Developer Team ID in ios/exportOptions.plist
```

### Android Builds

```bash
# Debug APK (for testing)
npm run build:android:debug

# Release APK (for direct distribution)
npm run build:android:release

# AAB Bundle (for Google Play Store)
npm run build:android:bundle
```

### Build All

```bash
# Build iOS IPA and Android AAB
npm run build:all
```

## Build Outputs

All builds are saved to:
- iOS: `builds/ios/`
- Android: `builds/android/`

## Setup Details

### iOS Configuration

- **Project**: `ios/20Questions.xcworkspace`
- **Export Options**: `ios/exportOptions.plist`
- **Signing**: Automatic signing (requires Apple Developer account)
- **Output**: `.ipa` files for distribution

### Android Configuration

- **Keystore**: `android/app/20questions.keystore`
- **Credentials**: Configured in `android/gradle.properties`
- **Package**: `com.ravi.twentyquestions`
- **Outputs**: 
  - Debug APK: `app-debug.apk`
  - Release APK: `app-release.apk` 
  - Release Bundle: `app-release.aab`

## Known Issues

### Android Build Conflict ✅ RESOLVED

The conflict between `react-native-reanimated` and `react-native-worklets` has been resolved by updating to compatible versions:

- **react-native-reanimated**: Updated to 4.0.2 (latest)
- **react-native-worklets**: 0.4.1 (compatible with Reanimated 4)
- **Babel Config**: Properly configured with `react-native-worklets/plugin`

**Resolution Steps Taken:**
1. Updated react-native-reanimated from 3.17.5 to 4.0.2
2. Verified babel.config.js uses `react-native-worklets/plugin`
3. Regenerated native projects with `expo prebuild --clean`
4. Android builds now complete successfully

### iOS Signing

For iOS builds to work, you need to:

1. Set your Apple Developer Team ID in `ios/exportOptions.plist`
2. Configure signing in Xcode or via command line
3. Ensure provisioning profiles are available

## Manual Steps Required

### First-time iOS Setup

1. Open `ios/20Questions.xcworkspace` in Xcode
2. Select your development team in Signing & Capabilities
3. Update `ios/exportOptions.plist` with your Team ID:
   ```xml
   <key>teamID</key>
   <string>YOUR_TEAM_ID_HERE</string>
   ```

### Android Keystore Security

The keystore credentials are currently stored in `gradle.properties`. For production:

1. Move sensitive credentials to environment variables
2. Use a secure keystore management system
3. Never commit keystores to version control

## Distribution

### iOS
- **TestFlight**: Upload `.ipa` to App Store Connect
- **Direct**: Distribute `.ipa` files to testers

### Android
- **Google Play**: Upload `.aab` bundle
- **Direct**: Distribute `.apk` files
- **Internal Testing**: Use debug `.apk`

## Troubleshooting

### Build Failures
1. Clean builds: `cd android && ./gradlew clean`
2. Reinstall pods: `cd ios && pod install`
3. Regenerate native code: `npm run prebuild`

### Signing Issues
- iOS: Check Apple Developer account and certificates
- Android: Verify keystore path and credentials

### Dependencies
- Run `npx expo doctor` to check for common issues
- Ensure all native dependencies are properly linked

## Environment Variables

Create `.env.production` for production builds with:
```
EXPO_PUBLIC_SUPABASE_URL=your_production_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_production_key
```

## Automation

Consider setting up CI/CD with:
- GitHub Actions
- Bitrise
- CircleCI
- Azure DevOps

For automated builds and distribution.