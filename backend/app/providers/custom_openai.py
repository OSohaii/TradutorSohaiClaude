"""Custom OpenAI-compatible provider: translation only.

Supports any OpenAI-compatible endpoint (Ollama, LM Studio, OpenRouter, etc.)
with a configurable base URL, API key, and model name. Since we cannot guarantee
the user's model supports vision, only translate_bubbles() is implemented.
"""
from __future__ import annotations

import asyncio
import json
import logging
import re
from typing import Any
from urllib.parse import urlparse

import httpx

from ..errors import ErrorCode, ProviderError
from ..schemas.common import TextBubble, TokenUsage

logger = logging.getLogger(__name__)

_RETRY_CODES = {429, 529}
_RETRY_SUBSTRINGS = ("429", "rate_limit", "quota", "Too Many Requests")

_BLOCKED_HOSTS = {"169.254.169.254", "metadata.google.internal", "100.100.100.200"}


def _validate_url(url: str) -> None:
    """Basic SSRF protection: reject URLs targeting metadata endpoints or non-HTTP schemes."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ProviderError(
            ErrorCode.INVALID_INPUT,
            "custom_openai",
            f"URL scheme '{parsed.scheme}' not allowed. Use http or https.",
        )
    hostname = parsed.hostname or ""
    if hostname in _BLOCKED_HOSTS:
        raise ProviderError(
            ErrorCode.INVALID_INPUT,
            "custom_openai",
            f"URL targeting '{hostname}' is not allowed.",
        )


async def _retry_with_backoff(op, *, max_retries: int = 3, base_delay: float = 2.0):
    last: Exception | None = None
    for attempt in range(max_retries):
        try:
            return await op()
        except Exception as exc:  # noqa: BLE001
            last = exc
            msg = str(exc)
            status = getattr(exc, "status_code", None) or getattr(exc, "status", None)
            is_rate_limit = status in _RETRY_CODES or any(
                token in msg for token in _RETRY_SUBSTRINGS
            )
            if is_rate_limit and attempt < max_retries - 1:
                delay = base_delay * (2**attempt)
                logger.warning("Custom OpenAI rate-limit, retrying in %.1fs", delay)
                await asyncio.sleep(delay)
                continue
            raise
    assert last is not None
    raise last


def _classify_error(exc: Exception) -> ProviderError:
    msg = str(exc)
    status = getattr(exc, "status_code", None) or getattr(exc, "status", None)
    if status in (401, 403) or "invalid_api_key" in msg or "Incorrect API key" in msg:
        return ProviderError(
            ErrorCode.AUTH,
            "custom_openai",
            "Chave do endpoint customizado invalida ou sem acesso ao modelo.",
        )
    if status == 429 or any(s in msg for s in _RETRY_SUBSTRINGS):
        return ProviderError(
            ErrorCode.RATE_LIMIT,
            "custom_openai",
            "Limite de uso do endpoint customizado atingido. Tente novamente em alguns instantes.",
            recoverable=True,
        )
    return ProviderError(ErrorCode.UNKNOWN, "custom_openai", f"Falha endpoint customizado: {msg}")


async def translate_bubbles(
    bubbles: list[TextBubble],
    *,
    base_url: str,
    api_key: str,
    model: str,
    target_language: str = "Portuguese (Brazil)",
) -> tuple[list[TextBubble], TokenUsage]:
    """Translate already-extracted bubbles using an OpenAI-compatible endpoint."""
    if not bubbles:
        return [], TokenUsage(model=model)

    lines = "\n".join(
        f"Line {i}: {b.original_text or b.translated_text}" for i, b in enumerate(bubbles)
    )

    prompt = f"""Translate the following manga text lines to {target_language}.

STRICT RULES:
1. Style: Informal, natural Brazilian Portuguese appropriate for manga/comics.
2. Honorifics: Preserve Japanese honorifics (San, Sama, Kun, Chan, Sensei, Senpai).
3. Slang: Localize English/American slang (e.g. "dude" -> "cara").
4. FANTASY & RPG TERMINOLOGY: keep Skill / Attack / Rank / Title proper nouns
   IN ENGLISH. Translate the sentence around them, not the term itself.
5. Return exactly one translation per line in the JSON array, in the same order.

Input:
{lines}

Respond with JSON: {{"translations": ["translated line 1", "translated line 2", ...]}}"""

    messages = [
        {
            "role": "system",
            "content": "You are a professional manga translator. Follow the Fantasy/RPG terminology rules strictly.",
        },
        {"role": "user", "content": prompt},
    ]

    payload: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "max_tokens": 4096,
        "temperature": 0.2,
    }

    # Build the chat completions URL from the base URL
    url = base_url.rstrip("/") + "/chat/completions"

    _validate_url(base_url)

    headers: dict[str, str] = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    async with httpx.AsyncClient(timeout=60.0) as client:
        async def _call():
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code != 200:
                error_body = resp.text
                exc = Exception(f"Custom OpenAI API error {resp.status_code}: {error_body}")
                exc.status_code = resp.status_code  # type: ignore[attr-defined]
                raise exc
            return resp.json()

        try:
            data = await _retry_with_backoff(_call)
        except Exception as exc:
            raise _classify_error(exc) from exc

    text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    if not text:
        raise ProviderError(
            ErrorCode.UNKNOWN, "custom_openai", "Resposta vazia da traducao do endpoint customizado."
        )

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ProviderError(
            ErrorCode.UNKNOWN, "custom_openai", f"JSON invalido na traducao: {exc}"
        ) from exc

    translations = parsed.get("translations") or []
    if len(translations) != len(bubbles):
        logger.warning(
            "Custom OpenAI translation length mismatch (got %d, expected %d); keeping originals",
            len(translations),
            len(bubbles),
        )
        return list(bubbles), _extract_tokens(data, model)

    out: list[TextBubble] = []
    for bubble, translated in zip(bubbles, translations, strict=True):
        display = translated or ""
        bubble_type = bubble.type
        if display and re.match(r"^\[?SFX:", display, flags=re.IGNORECASE):
            bubble_type = "sfx"
            display = re.sub(r"^\[?SFX:\s*", "", display, flags=re.IGNORECASE).rstrip("]").strip()
        out.append(bubble.model_copy(update={"translated_text": display, "type": bubble_type}))

    return out, _extract_tokens(data, model)


def _extract_tokens(data: dict[str, Any], model: str) -> TokenUsage:
    usage = data.get("usage")
    if not usage:
        return TokenUsage(model=model)
    return TokenUsage(
        input=usage.get("prompt_tokens", 0),
        output=usage.get("completion_tokens", 0),
        total=usage.get("total_tokens", 0),
        model=model,
    )
