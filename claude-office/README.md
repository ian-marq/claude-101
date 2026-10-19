# 🏢 Claude Office

내 PC의 Claude Code 세션과 claude.ai/code 클라우드 세션을 픽셀 빌딩으로 보여주는 페이지.

- 💻 **LOCAL HQ**(땅 위 빌딩): 로컬 세션 하나가 한 층. `~/.claude/projects/**/*.jsonl`을 0.25초마다 tail
- ☁️ **CLAUDE CLOUD**(구름 위 섬): 클라우드 세션 하나가 한 층
- 캐릭터는 지금 쓰는 툴에 맞는 방으로 걸어감

| 방 | 언제 |
|---|---|
| 로비 ❗ | 권한 승인 대기, 질문 대기 → 손 흔들며 나를 부름 |
| 로비 ✔ | 턴이 끝남, 확인 필요 |
| 도서관 | Read · Grep · Glob |
| 작업실 | Edit · Write |
| 기계실 | Bash |
| 통신실 | WebSearch · WebFetch · MCP 툴 |
| 회의실 | Agent(서브에이전트는 꼬마 캐릭터로 표시) |
| 휴게실 | 쉬는 중 (z z z) |

층 명패 오른쪽 막대는 컨텍스트 사용량. 층을 클릭하면 상세 정보와 `claude --resume` 명령어, 또는 claude.ai 링크가 나와요.
나를 기다리는 세션이 생기면 탭 제목이 `(1) ❗`로 바뀌고, 🔔를 켜 두면 소리와 데스크톱 알림이 와요.

## 실행

Node 18 이상. 설치할 패키지 없음.

```bash
node claude-office/server.js            # 로컬만
node claude-office/server.js --cloud    # 로컬 + 클라우드
node claude-office/server.js --demo     # 가짜 세션으로 구경
```

→ http://localhost:4545

옵션: `--port 4545`, `--hours 6`(최근 몇 시간 세션까지 보여줄지), `--include-bridge`(Remote Control로 연결한 로컬 세션도 구름 섬에 표시), `--cloud-feed file.json`(API 대신 JSON 파일 읽기)

## 안전한가?

- 서버는 `127.0.0.1`에만 열리고, Host 헤더도 확인함 (다른 사이트에서 몰래 못 읽음)
- 로컬 쪽은 파일을 **읽기만** 함. 훅이나 설정은 건드리지 않음
- `--cloud`일 때만 Claude Code 로그인 토큰을 읽음 (`~/.claude/.credentials.json`, macOS는 키체인의 `Claude Code-credentials`). 이 토큰은 `api.anthropic.com`으로만 보냄

## 알아둘 점

- 클라우드 목록은 Claude Code CLI가 내부적으로 쓰는 `/v1/code/sessions`를 그대로 씀. **공개 문서화된 API가 아니라서 언젠가 바뀔 수 있음.** 응답 모양이 조금 달라도 버티게 짜 두었고, 실패하면 구름 섬에 이유가 표시됨
- 토큰이 만료되면 401 → 터미널에서 `claude`를 한 번 실행하면 갱신됨
- 로컬 상태(일함/대기/쉼)는 `~/.claude/sessions/<pid>.json`에 있으면 그걸 쓰고, 없으면 jsonl만 보고 추정함. 추정 모드에서는 오래 걸리는 Bash와 권한 대기를 구분하지 못함
