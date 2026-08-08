"""Seed default Exam Types for VidyaSetu ERP"""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Import main app models to ensure SQLAlchemy mappers register properly
import app.main  # noqa: F401

from app.database.session import SessionLocal
from app.modules.exam.models import ExamType
from sqlalchemy import select

db = SessionLocal()

default_types = [
    {
        "name": "Unit Test 1",
        "name_marathi": "एकक चाचणी १",
        "academic_year_id": 1,
        "sequence": 1,
        "max_marks": 25,
        "passing_marks": 10,
        "weightage": 10,
        "is_grade_system": False,
    },
    {
        "name": "Semester 1 Exam",
        "name_marathi": "प्रथम सत्रांत परीक्षा",
        "academic_year_id": 1,
        "sequence": 2,
        "max_marks": 50,
        "passing_marks": 18,
        "weightage": 40,
        "is_grade_system": False,
    },
    {
        "name": "Unit Test 2",
        "name_marathi": "एकक चाचणी २",
        "academic_year_id": 1,
        "sequence": 3,
        "max_marks": 25,
        "passing_marks": 10,
        "weightage": 10,
        "is_grade_system": False,
    },
    {
        "name": "Annual Examination",
        "name_marathi": "वार्षिक परीक्षा",
        "academic_year_id": 1,
        "sequence": 4,
        "max_marks": 100,
        "passing_marks": 35,
        "weightage": 40,
        "is_grade_system": False,
    },
]

created = 0
for data in default_types:
    existing = db.scalar(
        select(ExamType).where(
            ExamType.name == data["name"],
            ExamType.academic_year_id == data["academic_year_id"],
            ExamType.is_deleted == False
        )
    )
    if not existing:
        et = ExamType(**data, created_by=1)
        db.add(et)
        created += 1
        print(f"Created Exam Type: {data['name']} ({data['name_marathi']})")

db.commit()
print(f"Exam types seeding finished. Created: {created}")
