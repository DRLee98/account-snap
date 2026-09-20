package com.accountsnap

import android.graphics.Outline
import android.view.View
import android.view.ViewOutlineProvider
import android.widget.FrameLayout
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.uimanager.PixelUtil
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.kakao.adfit.ads.AdListener
import com.kakao.adfit.ads.ba.BannerAdView

/**
 * 카카오 AdFit 배너를 감싸는 컨테이너.
 *
 * iOS의 `AdFitBannerWrapper`와 prop(clientId/adWidth/adHeight/cornerRadius)을 맞춘다.
 * prop은 한 번에 하나씩 도착하므로 실제 배너 생성은 `commit()`에서만 하고,
 * ViewManager가 `onAfterUpdateTransaction`에서 호출한다.
 */
class AdFitBannerContainer(private val reactContext: ThemedReactContext) :
    FrameLayout(reactContext), LifecycleEventListener {

  private var bannerView: BannerAdView? = null

  /** 현재 붙어 있는 배너의 설정 — 같으면 재생성하지 않는다 */
  private var loadedKey: String? = null

  var clientId: String = ""
  var adWidth: Int = 320
  var adHeight: Int = 50
  var cornerRadius: Float = 0f

  init {
    reactContext.addLifecycleEventListener(this)
    clipToOutline = true
    outlineProvider =
        object : ViewOutlineProvider() {
          override fun getOutline(view: View, outline: Outline) {
            outline.setRoundRect(0, 0, view.width, view.height, cornerRadius)
          }
        }
  }

  fun commit() {
    invalidateOutline()
    if (clientId.isEmpty()) return

    val key = "$clientId@${adWidth}x$adHeight"
    if (key == loadedKey) return

    // AdFit은 Activity context를 요구한다 — ThemedReactContext로 만들면
    // IllegalArgumentException("Context must be Activity context!").
    // 아직 Activity가 없으면 loadedKey를 남기지 않고 빠져서 attach/resume 때 다시 시도한다.
    val activity = reactContext.currentActivity ?: return

    destroyBanner()

    val banner =
        BannerAdView(activity).apply {
          // 3.22 기준 setClientId/setAdUnitSize는 deprecated —
          // 광고 단위는 setAdUnitId, 사이즈는 뷰의 실제 크기로 결정된다.
          setAdUnitId(this@AdFitBannerContainer.clientId)
          setAdListener(
              object : AdListener {
                override fun onAdLoaded() {
                  // 로드 후 배너가 실제 크기를 잡으므로 수동으로 다시 배치.
                  // RN이 관리하는 트리라 requestLayout()이 전파되지 않는다.
                  layoutBanner()
                }

                override fun onAdFailed(errorCode: Int) = Unit

                override fun onAdClicked() = Unit
              })
        }

    addView(banner, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
    bannerView = banner
    loadedKey = key
    banner.loadAd()
  }

  private fun layoutBanner() {
    val banner = bannerView ?: return
    banner.measure(
        MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
        MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY),
    )
    banner.layout(0, 0, width, height)
  }

  private fun destroyBanner() {
    bannerView?.let {
      it.destroy()
      removeView(it)
    }
    bannerView = null
    loadedKey = null
  }

  fun release() {
    reactContext.removeLifecycleEventListener(this)
    destroyBanner()
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    if (bannerView == null) commit()
  }

  override fun onHostResume() {
    val banner = bannerView
    if (banner == null) commit() else banner.resume()
  }

  override fun onHostPause() {
    bannerView?.pause()
  }

  override fun onHostDestroy() {
    destroyBanner()
  }
}

class AdFitBannerViewManager : SimpleViewManager<AdFitBannerContainer>() {

  override fun getName(): String = REACT_CLASS

  override fun createViewInstance(reactContext: ThemedReactContext): AdFitBannerContainer =
      AdFitBannerContainer(reactContext)

  @ReactProp(name = "clientId")
  fun setClientId(view: AdFitBannerContainer, value: String?) {
    view.clientId = value ?: ""
  }

  @ReactProp(name = "adWidth", defaultInt = 320)
  fun setAdWidth(view: AdFitBannerContainer, value: Int) {
    view.adWidth = value
  }

  @ReactProp(name = "adHeight", defaultInt = 50)
  fun setAdHeight(view: AdFitBannerContainer, value: Int) {
    view.adHeight = value
  }

  @ReactProp(name = "cornerRadius", defaultFloat = 0f)
  fun setCornerRadius(view: AdFitBannerContainer, value: Float) {
    view.cornerRadius = PixelUtil.toPixelFromDIP(value)
  }

  override fun onAfterUpdateTransaction(view: AdFitBannerContainer) {
    super.onAfterUpdateTransaction(view)
    view.commit()
  }

  override fun onDropViewInstance(view: AdFitBannerContainer) {
    view.release()
    super.onDropViewInstance(view)
  }

  companion object {
    const val REACT_CLASS = "AdFitBannerView"
  }
}
