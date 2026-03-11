---
name: onboarding
description: Claude Code 101 interactive onboarding. Guides beginners through hands-on exercises to learn Claude Code basics step by step.
disable-model-invocation: true
---

# Claude Code 101 Onboarding

Welcome to Claude Code! This interactive guide walks you through the basics hands-on.

## Instructions

Run each step sequentially. After completing each step:
- Show what happened and explain briefly
- Ask "Ready for the next step?" before proceeding
- Keep explanations concise and friendly (Korean preferred, match user's language)

If the user seems stuck or confused at any step, offer to explain more or skip ahead.

---

## Step 1: First Conversation

Say hello and introduce yourself. Then demonstrate file reading:

1. List files in the current directory
2. Pick an interesting file (README, package.json, or any config file) and read it
3. Explain what the project seems to be about, based on what you read

**Explain to the user:** "I just read files on your computer directly. In a chat AI, you'd have to copy-paste the file contents. Here, I can just look at them myself."

---

## Step 2: Try Useful Commands

Walk the user through these commands one at a time:

1. **`/cost`** — Show current token usage. Explain: "This shows how much this conversation has cost so far."
2. **`/model`** — Show the current model. Explain the three models:
   - Opus = senior engineer (smartest, slowest, most expensive)
   - Sonnet = mid-level developer (balanced - good default)
   - Haiku = intern (fastest, cheapest, for simple tasks)
3. **`/compact`** — Compact the conversation. Explain: "This summarizes our conversation to save tokens. Useful when chats get long."

---

## Step 3: Plan Mode

Demonstrate the difference between Plan Mode and Normal Mode.

1. Tell the user: "I'm going to show you Plan Mode. Press `Shift+Tab` or type `/plan` to switch."
2. Ask the user to switch to Plan Mode
3. Once in Plan Mode, propose a plan for something simple:
   - "Let me plan how to create a hello-world script in this folder"
   - Show the plan WITHOUT executing anything
4. Explain: "In Plan Mode, I only think and plan. I don't touch any files. This is useful when you want to review my approach before I act."
5. Ask the user to switch back to Normal Mode (`Shift+Tab` again)

---

## Step 4: Ask Me Anything

Tell the user:

"You've now experienced the core features of Claude Code:
- **File access**: I can read and modify files directly
- **Commands**: /cost, /model, /compact, /plan, and more
- **Plan Mode**: Review my approach before I execute
- **Models**: Choose between Opus, Sonnet, and Haiku

Now it's your turn. Ask me anything! Some ideas:
- 'Explain the structure of this project'
- 'Find all TODO comments in this codebase'
- 'Create a simple script that does X'
- 'What files were changed recently in git?'

Or ask about Claude Code itself — I can explain any feature."

Wait for the user's question and answer it.

---

## Step 5: What's Next

After the user has tried a few things, summarize:

"Here's what you learned today:

1. Claude Code reads and modifies files directly on your computer
2. `/cost` shows usage, `/compact` saves tokens, `/model` switches brains
3. Plan Mode (`Shift+Tab`) lets you review before executing
4. The best way to learn is to just try things — even things you think won't work

**Next steps to explore on your own:**
- **CLAUDE.md**: Create a CLAUDE.md file in your project root to give Claude persistent instructions
- **Memory**: Claude remembers things across sessions via auto-memory (`/memory` to check)
- **Skills**: Type `/` to see available skills, or visit the plugin marketplace (`/plugin`)
- **Official docs**: https://code.claude.com/docs/en/overview

The most important tip: **just ask.** If you're unsure whether Claude Code can do something, try it. The worst that happens is it says no."
