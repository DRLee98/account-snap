import Foundation
import WidgetKit

@objc public class WidgetCenterHelper: NSObject {
  @objc public static func reloadAll() {
    if #available(iOS 14.0, *) {
      DispatchQueue.main.async {
        WidgetCenter.shared.reloadAllTimelines()
      }
    }
  }
}
