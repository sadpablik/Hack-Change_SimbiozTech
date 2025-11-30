import os
import sys
import torch
import pandas as pd
import numpy as np
import logging
from datetime import datetime
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    f1_score, accuracy_score, precision_score, recall_score,
    confusion_matrix
)
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer,
    DataCollatorWithPadding,
    EarlyStoppingCallback
)
import warnings

warnings.filterwarnings('ignore')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('training.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class Config:
    TRAIN_CSV = 'data/train.csv'
    MODEL_NAME = "blanchefort/rubert-base-cased-sentiment"
    NUM_LABELS = 3
    MAX_LENGTH = 512
    OUTPUT_DIR = './models/rubert-finetuned'
    NUM_EPOCHS = 4
    BATCH_SIZE = 16
    LEARNING_RATE = 2e-5
    WARMUP_STEPS = 1000
    WEIGHT_DECAY = 0.01
    VAL_SIZE = 0.1
    RANDOM_SEED = 42
    DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


LABEL_NAMES = {0: "нейтральная", 1: "положительная", 2: "негативная"}


class SentimentDataset(torch.utils.data.Dataset):
    def __init__(self, encodings):
        self.encodings = encodings

    def __getitem__(self, idx):
        return {key: torch.tensor(val[idx]) for key, val in self.encodings.items()}

    def __len__(self):
        return len(self.encodings['input_ids'])


config = Config()

logger.info("=" * 80)
logger.info("FINE-TUNING RuBERT FOR SENTIMENT ANALYSIS")
logger.info("=" * 80)
logger.info(f"\nDevice: {config.DEVICE}")
logger.info(f"Model: {config.MODEL_NAME}")
logger.info(f"Labels: 0=Neutral, 1=Positive, 2=Negative")

logger.info("\n" + "=" * 80)
logger.info("LOADING DATA")
logger.info("=" * 80)

if not os.path.exists(config.TRAIN_CSV):
    logger.error(f"File not found: {config.TRAIN_CSV}")
    sys.exit(1)

train_df = pd.read_csv(config.TRAIN_CSV)
logger.info(f"Loaded {len(train_df)} examples")

if train_df[['text', 'label']].isnull().sum().sum() > 0:
    train_df = train_df.dropna(subset=['text', 'label'])
    logger.info(f"After cleaning: {len(train_df)} examples")

logger.info("\nLABEL DISTRIBUTION:")
label_dist = train_df['label'].value_counts().sort_index()
for label in [0, 1, 2]:
    count = label_dist.get(label, 0)
    percentage = (count / len(train_df)) * 100
    logger.info(f"   {label} ({LABEL_NAMES[label]}): {count:7d} ({percentage:5.1f}%)")

logger.info("\n" + "=" * 80)
logger.info("SPLITTING AND TOKENIZING")
logger.info("=" * 80)

train_texts, val_texts, train_labels, val_labels = train_test_split(
    train_df['text'].tolist(),
    train_df['label'].tolist(),
    test_size=config.VAL_SIZE,
    random_state=config.RANDOM_SEED,
    stratify=train_df['label']
)

logger.info(f"Train: {len(train_texts)} | Val: {len(val_texts)}")

tokenizer = AutoTokenizer.from_pretrained(config.MODEL_NAME)


def tokenize_function(texts, labels):
    encodings = tokenizer(
        texts,
        truncation=True,
        max_length=config.MAX_LENGTH,
        padding='max_length',
        return_tensors=None
    )
    encodings['label'] = labels
    return encodings


logger.info("Tokenizing train set...")
train_encodings = tokenize_function(train_texts, train_labels)
logger.info("Tokenizing val set...")
val_encodings = tokenize_function(val_texts, val_labels)

train_dataset = SentimentDataset(train_encodings)
val_dataset = SentimentDataset(val_encodings)

logger.info("\n" + "=" * 80)
logger.info("LOADING MODEL")
logger.info("=" * 80)

model = AutoModelForSequenceClassification.from_pretrained(
    config.MODEL_NAME,
    num_labels=config.NUM_LABELS
)
model.to(config.DEVICE)
logger.info(f"Model loaded: {model.num_parameters():,} parameters")

os.makedirs(config.OUTPUT_DIR, exist_ok=True)

training_args = TrainingArguments(
    output_dir=config.OUTPUT_DIR,
    num_train_epochs=config.NUM_EPOCHS,
    per_device_train_batch_size=config.BATCH_SIZE,
    per_device_eval_batch_size=config.BATCH_SIZE,
    learning_rate=config.LEARNING_RATE,
    warmup_steps=config.WARMUP_STEPS,
    weight_decay=config.WEIGHT_DECAY,
    evaluation_strategy="epoch",
    save_strategy="epoch",
    load_best_model_at_end=True,
    metric_for_best_model="f1_macro",
    greater_is_better=True,
    logging_dir='./logs',
    logging_steps=50,
    fp16=torch.cuda.is_available(),
    gradient_accumulation_steps=2,
    seed=config.RANDOM_SEED,
    dataloader_pin_memory=True,
    report_to=[],
)


def compute_metrics(eval_pred):
    predictions, labels = eval_pred
    predictions = np.argmax(predictions, axis=1)

    accuracy = accuracy_score(labels, predictions)
    f1_macro = f1_score(labels, predictions, average='macro', zero_division=0)
    f1_weighted = f1_score(labels, predictions, average='weighted', zero_division=0)

    precision = precision_score(labels, predictions, average=None, zero_division=0)
    recall = recall_score(labels, predictions, average=None, zero_division=0)
    f1_per_class = f1_score(labels, predictions, average=None, zero_division=0)

    return {
        'accuracy': accuracy,
        'f1_macro': f1_macro,
        'f1_weighted': f1_weighted,
        'precision_0': precision[0],
        'precision_1': precision[1],
        'precision_2': precision[2],
        'recall_0': recall[0],
        'recall_1': recall[1],
        'recall_2': recall[2],
        'f1_0': f1_per_class[0],
        'f1_1': f1_per_class[1],
        'f1_2': f1_per_class[2],
    }


trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=val_dataset,
    compute_metrics=compute_metrics,
    data_collator=DataCollatorWithPadding(tokenizer),
    callbacks=[EarlyStoppingCallback(early_stopping_patience=2)]
)

logger.info("\n" + "=" * 80)
logger.info("TRAINING")
logger.info("=" * 80)

torch.cuda.empty_cache()
trainer.train()

model.save_pretrained(config.OUTPUT_DIR)
tokenizer.save_pretrained(config.OUTPUT_DIR)
logger.info(f"Model saved to {config.OUTPUT_DIR}")

logger.info("\n" + "=" * 80)
logger.info("EVALUATION")
logger.info("=" * 80)

eval_result = trainer.evaluate()

logger.info(f"\nMETRICS:")
logger.info(f"   Accuracy:      {eval_result['eval_accuracy']:.4f}")
logger.info(f"   Macro-F1:      {eval_result['eval_f1_macro']:.4f}")
logger.info(f"   Weighted-F1:   {eval_result['eval_f1_weighted']:.4f}")
logger.info(f"\n   Per-class F1:")
logger.info(f"     Class 0 (Neutral):   {eval_result['eval_f1_0']:.4f}")
logger.info(f"     Class 1 (Positive):  {eval_result['eval_f1_1']:.4f}")
logger.info(f"     Class 2 (Negative):  {eval_result['eval_f1_2']:.4f}")

predictions = trainer.predict(val_dataset)
pred_labels = np.argmax(predictions.predictions, axis=1)
cm = confusion_matrix(val_labels, pred_labels)

logger.info(f"\n   Confusion Matrix:")
logger.info(f"                    Pred 0      Pred 1      Pred 2")
logger.info(f"                   (Neutral)  (Positive)  (Negative)")
for i in range(3):
    logger.info(f"      True {i} ({LABEL_NAMES[i]:8s}):  {cm[i, 0]:6d}    {cm[i, 1]:6d}    {cm[i, 2]:6d}")

report_path = os.path.join(config.OUTPUT_DIR, 'training_report.txt')
with open(report_path, 'w', encoding='utf-8') as f:
    f.write("=" * 80 + "\n")
    f.write("FINE-TUNING REPORT: RuBERT for Sentiment Analysis\n")
    f.write("Hack-Change 2025\n")
    f.write(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    f.write("=" * 80 + "\n\n")

    f.write("LABEL SCHEME\n")
    f.write("-" * 80 + "\n")
    f.write("0 - Neutral (neutral)\n")
    f.write("1 - Positive (positive)\n")
    f.write("2 - Negative (negative)\n\n")

    f.write("CONFIGURATION\n")
    f.write("-" * 80 + "\n")
    f.write(f"Model: {config.MODEL_NAME}\n")
    f.write(f"Device: {config.DEVICE}\n")
    f.write(f"Epochs: {config.NUM_EPOCHS}\n")
    f.write(f"Batch size: {config.BATCH_SIZE}\n")
    f.write(f"Learning rate: {config.LEARNING_RATE}\n")
    f.write(f"Max length: {config.MAX_LENGTH}\n")
    f.write(f"Gradient accumulation: 2\n\n")

    f.write("DATASET\n")
    f.write("-" * 80 + "\n")
    f.write(f"Total examples: {len(train_df)}\n")
    f.write(f"Train examples: {len(train_dataset)}\n")
    f.write(f"Val examples: {len(val_dataset)}\n\n")

    f.write("CLASS DISTRIBUTION\n")
    f.write("-" * 80 + "\n")
    for label in [0, 1, 2]:
        count = label_dist.get(label, 0)
        percentage = (count / len(train_df)) * 100
        f.write(f"  {label} ({LABEL_NAMES[label]}): {count:7d} ({percentage:5.1f}%)\n")

    f.write("\nVALIDATION RESULTS\n")
    f.write("-" * 80 + "\n")
    f.write(f"Accuracy: {eval_result['eval_accuracy']:.4f}\n")
    f.write(f"Macro-F1: {eval_result['eval_f1_macro']:.4f}\n")
    f.write(f"Weighted-F1: {eval_result['eval_f1_weighted']:.4f}\n\n")

    f.write("PER-CLASS METRICS\n")
    f.write("-" * 80 + "\n")
    f.write("             Precision   Recall   F1-Score\n")
    for label in [0, 1, 2]:
        prec = eval_result[f'eval_precision_{label}']
        rec = eval_result[f'eval_recall_{label}']
        f1 = eval_result[f'eval_f1_{label}']
        f.write(f"  {label} ({LABEL_NAMES[label]:8s}):  {prec:7.4f}    {rec:7.4f}    {f1:7.4f}\n")

    f.write("\nCONFUSION MATRIX\n")
    f.write("-" * 80 + "\n")
    f.write("                 Pred 0      Pred 1      Pred 2\n")
    f.write("                (Neutral)  (Positive)  (Negative)\n")
    for i in range(3):
        f.write(f"   True {i} ({LABEL_NAMES[i]:8s}):  {cm[i, 0]:6d}    {cm[i, 1]:6d}    {cm[i, 2]:6d}\n")

logger.info(f"\nReport saved to {report_path}")

logger.info("\n" + "=" * 80)
logger.info("FINE-TUNING COMPLETE")
logger.info("=" * 80)
logger.info(f"\nKey Metrics:")
logger.info(f"    Macro-F1: {eval_result['eval_f1_macro']:.4f}")
logger.info(f"    Accuracy: {eval_result['eval_accuracy']:.4f}")
logger.info(f"\nModel saved to: {config.OUTPUT_DIR}")
logger.info(f"Report saved to: {report_path}")
logger.info("\n" + "=" * 80)