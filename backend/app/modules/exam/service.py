"""
VidyaSetu ERP — Exam Service & Schemas
=========================================
Grade engine: A+/A/B/C/D/F
Rank calculator
Result compiler
"""
from datetime import date
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel as PydanticBase
from fastapi import HTTPException
from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.modules.exam.models import (
    ExamType, Exam, ExamSubject, StudentMark, ExamResult
)
from app.shared.audit import AuditService


# ═══════════════════════════════════════════════════
# GRADE ENGINE
# ═══════════════════════════════════════════════════

GRADE_SCALE = [
    (90, "A+"), (80, "A"), (70, "B+"), (60, "B"),
    (50, "C"), (40, "D"), (35, "E"), (0, "F"),
]

def compute_grade(percentage: Decimal) -> str:
    for threshold, grade in GRADE_SCALE:
        if percentage >= threshold:
            return grade
    return "F"


# ═══════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════

class ExamTypeRequest(PydanticBase):
    name: str
    name_marathi: Optional[str] = None
    academic_year_id: int
    sequence: int = 1
    max_marks: int = 100
    passing_marks: int = 35
    is_grade_system: bool = False
    weightage: Decimal = Decimal("100")

class ExamTypeResponse(PydanticBase):
    model_config = {"from_attributes": True}
    id: int
    name: str
    name_marathi: Optional[str] = None
    academic_year_id: int
    sequence: int
    max_marks: int
    passing_marks: int
    is_grade_system: bool
    weightage: Decimal
    is_active: bool


class ExamSubjectRequest(PydanticBase):
    subject_name: str
    subject_name_marathi: Optional[str] = None
    subject_code: Optional[str] = None
    max_marks: int = 100
    passing_marks: int = 35
    theory_max: Optional[int] = None
    practical_max: Optional[int] = None
    is_optional: bool = False
    sort_order: int = 0

class ExamSubjectResponse(PydanticBase):
    model_config = {"from_attributes": True}
    id: int
    exam_id: int
    subject_name: str
    subject_name_marathi: Optional[str] = None
    subject_code: Optional[str] = None
    max_marks: int
    passing_marks: int
    theory_max: Optional[int] = None
    practical_max: Optional[int] = None
    is_optional: bool
    sort_order: int


class ExamRequest(PydanticBase):
    exam_type_id: int
    academic_year_id: int
    standard: str
    exam_date_from: Optional[date] = None
    exam_date_to: Optional[date] = None
    subjects: list[ExamSubjectRequest] = []

class ExamResponse(PydanticBase):
    model_config = {"from_attributes": True}
    id: int
    exam_type_id: int
    academic_year_id: int
    standard: str
    exam_date_from: Optional[date] = None
    exam_date_to: Optional[date] = None
    result_declared: bool
    result_date: Optional[date] = None
    exam_type: Optional[ExamTypeResponse] = None
    subjects: list[ExamSubjectResponse] = []


class MarkEntryRow(PydanticBase):
    student_id: int
    marks_obtained: Optional[Decimal] = None
    theory_marks: Optional[Decimal] = None
    practical_marks: Optional[Decimal] = None
    is_absent: bool = False
    is_exempted: bool = False
    remarks: Optional[str] = None

class BulkMarkEntryRequest(PydanticBase):
    exam_id: int
    exam_subject_id: int
    marks: list[MarkEntryRow]

class MarkResponse(PydanticBase):
    model_config = {"from_attributes": True}
    id: int
    exam_id: int
    exam_subject_id: int
    student_id: int
    marks_obtained: Optional[Decimal] = None
    theory_marks: Optional[Decimal] = None
    practical_marks: Optional[Decimal] = None
    grade: Optional[str] = None
    is_absent: bool
    is_exempted: bool
    remarks: Optional[str] = None


class SubjectMarkDetail(PydanticBase):
    subject_id: int
    subject_name: str
    subject_name_marathi: Optional[str] = None
    max_marks: int
    passing_marks: int
    marks_obtained: Optional[Decimal] = None
    theory_marks: Optional[Decimal] = None
    practical_marks: Optional[Decimal] = None
    grade: Optional[str] = None
    is_absent: bool = False
    is_exempted: bool = False
    status: str = "pending"  # pass / fail / absent / exempted / pending

class StudentResultDetail(PydanticBase):
    student_id: int
    student_name: str
    gr_number: str
    standard: str
    division: Optional[str] = None
    total_marks: Decimal
    max_marks: Decimal
    percentage: Decimal
    grade: Optional[str] = None
    result: str
    rank: Optional[int] = None
    subjects_passed: int
    subjects_failed: int
    subjects_absent: int
    subjects: list[SubjectMarkDetail] = []

class ClassResultSummary(PydanticBase):
    exam_id: int
    standard: str
    total_students: int
    appeared: int
    passed: int
    failed: int
    pass_percentage: Decimal
    class_average: Decimal
    highest_marks: Decimal
    lowest_marks: Decimal
    results: list[StudentResultDetail] = []

class ExamStatsResponse(PydanticBase):
    total_exams: int
    results_declared: int
    pending_results: int
    total_students_examined: int


# ═══════════════════════════════════════════════════
# SERVICES
# ═══════════════════════════════════════════════════

class ExamTypeService:
    @staticmethod
    def create(db: Session, data: ExamTypeRequest, created_by: int) -> ExamType:
        et = ExamType(**data.model_dump(), created_by=created_by)
        db.add(et); db.commit(); db.refresh(et); return et

    @staticmethod
    def get_by_year(db: Session, academic_year_id: int) -> list[ExamType]:
        return list(db.scalars(
            select(ExamType)
            .where(ExamType.academic_year_id == academic_year_id, ExamType.is_deleted == False)
            .order_by(ExamType.sequence)
        ).all())


class ExamService:
    @staticmethod
    def create(db: Session, data: ExamRequest, created_by: int) -> Exam:
        payload = data.model_dump(exclude={"subjects"})
        exam = Exam(**payload, created_by=created_by)
        db.add(exam); db.flush()

        for i, s in enumerate(data.subjects):
            subj = ExamSubject(**s.model_dump(), exam_id=exam.id,
                               sort_order=s.sort_order or i, created_by=created_by)
            db.add(subj)

        AuditService.log(db, action="EXAM_CREATED", module="exam", user_id=created_by,
                         description=f"Exam created: Std {data.standard}")
        db.commit(); db.refresh(exam); return exam

    @staticmethod
    def get_by_standard(db: Session, academic_year_id: int, standard: str) -> list[Exam]:
        return list(db.scalars(
            select(Exam)
            .options(joinedload(Exam.exam_type), joinedload(Exam.subjects))
            .where(
                Exam.academic_year_id == academic_year_id,
                Exam.standard == standard,
                Exam.is_deleted == False,
            )
            .order_by(Exam.id)
        ).all())

    @staticmethod
    def get_by_id(db: Session, exam_id: int) -> Exam:
        e = db.scalar(
            select(Exam)
            .options(joinedload(Exam.exam_type), joinedload(Exam.subjects))
            .where(Exam.id == exam_id, Exam.is_deleted == False)
        )
        if not e: raise HTTPException(404, "Exam not found.")
        return e

    @staticmethod
    def add_subject(db: Session, exam_id: int, data: ExamSubjectRequest, created_by: int) -> ExamSubject:
        s = ExamSubject(**data.model_dump(), exam_id=exam_id, created_by=created_by)
        db.add(s); db.commit(); db.refresh(s); return s


class MarksService:
    @staticmethod
    def bulk_enter(db: Session, data: BulkMarkEntryRequest, entered_by: int) -> int:
        subject = db.scalar(select(ExamSubject).where(ExamSubject.id == data.exam_subject_id))
        if not subject: raise HTTPException(404, "Subject not found.")

        saved = 0
        for row in data.marks:
            existing = db.scalar(
                select(StudentMark).where(
                    StudentMark.exam_id == data.exam_id,
                    StudentMark.exam_subject_id == data.exam_subject_id,
                    StudentMark.student_id == row.student_id,
                    StudentMark.is_deleted == False,
                )
            )

            # Compute actual marks
            actual = row.marks_obtained
            if actual is None and row.theory_marks is not None:
                actual = (row.theory_marks or Decimal("0")) + (row.practical_marks or Decimal("0"))

            # Compute grade
            grade = None
            if actual is not None and not row.is_absent:
                pct = (actual / subject.max_marks) * 100
                grade = compute_grade(pct)

            if existing:
                existing.marks_obtained = actual
                existing.theory_marks = row.theory_marks
                existing.practical_marks = row.practical_marks
                existing.grade = grade
                existing.is_absent = row.is_absent
                existing.is_exempted = row.is_exempted
                existing.remarks = row.remarks
                existing.entered_by = entered_by
            else:
                mark = StudentMark(
                    exam_id=data.exam_id,
                    exam_subject_id=data.exam_subject_id,
                    student_id=row.student_id,
                    marks_obtained=actual,
                    theory_marks=row.theory_marks,
                    practical_marks=row.practical_marks,
                    grade=grade,
                    is_absent=row.is_absent,
                    is_exempted=row.is_exempted,
                    remarks=row.remarks,
                    entered_by=entered_by,
                    created_by=entered_by,
                )
                db.add(mark)
            saved += 1

        db.commit()
        return saved

    @staticmethod
    def get_marks_for_subject(db: Session, exam_id: int, subject_id: int, division: Optional[str] = None) -> list[dict]:
        from app.modules.student.models import Student

        exam = ExamService.get_by_id(db, exam_id)
        
        # Build student query for this standard & division
        std_attr = Student.standard if hasattr(Student, "standard") else getattr(Student, "current_standard", None)
        div_attr = Student.division if hasattr(Student, "division") else getattr(Student, "current_division", None)
        
        stmt = select(Student).where(Student.is_deleted == False)
        if hasattr(Student, "standard"):
            stmt = stmt.where(Student.standard == exam.standard)
        elif hasattr(Student, "current_standard"):
            stmt = stmt.where(getattr(Student, "current_standard") == exam.standard)
            
        if division and division.upper() != "ALL":
            if hasattr(Student, "division"):
                stmt = stmt.where(Student.division == division.upper())
            elif hasattr(Student, "current_division"):
                stmt = stmt.where(getattr(Student, "current_division") == division.upper())

        students = list(db.scalars(stmt).all())
        
        # Fetch existing marks for this subject
        existing_marks = list(db.scalars(
            select(StudentMark)
            .where(
                StudentMark.exam_id == exam_id,
                StudentMark.exam_subject_id == subject_id,
                StudentMark.is_deleted == False,
            )
        ).all())
        mark_map = {m.student_id: m for m in existing_marks}

        # If students exist in DB for this standard/division, build full roster
        if students:
            # Sort by roll_number or full_name
            students.sort(key=lambda s: (getattr(s, "roll_number", 0) or 9999, getattr(s, "full_name", "")))
            results = []
            for s in students:
                m = mark_map.get(s.id)
                results.append({
                    "id": m.id if m else None,
                    "exam_id": exam_id,
                    "exam_subject_id": subject_id,
                    "student_id": s.id,
                    "student_name": getattr(s, "full_name", f"Student #{s.id}"),
                    "roll_number": getattr(s, "roll_number", None),
                    "gr_number": getattr(s, "gr_number", f"GR-{s.id}"),
                    "division": getattr(s, "division", getattr(s, "current_division", None)),
                    "marks_obtained": float(m.marks_obtained) if m and m.marks_obtained is not None else None,
                    "theory_marks": float(m.theory_marks) if m and m.theory_marks is not None else None,
                    "practical_marks": float(m.practical_marks) if m and m.practical_marks is not None else None,
                    "grade": m.grade if m else None,
                    "is_absent": m.is_absent if m else False,
                    "is_exempted": m.is_exempted if m else False,
                    "remarks": m.remarks if m else None,
                })
            return results

        # Fallback if no student records in student master table yet
        results = []
        for m in existing_marks:
            results.append({
                "id": m.id,
                "exam_id": m.exam_id,
                "exam_subject_id": m.exam_subject_id,
                "student_id": m.student_id,
                "student_name": f"Student #{m.student_id}",
                "roll_number": None,
                "gr_number": f"GR-{m.student_id}",
                "division": None,
                "marks_obtained": float(m.marks_obtained) if m.marks_obtained is not None else None,
                "theory_marks": float(m.theory_marks) if m.theory_marks is not None else None,
                "practical_marks": float(m.practical_marks) if m.practical_marks is not None else None,
                "grade": m.grade,
                "is_absent": m.is_absent,
                "is_exempted": m.is_exempted,
                "remarks": m.remarks,
            })
        return results


class ResultService:
    @staticmethod
    def compile_results(db: Session, exam_id: int, compiled_by: int) -> int:
        """
        Compute ExamResult for each student from StudentMark rows.
        Assigns rank by percentage.
        """
        from app.modules.student.models import Student

        exam = ExamService.get_by_id(db, exam_id)
        subjects = exam.subjects

        # Get all active students in this standard
        stmt = select(Student).where(Student.is_deleted == False)
        if hasattr(Student, "standard"):
            stmt = stmt.where(Student.standard == exam.standard)
        elif hasattr(Student, "current_standard"):
            stmt = stmt.where(getattr(Student, "current_standard") == exam.standard)
            
        students = list(db.scalars(stmt).all())

        results_data = []
        for student in students:
            marks_list = list(db.scalars(
                select(StudentMark)
                .where(
                    StudentMark.exam_id == exam_id,
                    StudentMark.student_id == student.id,
                    StudentMark.is_deleted == False,
                )
            ).all())

            if not marks_list:
                continue

            total = Decimal("0")
            max_t = Decimal("0")
            passed = failed = absent = 0

            subject_map = {s.id: s for s in subjects}

            for m in marks_list:
                subj = subject_map.get(m.exam_subject_id)
                if not subj or subj.is_optional:
                    continue
                max_t += subj.max_marks
                if m.is_absent:
                    absent += 1
                    failed += 1
                elif m.is_exempted:
                    total += subj.passing_marks  # treat as minimum pass
                    passed += 1
                else:
                    obt = m.marks_obtained or Decimal("0")
                    total += obt
                    if obt >= subj.passing_marks:
                        passed += 1
                    else:
                        failed += 1

            if max_t == 0:
                continue

            pct = (total / max_t * 100).quantize(Decimal("0.01"))
            grade = compute_grade(pct)
            result = "pass" if failed == 0 and absent == 0 else "fail"
            if absent > 0 and absent == len(marks_list):
                result = "absent"

            # Upsert result
            existing = db.scalar(
                select(ExamResult).where(
                    ExamResult.exam_id == exam_id,
                    ExamResult.student_id == student.id,
                    ExamResult.is_deleted == False,
                )
            )
            if existing:
                existing.total_marks = total; existing.max_marks = max_t
                existing.percentage = pct; existing.grade = grade
                existing.result = result; existing.subjects_passed = passed
                existing.subjects_failed = failed; existing.subjects_absent = absent
            else:
                res = ExamResult(
                    exam_id=exam_id, student_id=student.id,
                    total_marks=total, max_marks=max_t, percentage=pct,
                    grade=grade, result=result,
                    subjects_passed=passed, subjects_failed=failed, subjects_absent=absent,
                    created_by=compiled_by,
                )
                db.add(res)
                results_data.append(res)

        db.flush()

        # Assign ranks
        all_results = list(db.scalars(
            select(ExamResult)
            .where(ExamResult.exam_id == exam_id, ExamResult.is_deleted == False)
            .order_by(ExamResult.percentage.desc())
        ).all())

        for rank, r in enumerate(all_results, start=1):
            r.rank = rank

        exam.result_declared = True
        exam.result_date = date.today()

        AuditService.log(db, action="RESULTS_COMPILED", module="exam", user_id=compiled_by,
                         description=f"Results compiled for exam #{exam_id}: {len(all_results)} students")
        db.commit()
        return len(all_results)

    @staticmethod
    def get_class_result(db: Session, exam_id: int, division: Optional[str] = None) -> ClassResultSummary:
        from app.modules.student.models import Student

        exam = ExamService.get_by_id(db, exam_id)
        subjects = sorted(exam.subjects, key=lambda s: s.sort_order)

        results = list(db.scalars(
            select(ExamResult)
            .where(ExamResult.exam_id == exam_id, ExamResult.is_deleted == False)
            .order_by(ExamResult.rank)
        ).all())

        student_ids = [r.student_id for r in results]
        students_map = {}
        if student_ids:
            sts = db.scalars(select(Student).where(Student.id.in_(student_ids))).all()
            students_map = {s.id: s for s in sts}

        all_marks = list(db.scalars(
            select(StudentMark)
            .where(StudentMark.exam_id == exam_id, StudentMark.is_deleted == False)
        ).all())
        marks_map: dict[tuple, StudentMark] = {}
        for m in all_marks:
            marks_map[(m.student_id, m.exam_subject_id)] = m

        detailed = []
        for r in results:
            student = students_map.get(r.student_id)
            if not student: continue

            st_div = getattr(student, "division", getattr(student, "current_division", None))
            if division and division.upper() != "ALL" and st_div and st_div.upper() != division.upper():
                continue

            subj_details = []
            for s in subjects:
                m = marks_map.get((r.student_id, s.id))
                status = "pending"
                if m:
                    if m.is_absent: status = "absent"
                    elif m.is_exempted: status = "exempted"
                    elif m.marks_obtained is not None:
                        status = "pass" if m.marks_obtained >= s.passing_marks else "fail"
                subj_details.append(SubjectMarkDetail(
                    subject_id=s.id, subject_name=s.subject_name,
                    subject_name_marathi=s.subject_name_marathi,
                    max_marks=s.max_marks, passing_marks=s.passing_marks,
                    marks_obtained=m.marks_obtained if m else None,
                    theory_marks=m.theory_marks if m else None,
                    practical_marks=m.practical_marks if m else None,
                    grade=m.grade if m else None,
                    is_absent=m.is_absent if m else False,
                    is_exempted=m.is_exempted if m else False,
                    status=status,
                ))

            st_std = getattr(student, "standard", getattr(student, "current_standard", exam.standard))
            detailed.append(StudentResultDetail(
                student_id=r.student_id, student_name=student.full_name,
                gr_number=student.gr_number, standard=st_std,
                division=st_div, total_marks=r.total_marks,
                max_marks=r.max_marks, percentage=r.percentage, grade=r.grade,
                result=r.result, rank=r.rank, subjects_passed=r.subjects_passed,
                subjects_failed=r.subjects_failed, subjects_absent=r.subjects_absent,
                subjects=subj_details,
            ))

        # Re-rank filtered section results if division filter active
        if division and division.upper() != "ALL":
            detailed.sort(key=lambda x: x.percentage, reverse=True)
            for idx, item in enumerate(detailed, 1):
                item.rank = idx

        total = len(detailed)
        appeared = sum(1 for r in detailed if r.result != "absent")
        passed = sum(1 for r in detailed if r.result == "pass")
        failed = appeared - passed
        percentages = [r.percentage for r in detailed if r.result != "absent"]
        avg = sum(percentages) / len(percentages) if percentages else Decimal("0")
        highest = max(percentages) if percentages else Decimal("0")
        lowest = min(percentages) if percentages else Decimal("0")
        pass_pct = Decimal(str(round(passed / appeared * 100, 2))) if appeared > 0 else Decimal("0")

        return ClassResultSummary(
            exam_id=exam_id, standard=exam.standard,
            total_students=total, appeared=appeared, passed=passed, failed=failed,
            pass_percentage=pass_pct, class_average=Decimal(str(round(avg, 2))),
            highest_marks=highest, lowest_marks=lowest, results=detailed,
        )


class ExamStatsService:
    @staticmethod
    def get(db: Session, academic_year_id: int) -> ExamStatsResponse:
        total = db.scalar(select(func.count()).where(
            Exam.academic_year_id == academic_year_id, Exam.is_deleted == False
        )) or 0
        declared = db.scalar(select(func.count()).where(
            Exam.academic_year_id == academic_year_id,
            Exam.result_declared == True, Exam.is_deleted == False
        )) or 0
        students_examined = db.scalar(select(func.count(ExamResult.student_id.distinct())).where(
            ExamResult.is_deleted == False
        )) or 0
        return ExamStatsResponse(
            total_exams=total, results_declared=declared,
            pending_results=total - declared, total_students_examined=students_examined,
        )
