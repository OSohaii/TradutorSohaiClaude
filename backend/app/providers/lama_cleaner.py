"""Lama Cleaner inpainting provider.

Sends an image and a binary mask to a Lama Cleaner endpoint. The mask is a
PNG where white pixels (255) mark the areas to inpaint (text regions) and
black pixels (0) mark areas to preserve.

The endpoint returns the cleaned image with text removed.
"""
from __future__ import annotations

import asyncio
import logging

import httpx

from ..errors import ErrorCode, ProviderError

logger = logging.getLogger(__name__)

_MAX_RETRIES = 3
_RETRY_BACKOFF = [1.0, 2.0, 4.0]


async def inpaint(
    image_bytes: bytes,
    mask_bytes: bytes,
    lama_url: str = "http://localhost:8080",
) -> bytes:
    """POST image + mask to Lama Cleaner and return cleaned image bytes.

    Parameters
    ----------
    image_bytes : bytes
        The original manga page image (PNG/JPEG).
    mask_bytes : bytes
        A PNG mask image (black background, white rectangles where text is).
    lama_url : str
        Base URL of the Lama Cleaner service.

    Returns
    -------
    bytes
        The inpainted (cleaned) image bytes.
    """
    url = f"{lama_url.rstrip('/')}/inpaint"

    for attempt in range(_MAX_RETRIES):
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                files = {
                    "image": ("image.png", image_bytes, "image/png"),
                    "mask": ("mask.png", mask_bytes, "image/png"),
                }
                response = await client.post(url, files=files)

            if response.status_code == 200:
                return response.content

            if response.status_code == 429 or response.status_code >= 500:
                if attempt < _MAX_RETRIES - 1:
                    delay = _RETRY_BACKOFF[attempt]
                    logger.warning(
                        "Lama Cleaner returned %d, retrying in %.1fs (attempt %d/%d)",
                        response.status_code,
                        delay,
                        attempt + 1,
                        _MAX_RETRIES,
                    )
                    await asyncio.sleep(delay)
                    continue

            raise ProviderError(
                ErrorCode.NETWORK,
                engine="lama_cleaner",
                message=f"Lama Cleaner returned HTTP {response.status_code}: {response.text[:200]}",
            )

        except httpx.HTTPError as exc:
            if attempt < _MAX_RETRIES - 1:
                delay = _RETRY_BACKOFF[attempt]
                logger.warning(
                    "Lama Cleaner network error: %s, retrying in %.1fs",
                    str(exc),
                    delay,
                )
                await asyncio.sleep(delay)
                continue
            raise ProviderError(
                ErrorCode.NETWORK,
                engine="lama_cleaner",
                message=f"Falha ao conectar com Lama Cleaner em {lama_url}: {exc}",
            ) from exc

    # Should not reach here, but just in case
    raise ProviderError(
        ErrorCode.NETWORK,
        engine="lama_cleaner",
        message="Lama Cleaner: max retries exceeded.",
    )
