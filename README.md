# Peek (Chrome MV3)

UI 요소를 검사하고 LLM 친화적 컨텍스트를 복사하는 경량 확장입니다. 페이지에 플로팅 패널을 띄우고, 호버 하이라이트 → 클릭 잠금 → 키보드 탐색 → 컨텍스트 복사를 제공합니다.

## 사용법
1) Chrome `chrome://extensions` → 오른쪽 상단 `개발자 모드` On → `압축해제된 확장 프로그램 로드` → 이 폴더 선택.  
2) 아무 페이지나 열고 플로팅 `Peek` 패널에서 `Start` 클릭.  
3) 호버로 하이라이트 확인 → 원하는 요소 클릭해 잠금.  
4) `Ctrl/Cmd + ↑/↓/←/→` 로 부모/자식/형제 이동, `Esc` 로 잠금 해제.  
5) `Copy LLM context` 버튼으로 DOM 경로, 주요 스타일, 데이터셋/ARIA, React 개발 모드 소스 위치(있다면), HTML 스니펫을 클립보드로 복사.

## 파일 구조
- `manifest.json` — MV3 매니페스트, `<all_urls>` 컨텐츠 스크립트/스타일, `clipboardWrite` 권한.
- `src/content-script.js` — 패널/하이라이트/키보드 탐색/컨텍스트 복사 로직.
- `src/content-script.css` — 패널 및 오버레이 스타일.
