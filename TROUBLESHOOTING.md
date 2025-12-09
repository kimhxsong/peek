# Troubleshooting Guide

## Issue: React 컴포넌트 인식 불가

### 증상
- React DevTools에서는 컴포넌트를 정상적으로 인식함
- myinspector에서는 React 컴포넌트를 인식하지 못함
- `hasReactOnPage()` → `false` 반환
- `readReactInfo(el)` → `null` 반환

### 원인 분석

#### Chrome Extension Content Script의 Isolated World

Chrome Extension의 content script는 기본적으로 **Isolated World**에서 실행됩니다.

```
┌─────────────────────────────────────────────────────────┐
│                      웹 페이지                           │
├─────────────────────────────────────────────────────────┤
│  MAIN World (페이지 JavaScript 컨텍스트)                 │
│  ├─ window.__REACT_DEVTOOLS_GLOBAL_HOOK__               │
│  ├─ DOM 요소.__reactFiber$xxx                           │
│  └─ React Runtime                                        │
├─────────────────────────────────────────────────────────┤
│  ISOLATED World (Content Script 기본 실행 환경)          │
│  ├─ DOM 접근 가능 (HTML 구조만)                          │
│  ├─ window 객체 별도 인스턴스                            │
│  └─ __reactFiber* 등 JS 속성 접근 불가                   │
└─────────────────────────────────────────────────────────┘
```

#### 접근 불가한 항목들

| 항목 | 설명 | Isolated World에서 |
|------|------|---------------------|
| `window.__REACT_DEVTOOLS_GLOBAL_HOOK__` | React DevTools 글로벌 훅 | `undefined` |
| `element.__reactFiber$xxx` | React Fiber 노드 참조 | `undefined` |
| `element.__reactProps$xxx` | React Props 참조 | `undefined` |
| `element.__reactContainer$xxx` | React 컨테이너 참조 | `undefined` |

### 해결 방법

#### Manifest V3: `world: "MAIN"` 옵션 사용

```json
// manifest.json
{
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["src/content-script.js"],
      "css": ["src/content-script.css"],
      "run_at": "document_idle",
      "world": "MAIN"  // 핵심 변경사항
    }
  ]
}
```

#### World 옵션 비교

| 속성 | `ISOLATED` (기본값) | `MAIN` |
|------|---------------------|--------|
| DOM 접근 | O | O |
| 페이지 JS 변수 접근 | X | O |
| `__reactFiber*` 접근 | X | O |
| `chrome.*` API | O | X |
| 보안 격리 | 강함 | 약함 |

### 주의사항

#### `world: "MAIN"` 사용 시 제한사항

1. **Chrome API 접근 불가**
   - `chrome.runtime`, `chrome.storage` 등 사용 불가
   - 필요시 별도 Isolated World 스크립트와 메시징 필요

2. **보안 고려**
   - 페이지 스크립트가 content script의 변수에 접근 가능
   - 민감한 데이터 처리 시 주의 필요

3. **네임스페이스 충돌**
   - 전역 변수명이 페이지와 충돌할 수 있음
   - IIFE 또는 고유 prefix 사용 권장

#### 현재 구현에서의 영향

현재 `content-script.js`는:
- `navigator.clipboard.writeText()` 사용 → MAIN world에서도 동작
- Chrome API 미사용 → 문제 없음
- IIFE로 감싸져 있음 → 네임스페이스 충돌 최소화

### 디버깅 방법

#### 1. World 확인
```javascript
// content-script.js에 추가하여 확인
console.log('[myinspector] World check:', {
  hasDevToolsHook: !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__,
  hookRenderers: window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers?.size
});
```

#### 2. Fiber 직접 확인
```javascript
// 콘솔에서 테스트
const el = document.querySelector('button'); // 아무 React 요소
const keys = Object.keys(el).filter(k => k.startsWith('__react'));
console.log('React keys:', keys);
```

#### 3. DevTools Console에서 비교
```javascript
// 페이지 컨텍스트 (React 요소 선택 후)
$0.__reactFiber$xxx  // 존재해야 함

// Extension 콘텐츠 스크립트에서
Object.keys($0).filter(k => k.includes('react'))  // world: MAIN이면 동일하게 보임
```

### 관련 링크

- [Chrome MV3 Content Scripts - World](https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts#world)
- [React DevTools Architecture](https://github.com/facebook/react/tree/main/packages/react-devtools)
- [React Fiber Architecture](https://github.com/acdlite/react-fiber-architecture)

---

## Issue: React 컴포넌트가 "div"로만 표시됨

### 증상
- React 감지는 되지만 컴포넌트 이름이 "div", "span" 등 HTML 태그로만 표시됨
- 실제 React 컴포넌트 이름(Button, Header 등)이 보이지 않음

### 원인 분석

#### Fiber Tree 탐색 로직 문제

기존 `extractReactInfoFromFiber` 함수가 Host Component에서 바로 반환:

```javascript
// 문제 코드
if (node._debugSource || componentName) {  // "div"도 truthy
  return { componentName, source };        // 즉시 반환 → "div" 표시
}
```

#### React Fiber 구조

```
                    Fiber Tree
┌─────────────────────────────────────────────┐
│  App (함수 컴포넌트)                         │
│    ↓ return                                  │
│  Header (함수 컴포넌트) ← 찾아야 할 대상      │
│    ↓ return                                  │
│  "div" (Host Component) ← 여기서 멈춤        │
│    ↓ return                                  │
│  "span" (Host Component)                     │
└─────────────────────────────────────────────┘
```

### 해결 방법

Host Component(문자열 타입)는 건너뛰고 실제 함수/클래스 컴포넌트까지 탐색:

```javascript
function extractReactInfoFromFiber(fiber) {
  let node = fiber;
  let hostElement = null;

  while (node) {
    const type = node.type || node.elementType;

    // Host component - save as fallback, continue up
    if (typeof type === "string") {
      if (!hostElement) hostElement = type;
      node = node.return;
      continue;  // 건너뛰고 계속 탐색
    }

    // Function/class component found
    if (typeof type === "function" || typeof type === "object") {
      const componentName = type.displayName || type.name || null;
      if (componentName) {
        return { componentName, source, hostElement };
      }
    }
    node = node.return;
  }

  return hostElement ? { componentName: hostElement, source: null } : null;
}
```

### 출력 형식

수정 후 출력 예시:
```
react: Button > div (src/components/Button.tsx:45:12)
       ^^^^^^   ^^^
       컴포넌트  호스트요소
```

### 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|-----------|
| 2025-12-08 | 0.0.4 | Fiber 탐색 로직 수정 - Host Component 건너뛰기 |
| 2025-12-07 | 0.0.3 | `world: "MAIN"` 추가로 React 컴포넌트 인식 문제 해결 |
