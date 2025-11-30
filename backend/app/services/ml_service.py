import asyncio
import httpx
from app.core.config import settings

MAX_RETRIES = 5
RETRY_DELAY = 3.0

def get_optimal_batch_size(total_texts: int) -> int:
    if total_texts <= 200:
        return total_texts
    elif total_texts <= 1000:
        return 500
    elif total_texts <= 10000:
        return 2000
    elif total_texts <= 50000:
        return 5000
    else:
        return 10000

def get_optimal_concurrency(total_texts: int) -> int:
    if total_texts <= 200:
        return 1
    elif total_texts <= 1000:
        return 2
    elif total_texts <= 10000:
        return 5
    elif total_texts <= 50000:
        return 8
    else:
        return 10


async def analyze_single_text(text: str) -> dict:
    timeout = httpx.Timeout(30.0, connect=10.0, read=30.0, write=10.0, pool=5.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        for attempt in range(MAX_RETRIES):
            try:
                response = await client.post(
                    f"{settings.ml_service_url}/predict",
                    json={"text": text}
                )
                response.raise_for_status()
                result = response.json()
                return {
                    "label": result["label"],
                    "label_name": result["label_name"],
                    "confidence": result["confidence"],
                    "probabilities": result["probabilities"]
                }
            except (httpx.RequestError, httpx.ReadError, httpx.ConnectError) as e:
                if attempt == MAX_RETRIES - 1:
                    raise Exception(f"ML service connection error after {MAX_RETRIES} attempts: {str(e)}")
                await asyncio.sleep(RETRY_DELAY * (attempt + 1))
            except httpx.HTTPStatusError as e:
                raise Exception(f"ML service error: {e.response.status_code} - {e.response.text}")


async def _process_batch(client: httpx.AsyncClient, texts_batch: list[str], batch_num: int = 0) -> list[dict]:
    batch_size = len(texts_batch)
    timeout_seconds = max(300.0, batch_size * 0.5)
    
    for attempt in range(MAX_RETRIES):
        try:
            timeout = httpx.Timeout(
                timeout_seconds, 
                connect=120.0,
                read=timeout_seconds, 
                write=120.0, 
                pool=60.0
            )
            response = await client.post(
                f"{settings.ml_service_url}/predict-batch",
                json={"texts": texts_batch},
                timeout=timeout
            )
            response.raise_for_status()
            result = response.json()
            return [
                {
                    "label": r["label"],
                    "label_name": r["label_name"],
                    "confidence": r["confidence"],
                    "probabilities": r["probabilities"]
                }
                for r in result["results"]
            ]
        except (httpx.RequestError, httpx.ReadError, httpx.ConnectError, httpx.TimeoutException) as e:
            if attempt == MAX_RETRIES - 1:
                raise Exception(f"ML service connection error for batch {batch_num} after {MAX_RETRIES} attempts: {str(e)}")
            await asyncio.sleep(RETRY_DELAY * (attempt + 1))
        except httpx.HTTPStatusError as e:
            raise Exception(f"ML service error: {e.response.status_code} - {e.response.text}")


async def analyze_batch_texts(texts: list) -> list:
    import time
    import logging
    logger = logging.getLogger(__name__)
    
    if not texts:
        return []
    
    total_texts = len(texts)
    batch_size = get_optimal_batch_size(total_texts)
    max_concurrent = get_optimal_concurrency(total_texts)
    
    start_time = time.time()
    logger.info(f"[ML_SERVICE] Processing {total_texts} texts with batch_size={batch_size}, max_concurrent={max_concurrent}")
    
    if total_texts <= batch_size:
        timeout = httpx.Timeout(1800.0, connect=120.0, read=1800.0, write=120.0, pool=60.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            result = await _process_batch(client, texts)
            elapsed = time.time() - start_time
            logger.info(f"[ML_SERVICE] Completed {total_texts} texts in {elapsed:.2f}s ({elapsed/total_texts*1000:.2f}ms per text)")
            return result

    batches = [texts[i:i + batch_size] for i in range(0, total_texts, batch_size)]
    num_batches = len(batches)
    
    semaphore = asyncio.Semaphore(max_concurrent)
    
    async def process_with_semaphore(client: httpx.AsyncClient, batch: list[str], batch_num: int) -> list[dict]:
        async with semaphore:
            return await _process_batch(client, batch, batch_num)
    
    max_timeout = max(7200.0, total_texts * 0.3)
    timeout = httpx.Timeout(max_timeout, connect=180.0, read=max_timeout, write=180.0, pool=120.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        tasks = [process_with_semaphore(client, batch, i) for i, batch in enumerate(batches)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
    
    final_results = []
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            raise Exception(f"Error processing batch {i+1}/{num_batches}: {str(result)}")
        final_results.extend(result)
    
    elapsed = time.time() - start_time
    logger.info(f"[ML_SERVICE] Completed {total_texts} texts in {num_batches} batches in {elapsed:.2f}s ({elapsed/total_texts*1000:.2f}ms per text)")
    
    return final_results


def get_sentiment_stats(texts: list) -> dict:
    raise NotImplementedError("Use analyze_batch_texts instead")
