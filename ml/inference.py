import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import os

MODEL_PATH = os.getenv('MODEL_PATH', './models/rubert-finetuned')
BASE_MODEL_NAME = "blanchefort/rubert-base-cased-sentiment"

NUM_LABELS = 3
MAX_LENGTH = 512

INFERENCE_BATCH_SIZE_GPU = 512
INFERENCE_BATCH_SIZE_CPU = 128

LABEL_NAMES = {0: "нейтральная", 1: "положительная", 2: "негативная"}
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

INFERENCE_BATCH_SIZE = INFERENCE_BATCH_SIZE_GPU if torch.cuda.is_available() else INFERENCE_BATCH_SIZE_CPU

if os.path.exists(MODEL_PATH) and os.path.exists(os.path.join(MODEL_PATH, "config.json")):
    print(f"Loading fine-tuned model from {MODEL_PATH}")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH)
else:
    print(f"Local model not found at {MODEL_PATH}, using base model: {BASE_MODEL_NAME}")
    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL_NAME)
    model = AutoModelForSequenceClassification.from_pretrained(BASE_MODEL_NAME, num_labels=NUM_LABELS)

model.eval()
model.to(DEVICE)

try:
    if hasattr(torch, 'compile'):
        model = torch.compile(model, mode='reduce-overhead')
        print(f"Model compiled with torch.compile for faster inference on {DEVICE}")
except Exception as e:
    print(f"torch.compile not available or failed: {e}, using standard model")

print(f"Inference batch size: {INFERENCE_BATCH_SIZE} (device: {DEVICE})")


def predict(text: str) -> dict:
    inputs = tokenizer(
        text,
        truncation=True,
        max_length=MAX_LENGTH,
        padding=True,
        return_tensors='pt'
    )
    inputs = {k: v.to(DEVICE) for k, v in inputs.items()}

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
    if not texts:
        return []
    
    results = []
    for i in range(0, len(texts), INFERENCE_BATCH_SIZE):
        chunk = texts[i:i + INFERENCE_BATCH_SIZE]
        chunk_results = _process_batch_chunk(chunk)
        results.extend(chunk_results)
    
    return results


def _process_batch_chunk(texts: list) -> list:
    inputs = tokenizer(
        texts,
        truncation=True,
        max_length=MAX_LENGTH,
        padding=True,
        return_tensors='pt'
    )
    inputs = {k: v.to(DEVICE) for k, v in inputs.items()}
    
    with torch.inference_mode():
        logits = model(**inputs).logits
        probabilities = torch.softmax(logits, dim=-1)
        pred_classes = torch.argmax(logits, dim=-1)
        confidences = torch.max(probabilities, dim=-1)[0]
    
    pred_classes_cpu = pred_classes.cpu()
    confidences_cpu = confidences.cpu()
    probabilities_cpu = probabilities.cpu()
    
    del inputs, logits, probabilities, pred_classes, confidences
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    
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
