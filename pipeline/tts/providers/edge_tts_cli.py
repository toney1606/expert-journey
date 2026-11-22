"""One edge-tts synthesis attempt. Usage: python edge_tts_cli.py <job.json>

job.json:    {"text", "voice", "rate", "audioPath", "resultPath", "timeoutSec", "boundary"}
resultPath:  {"cues": [{"start", "end", "text"}], "boundaryTypes": {"<type>": count}}
Retries live in the TypeScript caller; this script makes exactly one attempt.
"""
import asyncio
import json
import sys
from pathlib import Path

import edge_tts


async def main(job_path):
    job = json.loads(Path(job_path).read_text(encoding="utf-8"))
    audio = bytearray()
    cues = []
    types = {}

    async def collect():
        communicate = edge_tts.Communicate(
            job["text"], job["voice"], rate=job["rate"], boundary=job.get("boundary", "SentenceBoundary")
        )
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio.extend(chunk["data"])
            elif chunk["type"] in ("SentenceBoundary", "WordBoundary"):
                types[chunk["type"]] = types.get(chunk["type"], 0) + 1
                start = chunk["offset"] / 1e7
                cues.append({"start": start, "end": start + chunk["duration"] / 1e7, "text": chunk["text"]})

    await asyncio.wait_for(collect(), timeout=job.get("timeoutSec", 60))
    if not audio:
        raise RuntimeError("empty audio")
    Path(job["audioPath"]).write_bytes(audio)
    Path(job["resultPath"]).write_text(
        json.dumps({"cues": cues, "boundaryTypes": types}, ensure_ascii=False), encoding="utf-8"
    )


if __name__ == "__main__":
    try:
        asyncio.run(main(sys.argv[1]))
    except Exception as error:  # noqa: BLE001 - surfaced verbatim to the TS caller
        print(f"{type(error).__name__}: {error}", file=sys.stderr)
        sys.exit(1)
