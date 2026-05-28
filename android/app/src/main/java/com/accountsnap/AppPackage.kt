package com.accountsnap

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class AppPackage : BaseReactPackage() {

  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
      when (name) {
        "AppGroup" -> AppGroupModule(reactContext)
        "WidgetBridge" -> WidgetBridgeModule(reactContext)
        else -> null
      }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider = ReactModuleInfoProvider {
    mapOf(
        "AppGroup" to ReactModuleInfo(
            "AppGroup",
            AppGroupModule::class.java.name,
            false, // canOverrideExistingModule
            false, // needsEagerInit
            false, // isCxxModule
            true,  // isTurboModule
        ),
        "WidgetBridge" to ReactModuleInfo(
            "WidgetBridge",
            WidgetBridgeModule::class.java.name,
            false,
            false,
            false,
            true,
        ),
    )
  }
}
