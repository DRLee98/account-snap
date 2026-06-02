import UIKit
import AdFitSDK

@objc(AdFitBannerWrapper)
public class AdFitBannerWrapper: UIView {
  private var bannerView: AdFitBannerAdView?

  @objc public var clientId: NSString = "" {
    didSet { reloadBanner() }
  }

  @objc public var adWidth: NSNumber = 320 {
    didSet { relayout() }
  }

  @objc public var adHeight: NSNumber = 50 {
    didSet { relayout() }
  }

  @objc public var cornerRadius: NSNumber = 0 {
    didSet { applyCornerRadius() }
  }

  override public init(frame: CGRect) {
    super.init(frame: frame)
    backgroundColor = .clear
    clipsToBounds = true
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
    backgroundColor = .clear
    clipsToBounds = true
  }

  private func applyCornerRadius() {
    let r = CGFloat(truncating: cornerRadius)
    layer.cornerRadius = r
    bannerView?.layer.cornerRadius = r
    bannerView?.clipsToBounds = true
  }

  private func reloadBanner() {
    let id = clientId as String
    guard !id.isEmpty else { return }
    bannerView?.removeFromSuperview()

    let banner = AdFitBannerAdView(clientId: id)
    banner.frame = CGRect(
      x: 0, y: 0,
      width: CGFloat(truncating: adWidth),
      height: CGFloat(truncating: adHeight)
    )
    banner.rootViewController = topViewController()
    let r = CGFloat(truncating: cornerRadius)
    banner.layer.cornerRadius = r
    banner.clipsToBounds = true
    addSubview(banner)
    bannerView = banner
    banner.loadAd()
  }

  private func relayout() {
    bannerView?.frame = CGRect(
      x: 0, y: 0,
      width: CGFloat(truncating: adWidth),
      height: CGFloat(truncating: adHeight)
    )
  }

  private func topViewController() -> UIViewController? {
    var rvc: UIViewController? = window?.rootViewController
      ?? UIApplication.shared.connectedScenes
        .compactMap { ($0 as? UIWindowScene)?.keyWindow?.rootViewController }
        .first
    while let presented = rvc?.presentedViewController {
      rvc = presented
    }
    return rvc
  }
}
