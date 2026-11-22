# Vision

Short vertical videos (TikTok / Facebook Reels, 1080x1920, 2-4 minutes) that teach practical
programming knowledge from the **interviewer's** point of view, from intern to senior fullstack.
Each video answers one real interview question: the underlying mechanism (animated diagram), a
refactor with code morph, trade-offs, and a weak vs. strong answer.

## System goal

The owner supplies only a topic and notes. The system generates the script JSON, TTS voice, Remotion
render and automated QA, then places the video in a review queue. The owner is the final approver
and does not edit by hand. Publishing slots: 11:30 and 19:30 daily.

## Principles

- No face on camera. Vietnamese narration, English technical terms kept. Word-by-word captions.
- Every video passes the owner's technical review before publishing.
- Local render first. Data lives as files in Git, no database yet.

> TODO(owner): expand audience, positioning and success metrics.
