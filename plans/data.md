# DAT 도메인

데이터 모델 및 저장소 설계. 처음부터 클라우드 동기화 가능한 구조로 설계.

| ID | 항목 | 상세문서 | 참조문서 | 상태 | 검증 |
|----|------|----------|----------|------|------|
| DAT-001 | Account 데이터 모델 정의 (sync 가능 구조) | [docs/DAT-001-account-model.md](../docs/DAT-001-account-model.md) | - | ✅ | ⬜ |
| DAT-002 | 로컬 DB 선택 및 구축 (MMKV / WatermelonDB / SQLite) | [docs/DAT-002-local-db.md](../docs/DAT-002-local-db.md) | [docs/DAT-001-account-model.md](../docs/DAT-001-account-model.md) | ✅ | ⬜ |
| DAT-003 | 클라우드 동기화 설계 (추후 구현용) | [docs/DAT-003-cloud-sync.md](../docs/DAT-003-cloud-sync.md) | [docs/DAT-001-account-model.md](../docs/DAT-001-account-model.md) | ⬜ | ⬜ |
