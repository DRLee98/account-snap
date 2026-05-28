package com.accountsnap

import androidx.glance.appwidget.updateAll
import com.drlee98.accountsnap.specs.NativeWidgetBridgeSpec
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

@ReactModule(name = NativeWidgetBridgeSpec.NAME)
class WidgetBridgeModule(reactContext: ReactApplicationContext) :
    NativeWidgetBridgeSpec(reactContext) {

  override fun reload() {
    val ctx = reactApplicationContext.applicationContext
    CoroutineScope(Dispatchers.IO).launch {
      AccountWidget().updateAll(ctx)
    }
  }
}
