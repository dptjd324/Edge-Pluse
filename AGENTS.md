# Repository Guidelines

## Project Structure & Module Organization
This repository is a small Vite application built with React 19 and TypeScript. Main source files live in `src/`: `main.tsx` bootstraps the app, `App.tsx` contains the current page, and `App.css` plus `index.css` define component and global styles. Static assets that should be bundled from code live in `src/assets/`; public files served as-is live in `public/`. Build output is generated in `dist/` and should not be edited by hand.

## Build, Test, and Development Commands
- `npm install`: install dependencies from `package-lock.json`.
- `npm run dev`: start the Vite dev server with HMR for local work.
- `npm run build`: run TypeScript project builds, then create a production bundle.
- `npm run lint`: run ESLint across the repository.
- `npm run preview`: serve the production build locally for a quick smoke check.

## Coding Style & Naming Conventions
Use TypeScript and functional React components. Follow the existing style: 2-space indentation, single quotes, and semicolons omitted. Keep component files in PascalCase (`App.tsx`), variables and functions in camelCase (`setCount`), and asset filenames lowercase with hyphens only when needed. Prefer colocating component-specific styles with the component and keep shared tokens in `src/index.css`. Lint rules come from [`eslint.config.js`](./eslint.config.js); run `npm run lint` before opening a PR.

## Testing Guidelines
No test runner is configured yet. Until one is added, treat `npm run lint` and `npm run build` as the minimum validation gate, then verify the app manually in `npm run dev` or `npm run preview`. When tests are introduced, place them beside the source file or under a dedicated `src/__tests__/` folder and use `*.test.ts` or `*.test.tsx`.

## Commit & Pull Request Guidelines
Local `.git` history is not present in this workspace, so repository-specific commit conventions could not be inferred. Use short, imperative commit subjects such as `Add hero section spacing`. Keep pull requests focused, describe user-visible changes, list validation steps, and include screenshots for UI updates.

## Configuration Notes
Do not commit `dist/` changes or ad hoc files from local experiments. Keep environment-specific settings out of source unless they are documented and intentionally shared.
# EdgePulse Codex Agent Rules

이 문서는 Codex CLI 에이전트가 따라야 하는 규칙이다.

---

# General Principles

* 코드는 TypeScript로 작성한다.
* 프로젝트 구조를 유지한다.
* 불필요한 라이브러리를 추가하지 않는다.
* MVP 수준의 구현을 우선한다.

---

# File Modification Rules

Codex는 다음 규칙을 따른다.

* 지정된 파일만 수정한다.
* unrelated files 를 수정하지 않는다.
* 파괴적인 git 명령을 사용하지 않는다.

금지 명령

git reset --hard
git clean -fd
git rebase

---

# API Rules

모든 API 응답 형식

success response

{
success: true,
data: {}
}

error response

{
success: false,
error: "message"
}

---

# Database Rules

D1 database 사용

tables

sites
checks

migration 파일 사용

---

# Code Quality

모든 코드에는 다음이 포함되어야 한다.

* 타입 정의
* 에러 처리
* 명확한 함수명

---

# Git Rules

Codex는 변경사항을 다음 방식으로 커밋한다.

workflow

1. 변경된 파일 확인
2. 관련 파일만 git add
3. commit message 생성
4. push to origin

commit message 규칙

feat: new feature
fix: bug fix
refactor: code improvement
docs: documentation

---

# Git Safety

push 전에 반드시

* 변경 파일 목록 요약
* 커밋 메시지 확인

---

# Deployment Rules

Worker 배포는 다음 방법을 사용한다.

wrangler deploy

또는 GitHub Actions

---

# Execution Flow

Codex는 다음 순서를 따른다.

1. PRD.md 읽기
2. TASKS.md 확인
3. 다음 task 선택
4. 코드 작성
5. 테스트
6. git commit
7. git push
