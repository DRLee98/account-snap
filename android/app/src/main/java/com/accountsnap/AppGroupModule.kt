package com.accountsnap

import android.content.Context
import com.drlee98.accountsnap.specs.NativeAppGroupSpec
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = NativeAppGroupSpec.NAME)
class AppGroupModule(reactContext: ReactApplicationContext) :
    NativeAppGroupSpec(reactContext) {

  private val prefs = reactContext.getSharedPreferences(SUITE, Context.MODE_PRIVATE)

  override fun getTypedExportedConstants(): MutableMap<String, Any> = mutableMapOf(
      "containerPath" to (reactApplicationContext.filesDir?.absolutePath ?: ""),
      "suiteName" to SUITE,
  )

  override fun setString(key: String, value: String) {
    prefs.edit().putString(key, value).apply()
  }

  override fun getString(key: String, promise: Promise) {
    promise.resolve(prefs.getString(key, null))
  }

  override fun remove(key: String) {
    prefs.edit().remove(key).apply()
  }

  companion object {
    const val SUITE = "account-snap"
  }
}
