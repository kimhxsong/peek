# AI UI Inspector (Chrome MV3)

컨텐츠 스크립트 기반의 경량 UI 인스펙터 확장입니다. 페이지에 플로팅 패널을 띄우고, 호버 하이라이트 → 클릭 잠금 → 키보드 탐색 → LLM 프롬프트용 컨텍스트 복사를 제공합니다.

## 사용법
1) Chrome `chrome://extensions` → 오른쪽 상단 `개발자 모드` On → `압축해제된 확장 프로그램 로드` → 이 폴더 선택.  
2) 아무 페이지나 열고 플로팅 `AI Inspector` 패널에서 `Start` 클릭.  
3) 호버로 하이라이트 확인 → 원하는 요소 클릭해 잠금.  
4) `Ctrl/Cmd + ↑/↓/←/→` 로 부모/자식/형제 이동, `Esc` 로 잠금 해제.  
5) `Copy LLM context` 버튼으로 DOM 경로, 주요 스타일, 데이터셋/ARIA, React 개발 모드 소스 위치(있다면), HTML 스니펫을 클립보드로 복사.

## 파일 구조
- `manifest.json` — MV3 매니페스트, `<all_urls>` 컨텐츠 스크립트/스타일, `clipboardWrite` 권한.
- `src/content-script.js` — 패널/하이라이트/키보드 탐색/컨텍스트 복사 로직.
- `src/content-script.css` — 패널 및 오버레이 스타일.

## 커스터마이즈 포인트
- 스타일/속성 추출 항목은 `src/content-script.js` 의 `styleKeys`, `collectAttributes` 에서 조정.
- React 개발 모드에서 소스 위치 추출은 `readReactSource` 를 통해 `__reactFiber` 계열 디버그 정보를 읽어옵니다. 프로덕션 번들에서는 없을 수 있습니다.
- `<all_urls>` 대신 특정 도메인으로 제한하려면 `manifest.json` 의 `matches` 를 수정하세요.

## 아이콘
아이콘 에셋은 포함되지 않았습니다. 필요 시 `icons` 폴더를 만들고 16/48/128px PNG를 추가한 뒤 `manifest.json` 의 `icons` 필드를 설정하세요.
