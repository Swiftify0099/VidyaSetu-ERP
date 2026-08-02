"""
VidyaSetu ERP — Library Module Models
========================================
Complete school library management:
- Book Catalog (Books, Authors, Publishers)
- Book Copies / Accession Register
- Library Members (Students & Teachers)
- Issue & Return Register
- Overdue Tracking & Fine Collection
- Book Reservations
"""
from datetime import date
from decimal import Decimal
from sqlalchemy import (
    BigInteger, Boolean, Date, ForeignKey,
    Integer, Numeric, String, Text, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import BaseModel


class Author(BaseModel):
    """Book author master."""
    __tablename__ = "lib_authors"
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    name_marathi: Mapped[str | None] = mapped_column(String(255), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)


class Publisher(BaseModel):
    """Book publisher master."""
    __tablename__ = "lib_publishers"
    name: Mapped[str] = mapped_column(String(300), nullable=False, index=True)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    contact: Mapped[str | None] = mapped_column(String(100), nullable=True)


class BookCategory(BaseModel):
    """Library book categories / genres / subjects."""
    __tablename__ = "lib_categories"
    name: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    name_marathi: Mapped[str | None] = mapped_column(String(200), nullable=True)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    parent_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    # For hierarchical: Fiction → Mystery, Science → Biology, etc.


class Book(BaseModel):
    """
    Book catalog entry (one per title).
    Physical copies tracked via BookCopy.
    """
    __tablename__ = "lib_books"

    # Identifiers
    isbn: Mapped[str | None] = mapped_column(String(20), nullable=True, unique=True, index=True)
    accession_number: Mapped[str | None] = mapped_column(String(30), nullable=True, unique=True)
    # First accession number for this title (others in BookCopy)

    # Book details
    title: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    title_marathi: Mapped[str | None] = mapped_column(String(500), nullable=True)
    author_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("lib_authors.id"), nullable=True)
    publisher_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("lib_publishers.id"), nullable=True)
    category_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("lib_categories.id"), nullable=True)

    edition: Mapped[str | None] = mapped_column(String(50), nullable=True)
    publication_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    language: Mapped[str] = mapped_column(String(30), nullable=False, default="Marathi")
    # Marathi / English / Hindi / Bilingual
    medium: Mapped[str | None] = mapped_column(String(50), nullable=True)
    pages: Mapped[int | None] = mapped_column(Integer, nullable=True)
    price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)

    # Inventory summary
    total_copies: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    available_copies: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    cover_image_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    keywords: Mapped[str | None] = mapped_column(String(500), nullable=True)
    location_shelf: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # Rack/shelf location

    author: Mapped["Author | None"] = relationship("Author")
    publisher: Mapped["Publisher | None"] = relationship("Publisher")
    category: Mapped["BookCategory | None"] = relationship("BookCategory")
    copies: Mapped[list["BookCopy"]] = relationship("BookCopy", back_populates="book")


class BookCopy(BaseModel):
    """
    Individual physical copy of a book.
    Each copy has its own accession number (Accession Register).
    """
    __tablename__ = "lib_book_copies"

    book_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("lib_books.id"), nullable=False, index=True)
    accession_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    condition: Mapped[str] = mapped_column(String(20), nullable=False, default="good")
    # good / fair / poor / damaged / lost
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="available")
    # available / issued / reserved / damaged / lost
    purchase_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    purchase_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    vendor: Mapped[str | None] = mapped_column(String(255), nullable=True)
    remarks: Mapped[str | None] = mapped_column(String(500), nullable=True)

    book: Mapped["Book"] = relationship("Book", back_populates="copies")


class LibraryMember(BaseModel):
    """
    Library membership.
    Links students or teachers to the library.
    """
    __tablename__ = "lib_members"
    __table_args__ = (
        UniqueConstraint("member_type", "reference_id", name="uq_lib_member"),
    )

    member_id: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    # e.g. LIB-STU-2026-0001 or LIB-TCH-2026-0001
    member_type: Mapped[str] = mapped_column(String(20), nullable=False)
    # student / teacher / staff
    reference_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    # FK to student.id or teacher.id
    full_name: Mapped[str] = mapped_column(String(300), nullable=False)
    # Denormalized for quick access
    standard: Mapped[str | None] = mapped_column(String(10), nullable=True)
    division: Mapped[str | None] = mapped_column(String(5), nullable=True)
    mobile: Mapped[str | None] = mapped_column(String(15), nullable=True)
    membership_date: Mapped[date] = mapped_column(Date, nullable=False)
    membership_expiry: Mapped[date | None] = mapped_column(Date, nullable=True)
    max_books_allowed: Mapped[int] = mapped_column(Integer, nullable=False, default=2)
    books_currently_issued: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_fine_due: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    is_blocked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    issues: Mapped[list["BookIssue"]] = relationship("BookIssue", back_populates="member")


class BookIssue(BaseModel):
    """
    Book issue / return register.
    One row per issue transaction.
    """
    __tablename__ = "lib_book_issues"

    issue_number: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    book_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("lib_books.id"), nullable=False, index=True)
    copy_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("lib_book_copies.id"), nullable=True)
    member_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("lib_members.id"), nullable=False, index=True)

    issue_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    return_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    status: Mapped[str] = mapped_column(String(20), nullable=False, default="issued")
    # issued / returned / overdue / lost

    fine_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    fine_paid: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    fine_per_day: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False, default=1)

    issued_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    returned_to: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    remarks: Mapped[str | None] = mapped_column(String(500), nullable=True)

    book: Mapped["Book"] = relationship("Book")
    copy: Mapped["BookCopy | None"] = relationship("BookCopy")
    member: Mapped["LibraryMember"] = relationship("LibraryMember", back_populates="issues")
