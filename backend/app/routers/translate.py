"""Standalone translation endpoint (no OCR step)."""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from ..deps import KeyResolver, get_key_resolver
from ..errors import ErrorCode, ProviderError
from ..providers import deepl as deepl_provider
from ..providers import gemini as gemini_provider
from ..providers import google_translate as gt_provider
from ..providers import openai as openai_provider
from ..providers import claude as claude_provider
from ..providers import deepseek as deepseek_provider
from ..providers import custom_openai as custom_openai_provider
from ..schemas.common import EngineId
from ..schemas.translate import TranslateRequest, TranslateResponse
from ..services.pipeline import (
    _GEMINI_MODELS,
    _OPENAI_MODELS,
    _CLAUDE_MODELS,
    _DEEPSEEK_MODELS,
    _is_gemini,
    _is_openai,
    _is_claude,
    _is_deepseek,
    _is_custom_openai,
)

router = APIRouter()


@router.post("/translate", response_model=TranslateResponse)
async def translate(
    req: TranslateRequest,
    keys: Annotated[KeyResolver, Depends(get_key_resolver)],
) -> TranslateResponse:
    if not req.bubbles:
        return TranslateResponse(bubbles=[])

    engine = req.engine
    if engine == EngineId.GOOGLE:
        return TranslateResponse(bubbles=await gt_provider.translate(req.bubbles))
    if engine == EngineId.DEEPL:
        bubbles = await deepl_provider.translate_in_chunks(
            req.bubbles, api_key=keys.for_deepl()
        )
        return TranslateResponse(bubbles=bubbles)
    if _is_gemini(engine):
        bubbles, tokens = await gemini_provider.translate_bubbles(
            req.bubbles,
            model=_GEMINI_MODELS[engine],
            api_key=keys.for_gemini(),
        )
        return TranslateResponse(bubbles=bubbles, tokens=tokens)
    if _is_openai(engine):
        bubbles, tokens = await openai_provider.translate_bubbles(
            req.bubbles,
            model=_OPENAI_MODELS[engine],
            api_key=keys.for_openai(),
        )
        return TranslateResponse(bubbles=bubbles, tokens=tokens)
    if _is_claude(engine):
        bubbles, tokens = await claude_provider.translate_bubbles(
            req.bubbles,
            model=_CLAUDE_MODELS[engine],
            api_key=keys.for_claude(),
        )
        return TranslateResponse(bubbles=bubbles, tokens=tokens)
    if _is_deepseek(engine):
        bubbles, tokens = await deepseek_provider.translate_bubbles(
            req.bubbles,
            model=_DEEPSEEK_MODELS[engine],
            api_key=keys.for_deepseek(),
        )
        return TranslateResponse(bubbles=bubbles, tokens=tokens)
    if _is_custom_openai(engine):
        bubbles, tokens = await custom_openai_provider.translate_bubbles(
            req.bubbles,
            base_url=keys.custom_base_url(),
            api_key=keys.for_custom_openai(),
            model=keys.custom_model(),
        )
        return TranslateResponse(bubbles=bubbles, tokens=tokens)

    raise ProviderError(
        ErrorCode.INVALID_INPUT,
        engine.value,
        f"Engine '{engine.value}' não suporta tradução de balões pré-extraídos.",
    )
