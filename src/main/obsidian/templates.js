const SOURCE_SECTIONS = `# Summary

# Why It Matters

# Key Details

# Related Narratives

# Related Entities

# Content Angles

# Follow-up Questions

# Raw Source / Notes
`;

function sourceTemplate(type, source = '') {
  return `---
type: ${type}
source: ${source}
source_url:
source_id:
title:
author:
author_handle:
created_at:
captured_at:
ingested_at:
topic:
entities:
chains:
tokens:
narratives:
tags:
status: inbox
relevance_score:
content_potential:
dedupe_key:
raw_source:
---

${SOURCE_SECTIONS}`;
}

export const TEMPLATE_CONTENT = {
  'source-note-template.md': sourceTemplate('source_note'),
  'x-bookmark-template.md': sourceTemplate('x_bookmark', 'x_bookmarks'),
  'x-watchlist-template.md': sourceTemplate('x_watchlist', 'x_watchlist'),
  'opennews-template.md': sourceTemplate('opennews_item', 'opennews'),
  'daily-news-template.md': sourceTemplate('daily_news_item', 'daily_news'),
  'manual-md-template.md': sourceTemplate('manual_md', 'manual_md'),
  'daily-brief-template.md': `---
type: daily_brief
date:
generated_at:
source_count:
status: draft
---

# Daily Crypto + AI Intelligence Brief

## Executive Summary

## Top Crypto Items

## Top AI Items

## Emerging Narratives

## High-Signal X Bookmarks

## Market / Protocol Watch

## Content Ideas

## Deep Research Queue

## Sources Ingested
`,
  'narrative-brief-template.md': `---
type: narrative_brief
title:
narrative:
topic:
entities:
chains:
tokens:
created_at:
updated_at:
status: draft
sources:
---

# Thesis

# Why It Matters

# Evidence

# Counterpoints

# Key Entities

# Content Angles

# Open Questions
`,
  'entity-profile-template.md': `---
type: entity_profile
entity_name:
entity_type:
aliases:
topics:
chains:
tokens:
created_at:
updated_at:
status: active
sources:
---

# Overview

# Why It Matters

# Related Narratives

# Key Links

# Notes
`,
  'content-draft-template.md': `---
type: content_draft
title:
source_note:
topic:
entities:
narratives:
created_at:
status: to_review
channel:
---

# Hook

# Draft

# Supporting Points

# Source Notes

# Review Notes
`
};
