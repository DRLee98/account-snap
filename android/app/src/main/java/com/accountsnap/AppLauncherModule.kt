package com.accountsnap

import android.content.Intent
import com.drlee98.accountsnap.specs.NativeAppLauncherSpec
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = NativeAppLauncherSpec.NAME)
class AppLauncherModule(reactContext: ReactApplicationContext) :
    NativeAppLauncherSpec(reactContext) {

  // getLaunchIntentForPackage는 Android 11+ 패키지 가시성 대상이라
  // 실행할 패키지를 AndroidManifest <queries>에 등록해 둬야 한다.
  override fun launch(packageName: String, promise: Promise) {
    val intent = reactApplicationContext.packageManager.getLaunchIntentForPackage(packageName)
    if (intent == null) {
      promise.resolve(false)
      return
    }
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    try {
      reactApplicationContext.startActivity(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }
}
