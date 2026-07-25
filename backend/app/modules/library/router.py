"""
VidyaSetu ERP — Library Router
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import AuthUser, DBSession, require_permission
from app.modules.library.service import (
    AuthorRequest, AuthorResponse,
    PublisherRequest, PublisherResponse,
    CategoryRequest, CategoryResponse,
    BookRequest, BookResponse,
    BookCopyRequest, BookCopyResponse,
    MemberRequest, MemberResponse,
    IssueRequest, ReturnRequest, IssueResponse,
    BookService, MemberService, IssueService,
    LibraryStatsService,
)
from app.modules.library.models import Author, Publisher, BookCategory, BookCopy
from app.shared.responses import APIResponse
from sqlalchemy import select

router = APIRouter(prefix="/library", tags=["Library"])


# ── Stats ─────────────────────────────────────────────────────
@router.get("/stats", response_model=APIResponse,
            dependencies=[Depends(require_permission("library.read"))])
async def library_stats(current_user: AuthUser, db: DBSession):
    return APIResponse.ok(data=LibraryStatsService.get(db).model_dump())


# ── Authors ───────────────────────────────────────────────────
@router.post("/authors", response_model=APIResponse, status_code=201,
             dependencies=[Depends(require_permission("library.manage"))])
async def create_author(body: AuthorRequest, current_user: AuthUser, db: DBSession):
    a = Author(**body.model_dump(), created_by=current_user.user_id)
    db.add(a); db.commit(); db.refresh(a)
    return APIResponse.created(data=AuthorResponse.model_validate(a).model_dump())

@router.get("/authors", response_model=APIResponse,
            dependencies=[Depends(require_permission("library.read"))])
async def list_authors(current_user: AuthUser, db: DBSession, search: Optional[str] = None):
    from sqlalchemy import or_
    q = select(Author).where(Author.is_deleted == False)
    if search: q = q.where(or_(Author.name.ilike(f"%{search}%")))
    authors = db.scalars(q.order_by(Author.name)).all()
    return APIResponse.ok(data=[AuthorResponse.model_validate(a).model_dump() for a in authors])


# ── Publishers ────────────────────────────────────────────────
@router.post("/publishers", response_model=APIResponse, status_code=201,
             dependencies=[Depends(require_permission("library.manage"))])
async def create_publisher(body: PublisherRequest, current_user: AuthUser, db: DBSession):
    p = Publisher(**body.model_dump(), created_by=current_user.user_id)
    db.add(p); db.commit(); db.refresh(p)
    return APIResponse.created(data=PublisherResponse.model_validate(p).model_dump())

@router.get("/publishers", response_model=APIResponse,
            dependencies=[Depends(require_permission("library.read"))])
async def list_publishers(current_user: AuthUser, db: DBSession):
    pubs = db.scalars(select(Publisher).where(Publisher.is_deleted == False).order_by(Publisher.name)).all()
    return APIResponse.ok(data=[PublisherResponse.model_validate(p).model_dump() for p in pubs])


# ── Categories ────────────────────────────────────────────────
@router.post("/categories", response_model=APIResponse, status_code=201,
             dependencies=[Depends(require_permission("library.manage"))])
async def create_category(body: CategoryRequest, current_user: AuthUser, db: DBSession):
    c = BookCategory(**body.model_dump(), created_by=current_user.user_id)
    db.add(c); db.commit(); db.refresh(c)
    return APIResponse.created(data=CategoryResponse.model_validate(c).model_dump())

@router.get("/categories", response_model=APIResponse,
            dependencies=[Depends(require_permission("library.read"))])
async def list_categories(current_user: AuthUser, db: DBSession):
    cats = db.scalars(select(BookCategory).where(BookCategory.is_deleted == False).order_by(BookCategory.name)).all()
    return APIResponse.ok(data=[CategoryResponse.model_validate(c).model_dump() for c in cats])


# ── Books ─────────────────────────────────────────────────────
@router.post("/books", response_model=APIResponse, status_code=201,
             dependencies=[Depends(require_permission("library.manage"))])
async def create_book(body: BookRequest, current_user: AuthUser, db: DBSession):
    b = BookService.create(db, body, current_user.user_id)
    return APIResponse.created(data=BookResponse.model_validate(b).model_dump(),
                               message=f"Book '{b.title}' added.")

@router.get("/books", response_model=APIResponse,
            dependencies=[Depends(require_permission("library.read"))])
async def list_books(current_user: AuthUser, db: DBSession,
                     page: int = Query(1, ge=1), per_page: int = Query(24, ge=1, le=100),
                     search: Optional[str] = None, category_id: Optional[int] = None,
                     language: Optional[str] = None, available_only: bool = False):
    items, total = BookService.get_list(db, page=page, per_page=per_page,
                                        search=search, category_id=category_id,
                                        language=language, available_only=available_only)
    total_pages = max(1, (total + per_page - 1) // per_page)
    return APIResponse.ok(data={
        "items": [BookResponse.model_validate(b).model_dump() for b in items],
        "meta": {"total": total, "page": page, "per_page": per_page,
                 "total_pages": total_pages, "has_next": page < total_pages},
    })

@router.get("/books/{book_id}", response_model=APIResponse,
            dependencies=[Depends(require_permission("library.read"))])
async def get_book(book_id: int, current_user: AuthUser, db: DBSession):
    return APIResponse.ok(data=BookResponse.model_validate(BookService.get_by_id(db, book_id)).model_dump())

@router.put("/books/{book_id}", response_model=APIResponse,
            dependencies=[Depends(require_permission("library.manage"))])
async def update_book(book_id: int, body: BookRequest, current_user: AuthUser, db: DBSession):
    b = BookService.update(db, book_id, body, current_user.user_id)
    return APIResponse.ok(data=BookResponse.model_validate(b).model_dump())

@router.delete("/books/{book_id}", response_model=APIResponse,
               dependencies=[Depends(require_permission("library.manage"))])
async def delete_book(book_id: int, current_user: AuthUser, db: DBSession):
    BookService.delete(db, book_id, current_user.user_id)
    return APIResponse.ok(message="Book removed from catalog.")

@router.post("/books/{book_id}/copies", response_model=APIResponse, status_code=201,
             dependencies=[Depends(require_permission("library.manage"))])
async def add_copy(book_id: int, body: BookCopyRequest, current_user: AuthUser, db: DBSession):
    body.book_id = book_id
    copy = BookCopy(**body.model_dump(), status="available", created_by=current_user.user_id)
    db.add(copy)
    book = BookService.get_by_id(db, book_id)
    book.total_copies += 1; book.available_copies += 1
    db.commit(); db.refresh(copy)
    return APIResponse.created(data=BookCopyResponse.model_validate(copy).model_dump())


# ── Members ───────────────────────────────────────────────────
@router.post("/members", response_model=APIResponse, status_code=201,
             dependencies=[Depends(require_permission("library.manage"))])
async def create_member(body: MemberRequest, current_user: AuthUser, db: DBSession):
    m = MemberService.create(db, body, current_user.user_id)
    return APIResponse.created(data=MemberResponse.model_validate(m).model_dump(),
                               message=f"Library member {m.member_id} created.")

@router.get("/members", response_model=APIResponse,
            dependencies=[Depends(require_permission("library.read"))])
async def list_members(current_user: AuthUser, db: DBSession,
                       search: Optional[str] = None, member_type: Optional[str] = None,
                       page: int = Query(1, ge=1), per_page: int = Query(30, ge=1, le=100)):
    items, total = MemberService.get_list(db, search=search, member_type=member_type,
                                           page=page, per_page=per_page)
    total_pages = max(1, (total + per_page - 1) // per_page)
    return APIResponse.ok(data={
        "items": [MemberResponse.model_validate(m).model_dump() for m in items],
        "meta": {"total": total, "page": page, "total_pages": total_pages},
    })

@router.get("/members/{member_id}/issues", response_model=APIResponse,
            dependencies=[Depends(require_permission("library.read"))])
async def member_issues(member_id: int, current_user: AuthUser, db: DBSession):
    items, total = IssueService.get_active_issues(db, member_id=member_id)
    return APIResponse.ok(data={
        "items": [IssueResponse.model_validate(i).model_dump() for i in items],
        "meta": {"total": total},
    })


# ── Issue / Return ────────────────────────────────────────────
@router.post("/issues", response_model=APIResponse, status_code=201,
             dependencies=[Depends(require_permission("library.issue"))])
async def issue_book(body: IssueRequest, current_user: AuthUser, db: DBSession):
    issue = IssueService.issue(db, body, issued_by=current_user.user_id)
    return APIResponse.created(data=IssueResponse.model_validate(issue).model_dump(),
                               message=f"Book issued. Issue No: {issue.issue_number}")

@router.get("/issues", response_model=APIResponse,
            dependencies=[Depends(require_permission("library.read"))])
async def list_issues(current_user: AuthUser, db: DBSession,
                      overdue_only: bool = False,
                      page: int = Query(1, ge=1), per_page: int = Query(30, ge=1, le=100)):
    items, total = IssueService.get_active_issues(db, overdue_only=overdue_only, page=page, per_page=per_page)
    total_pages = max(1, (total + per_page - 1) // per_page)
    return APIResponse.ok(data={
        "items": [IssueResponse.model_validate(i).model_dump() for i in items],
        "meta": {"total": total, "page": page, "total_pages": total_pages},
    })

@router.put("/issues/{issue_id}/return", response_model=APIResponse,
            dependencies=[Depends(require_permission("library.issue"))])
async def return_book(issue_id: int, body: ReturnRequest, current_user: AuthUser, db: DBSession):
    issue = IssueService.return_book(db, issue_id, body, returned_by=current_user.user_id)
    msg = f"Book returned."
    if issue.fine_amount > 0:
        msg += f" Fine: ₹{issue.fine_amount}" + (" (collected)" if issue.fine_paid else " (pending)")
    return APIResponse.ok(data=IssueResponse.model_validate(issue).model_dump(), message=msg)

@router.post("/overdue/update", response_model=APIResponse,
             dependencies=[Depends(require_permission("library.manage"))])
async def update_overdue(current_user: AuthUser, db: DBSession):
    count = IssueService.update_overdue_status(db)
    return APIResponse.ok(data={"updated": count}, message=f"{count} records marked as overdue.")
