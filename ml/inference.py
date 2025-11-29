import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import os

MODEL_PATH = os.getenv('MODEL_PATH', './models/rubert-finetuned')
BASE_MODEL_NAME = "blanchefort/rubert-base-cased-sentiment"

# Константы из train_model.py
NUM_LABELS = 3
MAX_LENGTH = 512

# Оптимальный размер батча для inference
# Для GPU: 256-512, для CPU: 64-128
# Используем адаптивный размер в зависимости от устройства
INFERENCE_BATCH_SIZE_GPU = 512
INFERENCE_BATCH_SIZE_CPU = 128

LABEL_NAMES = {0: "нейтральная", 1: "положительная", 2: "негативная"}
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Определяем оптимальный размер батча для inference
INFERENCE_BATCH_SIZE = INFERENCE_BATCH_SIZE_GPU if torch.cuda.is_available() else INFERENCE_BATCH_SIZE_CPU

# Загрузка модели: если локальная модель существует, используем её, иначе базовую из HuggingFace
# Модель загружается один раз при старте приложения (singleton)
if os.path.exists(MODEL_PATH) and os.path.exists(os.path.join(MODEL_PATH, "config.json")):
    print(f"Loading fine-tuned model from {MODEL_PATH}")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH)
else:
    print(f"Local model not found at {MODEL_PATH}, using base model: {BASE_MODEL_NAME}")
    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL_NAME)
    model = AutoModelForSequenceClassification.from_pretrained(BASE_MODEL_NAME, num_labels=NUM_LABELS)

# Критически важно: модель в режиме eval и на правильном устройстве
model.eval()
model.to(DEVICE)

# Оптимизация: компилируем модель для ускорения (PyTorch 2.0+)
try:
    if hasattr(torch, 'compile'):
        model = torch.compile(model, mode='reduce-overhead')
        print(f"Model compiled with torch.compile for faster inference on {DEVICE}")
except Exception as e:
    print(f"torch.compile not available or failed: {e}, using standard model")

print(f"Inference batch size: {INFERENCE_BATCH_SIZE} (device: {DEVICE})")


def predict(text: str) -> dict:
    """Predict sentiment for a single text"""
    # Токенизация
    inputs = tokenizer(
        text,
        truncation=True,
        max_length=MAX_LENGTH,
        padding=True,
        return_tensors='pt'
    )
    # Переносим на устройство одним словарем (быстрее)
    inputs = {k: v.to(DEVICE) for k, v in inputs.items()}

    # Используем torch.inference_mode() вместо torch.no_grad() - быстрее
    with torch.inference_mode():
        logits = model(**inputs).logits
        probabilities = torch.softmax(logits, dim=-1)
        pred_class = torch.argmax(logits, dim=-1).item()
        confidence = probabilities[0][pred_class].item()

    return {
        'label': pred_class,
        'label_name': LABEL_NAMES[pred_class],
        'confidence': round(confidence, 4),
        'probabilities': {
            LABEL_NAMES[i]: round(probabilities[0][i].item(), 4)
            for i in range(NUM_LABELS)
        }
    }


def predict_batch(texts: list) -> list:
    """
    Predict sentiment for multiple texts - максимально оптимизированная батч-обработка.
    
    Использует оптимальный размер батча для inference (512 для GPU, 128 для CPU)
    и обрабатывает большие списки текстов чанками.
    """
    if not texts:
        return []
    
    # Обрабатываем тексты оптимальными батчами для inference
    results = []
    for i in range(0, len(texts), INFERENCE_BATCH_SIZE):
        chunk = texts[i:i + INFERENCE_BATCH_SIZE]
        chunk_results = _process_batch_chunk(chunk)
        results.extend(chunk_results)
    
    return results


def _process_batch_chunk(texts: list) -> list:
    """
    Обрабатывает один чанк текстов с максимальной оптимизацией.
    
    Оптимизации:
    - Batched токенизация (все тексты сразу)
    - torch.inference_mode() вместо torch.no_grad()
    - Минимальные переводы между CPU/GPU
    - Векторизованные операции
    """
    # Токенизация всех текстов батча сразу (критически важно для скорости)
    inputs = tokenizer(
        texts,
        truncation=True,
        max_length=MAX_LENGTH,
        padding=True,
        return_tensors='pt'
    )
    # Переносим на устройство одним словарем (быстрее чем .to(DEVICE) на каждом тензоре)
    inputs = {k: v.to(DEVICE) for k, v in inputs.items()}
    
    # Используем torch.inference_mode() - быстрее чем torch.no_grad()
    with torch.inference_mode():
        logits = model(**inputs).logits
        probabilities = torch.softmax(logits, dim=-1)
        # Векторизованные операции: argmax и max для всего батча сразу
        pred_classes = torch.argmax(logits, dim=-1)
        confidences = torch.max(probabilities, dim=-1)[0]
    
    # Переносим результаты на CPU одним батчем (быстрее чем по одному)
    pred_classes_cpu = pred_classes.cpu()
    confidences_cpu = confidences.cpu()
    probabilities_cpu = probabilities.cpu()
    
    # Очищаем GPU память сразу после переноса
    del inputs, logits, probabilities, pred_classes, confidences
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    
    # Формируем результаты - используем list comprehension для скорости
    # Избегаем лишних вызовов .item() и преобразований
    batch_size = len(texts)
    results = []
    for i in range(batch_size):
        label = int(pred_classes_cpu[i])
        conf = float(confidences_cpu[i])
        probs = probabilities_cpu[i]
        
        results.append({
            'label': label,
            'label_name': LABEL_NAMES[label],
            'confidence': round(conf, 4),
            'probabilities': {
                LABEL_NAMES[j]: round(float(probs[j]), 4)
                for j in range(NUM_LABELS)
            }
        })
    
    return results