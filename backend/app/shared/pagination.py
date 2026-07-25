"""
VidyaSetu ERP — Pagination Utility
=====================================
Reusable pagination for all list endpoints.
"""
from typing import Any, Optional, Type, TypeVar
from sqlalchemy import func, Select, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.base import BaseModel

T = TypeVar("T", bound=BaseModel)


class PaginationParams:
    """Standard pagination parameters extracted from query params."""

    def __init__(
        self,
        page: int = 1,
        per_page: int = None,
        search: str | None = None,
        sort_by: str | None = None,
        sort_order: str = "desc",
    ):
        self.page = max(1, page)
        self.per_page = min(
            per_page or settings.DEFAULT_PAGE_SIZE,
            settings.MAX_PAGE_SIZE,
        )
        self.search = search
        self.sort_by = sort_by
        self.sort_order = sort_order.lower()

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.per_page

    @property
    def limit(self) -> int:
        return self.per_page


def paginate(
    db: Session,
    query: Select,
    params: PaginationParams,
) -> tuple[list, int]:
    """
    Apply pagination to a SQLAlchemy query.
    Returns: (items, total_count)
    """
    # Count total before pagination
    count_query = select(func.count()).select_from(query.subquery())
    total = db.scalar(count_query) or 0

    # Apply pagination
    items = db.scalars(
        query.offset(params.offset).limit(params.limit)
    ).all()

    return list(items), total
