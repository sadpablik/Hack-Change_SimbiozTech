"""Сервис для предобработки текста: нормализация, токенизация, лемматизация, NER."""

import re
from typing import Any

try:
    import pymorphy2

    PYMOРHY2_AVAILABLE = True
except ImportError:
    PYMOРHY2_AVAILABLE = False

try:
    import spacy
    from spacy.lang.ru import Russian

    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False


class TextPreprocessingService:
    def __init__(self) -> None:
        self.morph: Any = None
        self.nlp: Any = None
        self._init_analyzers()

    def _init_analyzers(self) -> None:
        if PYMOРHY2_AVAILABLE:
            try:
                self.morph = pymorphy2.MorphAnalyzer()
            except Exception:
                self.morph = None

        if SPACY_AVAILABLE:
            try:
                self.nlp = spacy.load("ru_core_news_sm")
            except OSError:
                try:
                    self.nlp = Russian()
                except Exception:
                    self.nlp = None

    def normalize(self, text: str) -> str:
        if not text or not isinstance(text, str):
            return ""
        text = re.sub(r"\s+", " ", text)
        text = text.strip()
        return text

    def tokenize(self, text: str) -> list[str]:
        if not text:
            return []
        normalized = self.normalize(text)
        tokens = re.findall(r"\b\w+\b", normalized, re.UNICODE)
        return tokens

    def lemmatize(self, text: str) -> list[str]:
        if not text:
            return []
        tokens = self.tokenize(text)
        if not self.morph:
            return tokens
        lemmas: list[str] = []
        for token in tokens:
            try:
                parsed = self.morph.parse(token)[0]
                lemmas.append(parsed.normal_form)
            except Exception:
                lemmas.append(token.lower())
        return lemmas

    def extract_entities(self, text: str) -> list[dict[str, Any]]:
        if not text or not self.nlp:
            return []
        try:
            doc = self.nlp(text)
            entities: list[dict[str, Any]] = []
            for ent in doc.ents:
                entities.append(
                    {
                        "text": ent.text,
                        "label": ent.label_,
                        "start": ent.start_char,
                        "end": ent.end_char,
                    }
                )
            return entities
        except Exception:
            return []

    def preprocess(self, text: str) -> dict[str, Any]:
        if not text:
            return {
                "original": "",
                "normalized": "",
                "tokens": [],
                "lemmas": [],
                "entities": [],
            }
        normalized = self.normalize(text)
        tokens = self.tokenize(normalized)
        lemmas = self.lemmatize(normalized)
        entities = self.extract_entities(text)
        return {
            "original": text,
            "normalized": normalized,
            "tokens": tokens,
            "lemmas": lemmas,
            "entities": entities,
        }

    def preprocess_batch(self, texts: list[str]) -> list[dict[str, Any]]:
        return [self.preprocess(text) for text in texts]


text_preprocessing_service: TextPreprocessingService = TextPreprocessingService()
