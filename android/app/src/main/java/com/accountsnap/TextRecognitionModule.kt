package com.accountsnap

import android.net.Uri
import com.drlee98.accountsnap.specs.NativeTextRecognitionSpec
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.korean.KoreanTextRecognizerOptions

@ReactModule(name = NativeTextRecognitionSpec.NAME)
class TextRecognitionModule(reactContext: ReactApplicationContext) :
    NativeTextRecognitionSpec(reactContext) {

  override fun recognize(imageUri: String, promise: Promise) {
    try {
      val image = InputImage.fromFilePath(reactApplicationContext, Uri.parse(imageUri))
      val recognizer = TextRecognition.getClient(KoreanTextRecognizerOptions.Builder().build())
      recognizer
          .process(image)
          .addOnSuccessListener { result ->
            val lines = result.textBlocks.flatMap { it.lines }
            // ML Kit은 라인 단위 confidence를 제공 (미제공 라인은 평균에서 제외)
            val confidences = lines.map { it.confidence }.filter { it > 0f }
            val avg =
                if (confidences.isEmpty()) DEFAULT_CONFIDENCE
                else confidences.sum() / confidences.size

            // 라인 단위 블록 + 픽셀 좌표(원점 좌상단). 읽기 순서 정렬은 JS에서 한다.
            val blocks = Arguments.createArray()
            for (line in lines) {
              val box = line.boundingBox ?: continue
              blocks.pushMap(
                  Arguments.createMap().apply {
                    putString("text", line.text)
                    putDouble(
                        "confidence",
                        (if (line.confidence > 0f) line.confidence else DEFAULT_CONFIDENCE)
                            .toDouble(),
                    )
                    putDouble("x", box.left.toDouble())
                    putDouble("y", box.top.toDouble())
                    putDouble("width", box.width().toDouble())
                    putDouble("height", box.height().toDouble())
                  })
            }

            val map =
                Arguments.createMap().apply {
                  putString("text", result.text.replace('\n', ' '))
                  putDouble("confidence", avg.toDouble())
                  putArray("blocks", blocks)
                }
            promise.resolve(map)
          }
          .addOnFailureListener { e ->
            promise.reject("text_recognition_failed", e.message, e)
          }
    } catch (e: Exception) {
      promise.reject("text_recognition_failed", e.message, e)
    }
  }

  companion object {
    private const val DEFAULT_CONFIDENCE = 0.85f
  }
}
