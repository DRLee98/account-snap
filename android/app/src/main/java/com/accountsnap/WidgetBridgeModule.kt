package com.accountsnap

import com.drlee98.accountsnap.specs.NativeWidgetBridgeSpec
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = NativeWidgetBridgeSpec.NAME)
class WidgetBridgeModule(reactContext: ReactApplicationContext) :
    NativeWidgetBridgeSpec(reactContext) {

  override fun reload() {
    // TODO(WGT-003): Glance widget update once Android widget is implemented
  }
}
