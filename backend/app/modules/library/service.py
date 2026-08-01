"""
VidyaSetu ERP — Library Module Schemas & Service
"""
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel as PydanticBase
from fastapi import HTTPException
from sqlalchemy import and_, func, select, or_
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.modules.library.models import (
    Author, Publisher, BookCategory, Book, BookCopy,
    LibraryMember, BookIssue
)
from app.shared.audit import AuditService


# ═══════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════

class AuthorRequest(PydanticBase):
    name: str
    name_marathi: Optional[str] = None
    bio: Optional[str] = None

class AuthorResponse(PydanticBase):
    model_config = {"from_attributes": True}
    id: int
    name: str
    name_marathi: Optional[str] = None
    is_active: bool


class PublisherRequest(PydanticBase):
    name: str
    address: Optional[str] = None
    contact: Optional[str] = None

class PublisherResponse(PydanticBase):
    model_config = {"from_attributes": True}
    id: int
    name: str
    address: Optional[str] = None
    contact: Optional[str] = None
    is_active: bool


class CategoryRequest(PydanticBase):
    name: str
    name_marathi: Optional[str] = None
    description: Optional[str] = None

class CategoryResponse(PydanticBase):
    model_config = {"from_attributes": True}
    id: int
    name: str
    name_marathi: Optional[str] = None
    description: Optional[str] = None
    is_active: bool


class BookRequest(PydanticBase):
    title: str
    title_marathi: Optional[str] = None
    isbn: Optional[str] = None
    accession_number: Optional[str] = None
    author_id: Optional[int] = None
    publisher_id: Optional[int] = None
    category_id: Optional[int] = None
    edition: Optional[str] = None
    publication_year: Optional[int] = None
    language: str = "Marathi"
    medium: Optional[str] = None
    pages: Optional[int] = None
    price: Optional[Decimal] = None
    total_copies: int = 1
    description: Optional[str] = None
    keywords: Optional[str] = None
    location_shelf: Optional[str] = None

class BookResponse(PydanticBase):
    model_config = {"from_attributes": True}
    id: int
    uuid: str
    title: str
    title_marathi: Optional[str] = None
    isbn: Optional[str] = None
    accession_number: Optional[str] = None
    author_id: Optional[int] = None
    publisher_id: Optional[int] = None
    category_id: Optional[int] = None
    edition: Optional[str] = None
    publication_year: Optional[int] = None
    language: str
    pages: Optional[int] = None
    price: Optional[Decimal] = None
    total_copies: int
    available_copies: int
    description: Optional[str] = None
    keywords: Optional[str] = None
    location_shelf: Optional[str] = None
    cover_image_path: Optional[str] = None
    is_active: bool
    author: Optional[AuthorResponse] = None
    publisher: Optional[PublisherResponse] = None
    category: Optional[CategoryResponse] = None


class BookCopyRequest(PydanticBase):
    book_id: int
    accession_number: str
    condition: str = "good"
    purchase_date: Optional[date] = None
    purchase_price: Optional[Decimal] = None
    vendor: Optional[str] = None
    remarks: Optional[str] = None

class BookCopyResponse(PydanticBase):
    model_config = {"from_attributes": True}
    id: int
    book_id: int
    accession_number: str
    condition: str
    status: str
    purchase_date: Optional[date] = None
    purchase_price: Optional[Decimal] = None


class MemberRequest(PydanticBase):
    member_type: str = "student"
    reference_id: int
    full_name: str
    standard: Optional[str] = None
    division: Optional[str] = None
    mobile: Optional[str] = None
    max_books_allowed: int = 2

class MemberResponse(PydanticBase):
    model_config = {"from_attributes": True}
    id: int
    member_id: str
    member_type: str
    reference_id: int
    full_name: str
    standard: Optional[str] = None
    division: Optional[str] = None
    mobile: Optional[str] = None
    membership_date: date
    max_books_allowed: int
    books_currently_issued: int
    total_fine_due: Decimal
    is_blocked: bool
    is_active: bool


class IssueRequest(PydanticBase):
    book_id: int
    copy_id: Optional[int] = None
    member_id: int
    issue_date: Optional[date] = None
    due_date: date
    fine_per_day: Decimal = Decimal("1")
    remarks: Optional[str] = None

class ReturnRequest(PydanticBase):
    return_date: Optional[date] = None
    remarks: Optional[str] = None
    collect_fine: bool = True

class IssueResponse(PydanticBase):
    model_config = {"from_attributes": True}
    id: int
    issue_number: str
    book_id: int
    copy_id: Optional[int] = None
    member_id: int
    issue_date: date
    due_date: date
    return_date: Optional[date] = None
    status: str
    fine_amount: Decimal
    fine_paid: bool
    fine_per_day: Decimal
    remarks: Optional[str] = None
    created_at: Optional[datetime] = None
    book: Optional[BookResponse] = None
    member: Optional[MemberResponse] = None


class LibraryStatsResponse(PydanticBase):
    total_books: int
    total_copies: int
    available_copies: int
    books_issued: int
    overdue_books: int
    total_members: int
    active_members: int
    total_fine_pending: Decimal
    new_books_this_month: int


# ═══════════════════════════════════════════════════
# SERVICES
# ═══════════════════════════════════════════════════

def _accession_number(db: Session) -> str:
    """Generate: HMMV-LIB-YYYY-NNNN"""
    year = str(date.today().year)
    prefix = f"{settings.SCHOOL_CODE or 'HMMV'}-LIB-{year}-"
    last = db.scalar(
        select(Book.accession_number)
        .where(Book.accession_number.like(f"{prefix}%"))
        .where(Book.is_deleted == False)
        .order_by(Book.accession_number.desc())
    )
    try: seq = int(last.split("-")[-1]) + 1 if last else 1
    except: seq = 1
    return f"{prefix}{seq:04d}"

def _member_id(db: Session, member_type: str) -> str:
    prefix = f"LIB-{member_type[:3].upper()}-{date.today().year}-"
    last = db.scalar(
        select(LibraryMember.member_id)
        .where(LibraryMember.member_id.like(f"{prefix}%"))
        .where(LibraryMember.is_deleted == False)
        .order_by(LibraryMember.member_id.desc())
    )
    try: seq = int(last.split("-")[-1]) + 1 if last else 1
    except: seq = 1
    return f"{prefix}{seq:04d}"

def _issue_number(db: Session) -> str:
    year = str(date.today().year)
    prefix = f"ISS-{year}-"
    last = db.scalar(
        select(BookIssue.issue_number)
        .where(BookIssue.issue_number.like(f"{prefix}%"))
        .where(BookIssue.is_deleted == False)
        .order_by(BookIssue.issue_number.desc())
    )
    try: seq = int(last.split("-")[-1]) + 1 if last else 1
    except: seq = 1
    return f"{prefix}{seq:05d}"


class BookService:
    @staticmethod
    def create(db: Session, data: BookRequest, created_by: int) -> Book:
        dump = data.model_dump()
        acc = dump.pop("accession_number", None) or _accession_number(db)
        if not dump.get("isbn"):
            dump["isbn"] = None
        book = Book(**dump, accession_number=acc,
                    available_copies=data.total_copies, created_by=created_by)
        db.add(book)
        db.flush()

        copies_count = max(1, data.total_copies)
        for i in range(1, copies_count + 1):
            copy_acc = f"{acc}-{i}" if copies_count > 1 else acc
            copy = BookCopy(
                book_id=book.id,
                accession_number=copy_acc,
                status="available",
                created_by=created_by
            )
            db.add(copy)

        AuditService.log(db, action="BOOK_ADDED", module="library", user_id=created_by,
                         description=f"Book added: {data.title}")
        db.commit(); db.refresh(book); return book

    @staticmethod
    def get_list(db: Session, page: int = 1, per_page: int = 24,
                 search: str | None = None, category_id: int | None = None,
                 language: str | None = None, available_only: bool = False,
                 ) -> tuple[list[Book], int]:
        q = (select(Book).options(
            joinedload(Book.author), joinedload(Book.publisher), joinedload(Book.category)
        ).where(Book.is_deleted == False))
        if search:
            t = f"%{search}%"
            q = q.where(or_(Book.title.ilike(t), Book.isbn.ilike(t),
                            Book.accession_number.ilike(t), Book.keywords.ilike(t)))
        if category_id: q = q.where(Book.category_id == category_id)
        if language: q = q.where(Book.language == language)
        if available_only: q = q.where(Book.available_copies > 0)
        total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
        items = db.scalars(q.order_by(Book.title).offset((page-1)*per_page).limit(per_page)).all()
        return list(items), total

    @staticmethod
    def get_by_id(db: Session, book_id: int) -> Book:
        b = db.scalar(select(Book).options(
            joinedload(Book.author), joinedload(Book.publisher),
            joinedload(Book.category), joinedload(Book.copies)
        ).where(Book.id == book_id, Book.is_deleted == False))
        if not b: raise HTTPException(404, "Book not found.")
        return b

    @staticmethod
    def update(db: Session, book_id: int, data: BookRequest, updated_by: int) -> Book:
        b = BookService.get_by_id(db, book_id)
        dump = data.model_dump(exclude_none=True)
        if "isbn" in dump and not dump["isbn"]:
            dump["isbn"] = None
        for k, v in dump.items():
            if hasattr(b, k):
                setattr(b, k, v)
        b.updated_by = updated_by; db.commit(); db.refresh(b); return b

    @staticmethod
    def delete(db: Session, book_id: int, deleted_by: int) -> None:
        b = BookService.get_by_id(db, book_id)
        b.soft_delete(deleted_by=deleted_by); db.commit()


class MemberService:
    @staticmethod
    def create(db: Session, data: MemberRequest, created_by: int) -> LibraryMember:
        mem = LibraryMember(
            **data.model_dump(),
            member_id=_member_id(db, data.member_type),
            membership_date=date.today(),
            books_currently_issued=0,
            total_fine_due=Decimal("0"),
            created_by=created_by,
        )
        db.add(mem); db.commit(); db.refresh(mem); return mem

    @staticmethod
    def get_list(db: Session, search: str | None = None, member_type: str | None = None,
                 page: int = 1, per_page: int = 30) -> tuple[list[LibraryMember], int]:
        q = select(LibraryMember).where(LibraryMember.is_deleted == False)
        if member_type: q = q.where(LibraryMember.member_type == member_type)
        if search:
            t = f"%{search}%"
            q = q.where(or_(LibraryMember.full_name.ilike(t),
                            LibraryMember.member_id.ilike(t)))
        total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
        items = db.scalars(q.order_by(LibraryMember.full_name).offset((page-1)*per_page).limit(per_page)).all()
        return list(items), total

    @staticmethod
    def get_by_id(db: Session, member_id: int) -> LibraryMember:
        m = db.scalar(select(LibraryMember).where(LibraryMember.id == member_id, LibraryMember.is_deleted == False))
        if not m: raise HTTPException(404, "Member not found.")
        return m


class IssueService:
    @staticmethod
    def issue(db: Session, data: IssueRequest, issued_by: int) -> BookIssue:
        member = MemberService.get_by_id(db, data.member_id)
        if member.is_blocked:
            raise HTTPException(400, "Member is blocked. Clear dues first.")
        if member.books_currently_issued >= member.max_books_allowed:
            raise HTTPException(400, f"Member already has {member.books_currently_issued} books. Max allowed: {member.max_books_allowed}")

        book = BookService.get_by_id(db, data.book_id)
        if book.available_copies <= 0:
            raise HTTPException(400, "No copies available.")

        issue = BookIssue(
            issue_number=_issue_number(db),
            book_id=data.book_id,
            copy_id=data.copy_id,
            member_id=data.member_id,
            issue_date=data.issue_date or date.today(),
            due_date=data.due_date,
            fine_per_day=data.fine_per_day,
            status="issued",
            remarks=data.remarks,
            issued_by=issued_by,
            created_by=issued_by,
        )
        db.add(issue)

        book.available_copies -= 1
        member.books_currently_issued += 1
        if data.copy_id:
            copy = db.scalar(select(BookCopy).where(BookCopy.id == data.copy_id))
            if copy: copy.status = "issued"

        AuditService.log(db, action="BOOK_ISSUED", module="library", user_id=issued_by,
                         description=f"Issued '{book.title}' to {member.full_name}")
        db.commit(); db.refresh(issue)
        # ── Notify member that book was issued
        try:
            from app.shared.notifications import push_event
            push_event(db, "library.book_issued", {
                "book_title": book.title,
                "due_date": str(issue.due_date),
                "member_user_id": member.user_id if hasattr(member, 'user_id') else None,
                "issue_id": issue.id,
                "sender_id": issued_by,
            })
        except Exception:
            pass
        return issue

    @staticmethod
    def return_book(db: Session, issue_id: int, data: ReturnRequest, returned_by: int) -> BookIssue:
        issue = db.scalar(select(BookIssue).options(
            joinedload(BookIssue.book), joinedload(BookIssue.member)
        ).where(BookIssue.id == issue_id, BookIssue.is_deleted == False))
        if not issue: raise HTTPException(404, "Issue record not found.")
        if issue.status == "returned": raise HTTPException(400, "Already returned.")

        return_date = data.return_date or date.today()
        fine = Decimal("0")
        if return_date > issue.due_date:
            days_late = (return_date - issue.due_date).days
            fine = Decimal(str(days_late)) * issue.fine_per_day

        issue.return_date = return_date
        issue.fine_amount = fine
        issue.fine_paid = data.collect_fine and fine > 0
        issue.status = "returned"
        issue.returned_to = returned_by

        book = db.scalar(select(Book).where(Book.id == issue.book_id))
        if book: book.available_copies += 1

        member = db.scalar(select(LibraryMember).where(LibraryMember.id == issue.member_id))
        if member:
            member.books_currently_issued = max(0, member.books_currently_issued - 1)
            if fine > 0 and not data.collect_fine:
                member.total_fine_due += fine

        if issue.copy_id:
            copy = db.scalar(select(BookCopy).where(BookCopy.id == issue.copy_id))
            if copy: copy.status = "available"

        AuditService.log(db, action="BOOK_RETURNED", module="library", user_id=returned_by,
                         description=f"Returned '{book.title if book else issue.book_id}' — Fine: ₹{fine}")
        db.commit(); db.refresh(issue); return issue

    @staticmethod
    def get_active_issues(db: Session, member_id: int | None = None,
                          overdue_only: bool = False, page: int = 1, per_page: int = 30,
                          ) -> tuple[list[BookIssue], int]:
        q = (select(BookIssue).options(
            joinedload(BookIssue.book), joinedload(BookIssue.member)
        ).where(BookIssue.is_deleted == False, BookIssue.status.in_(["issued", "overdue"])))
        if member_id: q = q.where(BookIssue.member_id == member_id)
        if overdue_only: q = q.where(BookIssue.due_date < date.today())
        total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
        items = db.scalars(q.order_by(BookIssue.due_date).offset((page-1)*per_page).limit(per_page)).all()
        return list(items), total

    @staticmethod
    def update_overdue_status(db: Session) -> int:
        """Mark overdue books. Run as a daily job."""
        today = date.today()
        result = db.execute(
            select(BookIssue).where(
                BookIssue.status == "issued",
                BookIssue.due_date < today,
                BookIssue.is_deleted == False,
            )
        )
        count = 0
        for (issue,) in result:
            issue.status = "overdue"
            count += 1
        db.commit()
        return count


class LibraryStatsService:
    @staticmethod
    def get(db: Session) -> LibraryStatsResponse:
        from datetime import datetime as dt
        today = date.today()
        month_start = today.replace(day=1)

        total_books = db.scalar(select(func.count()).where(Book.is_deleted == False)) or 0
        total_copies = db.scalar(select(func.sum(Book.total_copies)).where(Book.is_deleted == False)) or 0
        avail_copies = db.scalar(select(func.sum(Book.available_copies)).where(Book.is_deleted == False)) or 0
        issued = db.scalar(select(func.count()).where(BookIssue.status.in_(["issued","overdue"]), BookIssue.is_deleted == False)) or 0
        overdue = db.scalar(select(func.count()).where(BookIssue.status == "overdue", BookIssue.is_deleted == False)) or 0
        total_members = db.scalar(select(func.count()).where(LibraryMember.is_deleted == False)) or 0
        active_members = db.scalar(select(func.count()).where(LibraryMember.is_deleted == False, LibraryMember.is_active == True)) or 0
        fine_pending = db.scalar(select(func.sum(LibraryMember.total_fine_due)).where(LibraryMember.is_deleted == False)) or Decimal("0")
        new_this_month = db.scalar(select(func.count()).where(Book.is_deleted == False, Book.created_at >= month_start)) or 0

        return LibraryStatsResponse(
            total_books=total_books,
            total_copies=int(total_copies),
            available_copies=int(avail_copies),
            books_issued=issued,
            overdue_books=overdue,
            total_members=total_members,
            active_members=active_members,
            total_fine_pending=Decimal(str(fine_pending)),
            new_books_this_month=new_this_month,
        )
