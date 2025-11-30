from datetime import datetime

from app.models.base import Base
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship


class AnalysisSession(Base):
    __tablename__ = "analysis_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    filename: Mapped[str] = mapped_column(String, nullable=False)

    analyses: Mapped[list["TextAnalysis"]] = relationship(
        "TextAnalysis", back_populates="session", cascade="all, delete-orphan"
    )


class TextAnalysis(Base):
    __tablename__ = "text_analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("analysis_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    text: Mapped[str] = mapped_column(String, nullable=False)
    pred_label: Mapped[int | None] = mapped_column(Integer, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    source: Mapped[str | None] = mapped_column(String, nullable=True)
    true_label: Mapped[int | None] = mapped_column(Integer, nullable=True)

    session: Mapped["AnalysisSession"] = relationship(
        "AnalysisSession", back_populates="analyses"
    )
