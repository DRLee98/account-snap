# WGT 도메인

iOS WidgetKit / Android Glance 기반 네이티브 위젯. 사용자가 "필수"라고 명시한 핵심 가치.
**앱 정체성 = OCR 도구**라서 위젯의 1순위 액션은 "촬영 단축" (small 위젯의 메인).

| ID | 항목 | 상세문서 | 참조문서 | 상태 | 검증 |
|----|------|----------|----------|------|------|
| WGT-001 | RN ↔ 네이티브 데이터 공유 인프라 (App Group / SharedPreferences) | [docs/WGT-001-native-bridge.md](../docs/WGT-001-native-bridge.md) | [docs/DAT-001-account-model.md](../docs/DAT-001-account-model.md) | ✅ | ✅ |
| WGT-002 | iOS 위젯 (WidgetKit, 3 사이즈, 촬영 단축 우선) | [docs/WGT-002-ios-widget.md](../docs/WGT-002-ios-widget.md) | [docs/WGT-001-native-bridge.md](../docs/WGT-001-native-bridge.md) | ✅ | ✅ |
| WGT-003 | Android 위젯 (Glance, SizeMode.Exact resize) | [docs/WGT-003-android-widget.md](../docs/WGT-003-android-widget.md) | [docs/WGT-001-native-bridge.md](../docs/WGT-001-native-bridge.md) | ✅ | ✅ |
| WGT-004 | 위젯 액션 (딥링크, 클립보드 복사, iOS App Intent + Notification) | [docs/WGT-004-widget-actions.md](../docs/WGT-004-widget-actions.md) | - | ✅ | ✅ |
| WGT-005 | TurboModule spec (AppGroup / WidgetBridge) | [docs/WGT-005-turbomodule-spec.md](../docs/WGT-005-turbomodule-spec.md) | [docs/WGT-001-native-bridge.md](../docs/WGT-001-native-bridge.md) | ✅ | ✅ |
