import Foundation
import UIKit
import Vision

@objc public class TextRecognitionHelper: NSObject {
  /// 이미지 파일에서 텍스트 인식 (Vision).
  /// resolve(text, confidence): 인식된 전체 텍스트(공백 조인)와 평균 신뢰도.
  /// 한국어 인식은 iOS 16+(Revision 3)에서 지원 — 이하 버전은 숫자/영문만
  /// 인식되므로 JS 쪽에서 파싱 실패 시 CLOVA로 폴백한다.
  @objc public static func recognize(
    _ imageUri: String,
    resolve: @escaping (String, Double) -> Void,
    reject: @escaping (String) -> Void
  ) {
    DispatchQueue.global(qos: .userInitiated).async {
      let path = imageUri.hasPrefix("file://")
        ? String(imageUri.dropFirst("file://".count))
        : imageUri
      guard let image = UIImage(contentsOfFile: path),
            let cgImage = image.cgImage else {
        reject("이미지를 열 수 없습니다: \(imageUri)")
        return
      }

      let request = VNRecognizeTextRequest { req, error in
        if let error = error {
          reject(error.localizedDescription)
          return
        }
        let observations =
          (req.results as? [VNRecognizedTextObservation]) ?? []
        var texts: [String] = []
        var confidenceSum: Double = 0
        for observation in observations {
          guard let candidate = observation.topCandidates(1).first else {
            continue
          }
          texts.append(candidate.string)
          confidenceSum += Double(candidate.confidence)
        }
        let joined = texts.joined(separator: " ")
        let avg = texts.isEmpty ? 0 : confidenceSum / Double(texts.count)
        resolve(joined, avg)
      }
      request.recognitionLevel = .accurate
      // 계좌번호 인식이 목적이므로 언어 교정은 끔 (숫자 왜곡 방지)
      request.usesLanguageCorrection = false
      if #available(iOS 16.0, *) {
        request.revision = VNRecognizeTextRequestRevision3
        request.recognitionLanguages = ["ko-KR", "en-US"]
      } else {
        request.recognitionLanguages = ["en-US"]
      }

      let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
      do {
        try handler.perform([request])
      } catch {
        reject(error.localizedDescription)
      }
    }
  }
}
