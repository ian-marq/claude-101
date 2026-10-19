# 🏘 Claude Village

Claude Code 세션 하나하나가 **마을**이 되는 페이지예요. 노트북 세션은 땅 위 마을, claude.ai/code 클라우드 세션은 하늘에 떠 있는 섬 마을로 나와요.
폰에서도 볼 수 있어요.

```bash
node claude-village/server.js --cloud --lan   # 노트북 + 클라우드, 폰에서도 보기
node claude-village/server.js --demo          # 가짜 마을로 구경
```

→ http://localhost:4545 · Node 18 이상 · 설치할 패키지 없음

## 마을에서 일어나는 일

| 세션이 하는 일 | 마을에서 |
|---|---|
| 조사 (Read · Grep · Glob · WebSearch · WebFetch) | **도서관**에 불이 켜지고 책이 둥실둥실 떠다님 |
| 코드 작성 (Edit · Write) | **공사장** 크레인이 움직이고, 수정할수록 건물 층이 올라감 |
| 처음 고친 파일 | 마을에 **집이 하나** 생김 ✨ (많이 고친 파일일수록 큰 집) |
| 명령 실행 (Bash) | **공장** 굴뚝에서 연기, 실패하면 💥 |
| 서브에이전트 (Agent) | 마을회관에서 **학생** 🎓이 나와서 자기가 하는 일에 맞는 건물로 감 (Explore → 도서관) |
| MCP · 외부 서비스 | **우체국** 안테나가 신호를 쏘고 비둘기가 날아감 |
| 권한 대기 · 질문 대기 | 촌장이 마을회관 앞에서 손 흔들고 ❗, 종이 울림, 빨간 깃발 |
| 턴 끝남 | 초록 깃발이 올라가고 촌장이 만세 |
| 쉬는 중 | 촌장이 여관에 들어가서 Zzz |
| `git commit` | 🎆 불꽃놀이 |
| `git push` | 🎈 열기구가 떠남 |
| PR 생성 | ✈️ "PR!" 현수막 비행기 |
| 컨텍스트 사용량 | **하루의 시간**: 아침 → 노을 → 밤. 압축(compact)되면 "새 날 🌅" |

카드를 누르면 학생 목록(각자 지금 쓰는 툴), 집 목록(고친 파일), 커밋/푸시 수, 이어가기 명령(`claude --resume …`)이나 claude.ai 링크가 나와요.
나를 기다리는 마을이 생기면 탭 제목이 `(1) ❗`로 바뀌고, 🔔를 켜 두면 소리와 알림이 와요.

## 📱 폰으로 보기 (`--lan`)

- 같은 와이파이: 노트북 화면의 **📱 폰으로 보기** 버튼 → QR 찍기
- 밖에서: 노트북과 폰에 [Tailscale](https://tailscale.com)을 켜 두면 `100.x.x.x` 주소가 같이 나와요 (QR도 그 주소 우선)
- 주소에 붙은 토큰으로 처음 한 번 들어오면 쿠키로 바뀌어요. 토큰이 없으면 401
- 서버를 켤 때마다 토큰이 바뀌어요. 고정하려면 `--token 내토큰`
- 폰 사파리에서 "홈 화면에 추가"하면 앱처럼 열려요

`--lan` 없이 켜면 `127.0.0.1`에서만 열리고, Host 헤더도 검사해요.

## 데이터는 어디서?

- **로컬**: `~/.claude/projects/**/<세션>.jsonl`, 서브에이전트는 `<세션>/subagents/agent-*.jsonl`(+`.meta.json`)을 0.25초마다 tail해요. 실행 상태(일함/대기/쉼)는 `~/.claude/sessions/<pid>.json`에서 읽어요. 파일은 **읽기만** 하고, 훅이나 설정은 건드리지 않아요.
- **클라우드** (`--cloud`): Claude Code 로그인 토큰(`~/.claude/.credentials.json`, macOS는 키체인 `Claude Code-credentials`)으로 `api.anthropic.com/v1/code/sessions`와 각 세션의 `/events`를 3초마다 가져와요. 토큰은 Anthropic API로만 보내요.

## 알아둘 점

- `/v1/code/sessions`는 Claude Code CLI가 내부적으로 쓰는 엔드포인트예요. **공개 문서화된 API가 아니라서 바뀔 수 있어요.** 실패하면 구름 마을 칸에 이유가 표시돼요. 토큰 만료(401)는 터미널에서 `claude`를 한 번 실행하면 갱신돼요.
- 클라우드 이벤트는 최근 60개씩 보기 때문에, 서버를 켜기 전에 지어진 집은 일부만 보일 수 있어요.
- `~/.claude/sessions/<pid>.json`이 없는 버전에서는 jsonl만 보고 상태를 추정해요. 이때는 오래 걸리는 Bash와 권한 대기를 구분하지 못해요.

옵션: `--port 4545`, `--hours 6`(최근 몇 시간 세션까지 보여줄지), `--include-bridge`(Remote Control 로컬 세션도 구름에 표시), `--cloud-feed file.json`(API 대신 JSON 파일)
