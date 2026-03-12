---
name: onboarding
description: Claude Code 101 interactive onboarding. Guides beginners through hands-on exercises to learn Claude Code basics step by step.
---

# Claude Code 101 Onboarding

Welcome to Claude Code! This interactive guide walks you through the basics hands-on.

## Instructions

Run each step sequentially. After completing each step:
- Show what happened and explain briefly
- Ask "다음 단계로 넘어갈까요?" before proceeding
- Keep explanations concise and friendly (Korean preferred, match user's language)

If the user seems stuck or confused at any step, offer to explain more or skip ahead.

---

## Step 1: Claude / Cowork / Code 차이점

먼저 Claude 제품군의 차이를 간단히 설명합니다:

| 제품 | 설명 |
|------|------|
| **Claude** (claude.ai) | 웹/앱 채팅 AI. 대화로 질문 & 답변, 파일 업로드 분석 |
| **Claude Cowork** (claude.ai/cowork) | 웹에서 문서/코드 실시간 협업. 공유 워크스페이스 |
| **Claude Code** (터미널/VS Code) | 내 컴퓨터에서 직접 파일을 읽고, 수정하고, 명령을 실행하는 AI 동료 |

**Explain:** "지금 우리가 사용하고 있는 것이 Claude Code입니다. 채팅 AI와 달리 여러분의 컴퓨터에서 직접 작업합니다."

---

## Step 2: First Conversation — 파일 읽기 체험

Say hello and introduce yourself. Then demonstrate file reading:

1. List files in the current directory
2. Pick an interesting file (README, package.json, or any config file) and read it
3. Explain what the project seems to be about, based on what you read

**Explain:** "방금 여러분 컴퓨터의 파일을 직접 읽었습니다. 채팅 AI였다면 파일 내용을 복사해서 붙여넣어야 했을 거예요. Claude Code는 직접 볼 수 있습니다."

---

## Step 3: 실행 방법 — 터미널 / VS Code / Desktop App

Claude Code를 실행하는 3가지 방법을 설명합니다:

1. **터미널**: `cd 프로젝트폴더 && claude` — 가장 강력한 방법. 개발자 친화적.
2. **VS Code 확장**: Extensions에서 "Claude Code" 검색 → Install. 에디터 안에서 바로 사용.
3. **Claude Desktop App**: claude.ai에서 앱 다운로드. 비개발자도 바로 시작 가능.

**Tip:** Mac Finder에서 폴더를 Option(⌥) 누른 채 우클릭하면 "경로 복사"가 나옵니다. 터미널에서 `cd` + 붙여넣기(⌘V)로 원하는 폴더로 이동할 수 있습니다.

---

## Step 4: 유용한 명령어 체험

Walk the user through these commands one at a time:

1. **`/cost`** — 현재 토큰 사용량을 보여줍니다. "이 대화가 지금까지 얼마나 들었는지 볼 수 있습니다."
2. **`/model`** — 현재 모델을 확인합니다. 세 가지 모델 설명:
   - Opus = 시니어 엔지니어 (가장 똑똑, 느리고 비쌈)
   - Sonnet = 미드레벨 개발자 (속도 + 품질 균형, 기본값)
   - Haiku = 인턴 (가장 빠르고 저렴, 단순 작업용)
3. **`/compact`** — 대화를 압축합니다. "대화가 길어지면 토큰을 절약할 수 있습니다. CLAUDE.md 내용은 유지됩니다."

---

## Step 5: Plan 모드 체험

Plan 모드와 일반 모드의 차이를 체험합니다.

1. "Plan 모드를 보여드리겠습니다. `Shift+Tab`을 누르거나 `/plan`을 입력해보세요."
2. 사용자가 Plan 모드로 전환하도록 안내
3. Plan 모드에서 간단한 계획을 제안:
   - "이 폴더에 hello-world 스크립트를 만드는 계획을 세워볼게요"
   - 계획만 보여주고 실행하지 않음
4. "Plan 모드에서는 계획만 세우고 실행하지 않습니다. 접근 방식을 미리 검토하고 싶을 때 유용합니다."
5. `Shift+Tab`으로 일반 모드로 돌아가도록 안내

---

## Step 6: "이것도 돼?" — 상상력 테스트

Tell the user:

"Claude Code는 까만 터미널 창 하나로 놀라운 것들을 할 수 있습니다:

- 내일 오후 미팅 시간 옮기기 (Google Calendar 연동)
- 경쟁사 앱 UI 스크린샷 찍어서 정리하기 (브라우저 자동화)
- 매일 아침 환율 체크해서 Slack에 보내기 (크론 + Slack)
- 폴더에 있는 계약서 30개 한번에 요약하기 (PDF 일괄 처리)
- 노션 보드 업데이트하기 (Notion API 연동)

이런 것들은 MCP(Model Context Protocol)라는 외부 서비스 연동 기능으로 가능합니다.
궁금한 게 있으면 뭐든 시켜보세요!"

Wait for the user's question and answer it.

---

## Step 7: 기억 체계 — CLAUDE.md와 Memory

Claude Code의 기억 시스템을 설명합니다:

"Claude Code는 매 세션마다 기억이 리셋됩니다. 마치 매일 첫 출근하는 신입사원처럼요. 그래서 기억 장치가 필요합니다:

| 계층 | 역할 |
|------|------|
| **CLAUDE.md** | 헌법 — 프로젝트 기본 원칙 |
| **Rules** | 법률 — 상황별 자동 적용 규칙 |
| **Skills** | 업무 자동화 — /명령어로 실행 |
| **Auto Memory** | 업무일지 — AI가 스스로 기록 |
| **Session Log** | 프로젝트 일지 — 팀이 만드는 맥락 |

`/memory`로 현재 기억된 내용을 확인할 수 있습니다."

---

## Step 8: /clear 체험 — 세션 리셋과 기억의 힘

이 단계에서는 `/clear`가 세션을 날리지만 기억 체계 덕분에 맥락이 유지되는 것을 직접 체험합니다.

**준비:**

1. 먼저 현재 세션에서 간단한 작업을 하나 합니다:
   - "이 프로젝트에 대해 한 줄로 요약해줘" 같은 질문에 답변
2. 사용자에게 `/memory`를 실행하게 합니다:
   - "이게 Claude가 세션 사이에 기억하는 내용입니다. CLAUDE.md, Rules, Auto Memory 등이 여기에 포함됩니다."

**체험:**

3. 사용자에게 `/clear`를 실행하게 합니다:
   - "지금부터 `/clear`를 치면 이 대화가 전부 사라집니다. 한번 해보세요."
4. `/clear` 후, 사용자에게 아무 질문이나 하게 합니다:
   - "방금 대화 내용은 전부 날아갔지만, CLAUDE.md와 Rules, Auto Memory는 그대로 남아있습니다."
   - "아까 한 작업을 기억하냐고 물어보세요 — 기억 못합니다. 하지만 프로젝트가 뭔지, 어떤 규칙을 따라야 하는지는 알고 있습니다."

**Explain:** "이게 기억 체계의 핵심입니다. 대화(세션)는 휘발되지만, CLAUDE.md와 Rules는 영구적입니다. 마치 신입사원이 어제 점심 뭐 먹었는지는 모르지만, 회사 규정은 알고 있는 것과 같습니다."

---

## Step 9: /init 체험 — 세션 시작의 베스트 프랙티스

`/init`은 새 세션을 시작할 때 Claude가 프로젝트 상태를 스스로 파악하게 하는 명령어입니다.

**언제 쓰나요?**

1. **매 세션 시작 시**: 새로 대화를 열고 `/init`을 치면 Claude가 알아서 프로젝트를 살펴봅니다:
   - CLAUDE.md, 최근 git 변경사항, 진행 중인 작업 등을 확인
   - "이전 세션에서 여기까지 했고, 다음에 이걸 하면 좋겠습니다" 같은 제안
   - 미완성 TODO, 열린 이슈 등을 정리

2. **프로젝트에 처음 들어갈 때**: 처음 보는 프로젝트에서 `/init`을 치면:
   - 프로젝트 구조와 기술 스택을 파악
   - CLAUDE.md가 없으면 만들어줄지 제안
   - "이 프로젝트는 이런 구조이고, 이런 기술을 쓰고 있습니다" 요약

**체험:**

1. 사용자에게 `/init`을 실행하게 합니다
2. Claude가 프로젝트를 살펴보고 요약하는 것을 보여줍니다
3. **Explain:** "`/init`은 아침에 출근해서 어제 하던 일을 이어받는 것과 같습니다. 매번 처음부터 설명할 필요 없이, Claude가 스스로 맥락을 파악합니다."

---

## Step 10: What's Next — 마무리

After the user has tried a few things, summarize:

"오늘 체험한 내용을 정리하면:

1. Claude / Cowork / Code의 차이점
2. Claude Code는 여러분 컴퓨터에서 직접 파일을 읽고 수정합니다
3. 터미널, VS Code, Desktop App 세 가지 방법으로 실행 가능합니다
4. `/cost`로 비용 확인, `/compact`로 토큰 절약, `/model`로 모델 전환
5. Plan 모드(`Shift+Tab`)로 실행 전에 계획을 검토할 수 있습니다
6. MCP로 외부 서비스(캘린더, Slack, Notion 등)와 연동 가능합니다
7. CLAUDE.md, Rules, Skills로 기억과 워크플로우를 관리합니다
8. `/clear`로 세션을 리셋해도 기억 체계(CLAUDE.md, Rules)는 유지됩니다
9. `/init`으로 매 세션 시작 시 프로젝트 맥락을 빠르게 파악할 수 있습니다

**스스로 탐색해보세요:**
- **CLAUDE.md**: 프로젝트 루트에 만들면 Claude에게 지속적인 지시를 줄 수 있습니다
- **커뮤니티 스킬**: skills.sh에서 87,000개 이상의 스킬을 찾아보세요
- **공식 문서**: https://code.claude.com/docs/en/overview

가장 중요한 팁: **일단 시켜보세요.** Claude Code가 할 수 있을지 모르겠으면, 시켜보면 됩니다."
