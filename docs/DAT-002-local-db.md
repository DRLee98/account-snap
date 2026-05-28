# DAT-002 로컬 DB 선택 및 구축

## 문서 정보
- ID: DAT-002
- 생성일: 2026-05-28
- 참조문서: [DAT-001 Account 데이터 모델](DAT-001-account-model.md)
- 관계: 의존

## 후보 비교

| 옵션 | 장점 | 단점 | 위젯 공유 |
|------|------|------|-----------|
| **MMKV** | 매우 빠름, 가볍고 동기 API, 위젯에서 직접 읽기 쉬움 | 쿼리/인덱스 없음 (전체 로드 후 필터) | iOS/Android 모두 가능 |
| **WatermelonDB** | RN 친화적 ORM, lazy loading, sync 프로토콜 내장 | 위젯에서 직접 접근 어려움 (브릿지 필요) | 어려움 |
| **SQLite (op-sqlite 등)** | 표준 SQL, 위젯에서도 같은 DB 접근 가능 | RN 측에서 ORM 직접 구성 필요 | iOS App Group + Android 파일 공유로 가능 |

## 선택: MMKV (1차) + 필요시 SQLite 마이그레이션

**이유:**
- 사이드 프로젝트 MVP라 단순함이 최우선
- 계좌 데이터 규모가 작음 (수십~수백 개 예상) → 전체 메모리 로드 부담 없음
- 데이터가 수천 개 넘어가거나 복잡한 쿼리 필요해지면 SQLite로 마이그레이션

## iOS 위젯 공유 — MMKV 사용 불가 (2026-05-28 검증)

WGT-001 PoC에서 확인: react-native-mmkv 3.x가 사용하는 MMKV Objective-C 라이브러리가 `UIApplication.sharedApplication`을 호출 → iOS App Extension(위젯)에서 link 시 컴파일 에러 (`'sharedApplication' is unavailable: not available on iOS (App Extension)`).

**전략 수정:**
- RN 메인 앱: MMKV (그대로)
- 위젯 측 storage: **NSUserDefaults App Group** (`UserDefaults(suiteName: "group.kr.account-snap")`)
- RN이 데이터 변경 시 MMKV에 쓰고 + NSUserDefaults App Group에도 mirror write
- mirror write는 [[WGT-005]] TurboModule로 노출되는 `AppGroup.setString` 통해

Android에서는 MMKV 위젯 사용 가능 (App Extension 제약 없음, 같은 앱 프로세스).

## 저장 구조

MMKV 키 설계:
- `accounts:list` → `Account[]` JSON 직렬화 (전체)
- `accounts:lastUsedId` → 최근 사용 계좌 id (위젯 빠른 조회용)
- `settings:*` → 앱 설정 (테마 등)

## 위젯 공유

MMKV는 iOS App Group / Android는 동일 파일 경로 공유 옵션 제공. [[WGT-001]]에서 구체화.

## 검증 항목

- [ ] RN ↔ 위젯 양쪽에서 같은 데이터 읽기 동작 확인
- [ ] 1000개 계좌 로드 시 성능 (< 50ms 목표)
- [ ] 앱 강제종료 후 데이터 영속성 확인
