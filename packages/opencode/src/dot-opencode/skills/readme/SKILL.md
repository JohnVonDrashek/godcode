---
name: readme
description: Use when creating, updating, or simplifying README files. 
---

# README

Research-backed principles for effective READMEs.

## Keep

| Section | Research |
|---------|----------|
| What it does | Most common need [Prana 2019] |
| Installation | Correlates with stars [Liu 2022] |
| Usage example | Code snippets = adoption [Liu 2022] |
| Why/motivation | Often missing, high value [Prana 2019] |

## Remove

| Section | Reason |
|---------|--------|
| Project structure | Redundant with filesystem |
| Dependencies | In package manager files |
| Detailed implementation | Move to subfolder READMEs |

## Format

- Lists over prose [arXiv:2206.10772]
- Images/badges increase engagement [arXiv:2206.10772]
- Subfolder READMEs: one-liner per file (table format)

## Don't

- Duplicate info available elsewhere (pyproject.toml, filesystem)
- Write prose when a list works
- Add sections "just in case"
- Document internal implementation details in root README
