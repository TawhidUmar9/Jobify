# TESTING_ON_DEVICE.md: running Jobify on a phone (T-001 manual checks)

## 1. One-time setup
1. Phone: Settings → About phone → tap **Build number** 7 times → Developer options → enable **USB debugging**.
2. Connect USB, accept "Allow USB debugging?" on the phone.
3. `adb devices` must list exactly one device as `device` (not `unauthorized`).
4. Remove the old test build (old app id): `adb uninstall com.tawhidumar.jobify` (ignore "not installed").
5. Optional, protects a 16 GB PC: add to `~/.gradle/gradle.properties`:
   ```
   org.gradle.workers.max=4
   org.gradle.jvmargs=-Xmx2g -XX:MaxMetaspaceSize=512m
   ```

## 2. Launch check
```bash
npx expo prebuild --platform android --clean   # regenerate android/ with the current app id (no compiling)
npm run android                                  # builds ONLY your phone's CPU arch, installs, starts Metro
```
First build takes 5–10 minutes. The app opens on the phone. **Pass:** no red error screen; the Welcome placeholder shows.
Leave the terminal running (that is Metro). Close heavy apps (browser tabs, Android Studio) while it builds.

## 3. Bottom-sheet check (A-28)
Temporarily replace `src/app/onboarding/index.tsx` with:
```tsx
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Text, View } from 'react-native';

export default function SheetCheck() {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ marginTop: 80, textAlign: 'center' }}>Sheet check</Text>
      <BottomSheet index={0} snapPoints={['40%', '90%']} enablePanDownToClose>
        <BottomSheetView style={{ padding: 24 }}>
          <Text>Drag me up, then drag down to close</Text>
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}
```
Save. The app reloads by itself (press `r` in the Metro terminal if it doesn't).
**Pass:** the sheet shows at 40%, drags up to 90%, and closes when dragged down, with no red screen.
**Fail:** copy the red-screen error text (or `adb logcat -d | grep -iE "ReactNativeJS|AndroidRuntime" | tail -40`).

## 4. Clean up
```bash
git checkout src/app/onboarding/index.tsx      # revert the temporary screen
# Ctrl+C in the Metro terminal
cd android && ./gradlew --stop && cd ..        # frees ~2 GB of RAM
```
