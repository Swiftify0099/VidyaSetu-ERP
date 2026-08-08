"""
VidyaSetu ERP — Student Certificate Generator
================================================
Government-format TC, Bonafide, and Leaving Certificates.
Uses ReportLab for PDF generation.
"""
from datetime import date
from io import BytesIO

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm, mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from app.core.config import settings
from app.modules.student.models import Student


class CertificateGenerator:
    """
    Government-format certificate generator.
    TC (Transfer Certificate) and Bonafide follow Maharashtra Board templates.
    """

    PAGE_WIDTH, PAGE_HEIGHT = A4
    MARGIN = 2 * cm

    @classmethod
    def _styles(cls) -> dict:
        """Return reusable paragraph styles."""
        return {
            "school_name": ParagraphStyle(
                "school_name",
                fontSize=16,
                fontName="Helvetica-Bold",
                alignment=1,  # center
                spaceAfter=4,
            ),
            "school_sub": ParagraphStyle(
                "school_sub",
                fontSize=10,
                fontName="Helvetica",
                alignment=1,
                spaceAfter=2,
            ),
            "cert_title": ParagraphStyle(
                "cert_title",
                fontSize=14,
                fontName="Helvetica-Bold",
                alignment=1,
                spaceBefore=8,
                spaceAfter=8,
                textColor=colors.HexColor("#1D4ED8"),
            ),
            "body": ParagraphStyle(
                "body",
                fontSize=10,
                fontName="Helvetica",
                leading=18,
                spaceAfter=4,
            ),
            "label": ParagraphStyle(
                "label",
                fontSize=10,
                fontName="Helvetica-Bold",
                leading=18,
            ),
            "footer": ParagraphStyle(
                "footer",
                fontSize=9,
                fontName="Helvetica",
                alignment=1,
                textColor=colors.grey,
            ),
        }

    @classmethod
    def generate_tc(cls, student: Student, tc_number: str) -> BytesIO:
        """
        Generate Transfer Certificate (TC) in government format.
        Returns PDF as BytesIO buffer.
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=cls.MARGIN,
            rightMargin=cls.MARGIN,
            topMargin=cls.MARGIN,
            bottomMargin=cls.MARGIN,
        )

        styles = cls._styles()
        story = []

        # ── Header ────────────────────────────────────────────
        story.append(Paragraph(settings.SCHOOL_NAME, styles["school_name"]))
        story.append(Paragraph(settings.SCHOOL_ADDRESS, styles["school_sub"]))
        story.append(Paragraph(
            f"Phone: {settings.SCHOOL_PHONE}  |  Email: {settings.SCHOOL_EMAIL}",
            styles["school_sub"]
        ))
        story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#1D4ED8")))
        story.append(Spacer(1, 0.3 * cm))
        story.append(Paragraph("TRANSFER CERTIFICATE", styles["cert_title"]))
        story.append(Paragraph("(हस्तांतरण प्रमाणपत्र)", styles["school_sub"]))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.lightgrey))
        story.append(Spacer(1, 0.3 * cm))

        # ── TC Number + Date ──────────────────────────────────
        meta_data = [
            [
                Paragraph(f"<b>TC No.:</b> {tc_number}", styles["body"]),
                Paragraph(f"<b>Date:</b> {date.today().strftime('%d/%m/%Y')}", styles["body"]),
            ],
            [
                Paragraph(f"<b>GR No.:</b> {student.gr_number}", styles["body"]),
                Paragraph(f"<b>Admission No.:</b> {student.admission_number or '-'}", styles["body"]),
            ]
        ]
        meta_table = Table(meta_data, colWidths=[9 * cm, 9 * cm])
        meta_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 0.4 * cm))

        # ── Student Details Table ─────────────────────────────
        def row(label: str, value: str) -> list:
            return [
                Paragraph(f"<b>{label}</b>", styles["label"]),
                Paragraph(":", styles["body"]),
                Paragraph(value or "-", styles["body"]),
            ]

        rows = [
            row("Student Name (English)", student.full_name),
            row("Student Name (Marathi)", student.full_name_marathi or "-"),
            row("Father's Name", student.father_name or "-"),
            row("Mother's Name", student.mother_name_full or student.mother_name or "-"),
            row("Date of Birth", student.dob.strftime("%d/%m/%Y") if student.dob else "-"),
            row("Date of Birth (In Words)", student.dob_in_words or "-"),
            row("Place of Birth", student.place_of_birth or "-"),
            row("Nationality", student.nationality or "Indian"),
            row("Religion", student.religion or "-"),
            row("Caste / Category", f"{student.caste or '-'} / {student.category or '-'}"),
            row("Mother Tongue", student.mother_tongue or "-"),
            row("Standard of Admission", student.admission_standard or "-"),
            row("Date of Admission", student.admission_date.strftime("%d/%m/%Y") if student.admission_date else "-"),
            row("Standard at Time of Leaving", student.standard),
            row("Date of Leaving", student.date_of_leaving.strftime("%d/%m/%Y") if student.date_of_leaving else "-"),
            row("Reason for Leaving", student.leaving_reason or "-"),
            row("SARAL ID", student.student_id_saral or "-"),
            row("PEN Number", student.pen_number or "-"),
            row("APAAR ID", student.apaar_id or "-"),
            row("Conduct and Character", "Good (चांगला)"),
        ]

        detail_table = Table(rows, colWidths=[6.5 * cm, 0.5 * cm, 11 * cm])
        detail_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("LINEBELOW", (0, 0), (-1, -2), 0.5, colors.lightgrey),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EFF6FF")),
        ]))
        story.append(detail_table)
        story.append(Spacer(1, 0.8 * cm))

        # ── Certify Statement ─────────────────────────────────
        story.append(Paragraph(
            f"Certified that the above information is correct and complete as per the school records.",
            styles["body"]
        ))
        story.append(Spacer(1, 1.5 * cm))

        # ── Signature Block ───────────────────────────────────
        sig_data = [
            [
                Paragraph("_________________________", styles["body"]),
                Paragraph("_________________________", styles["body"]),
            ],
            [
                Paragraph("Class Teacher's Signature", styles["body"]),
                Paragraph(f"Principal\n{settings.PRINCIPAL_NAME}\n{settings.SCHOOL_NAME}", styles["body"]),
            ],
        ]
        sig_table = Table(sig_data, colWidths=[9 * cm, 9 * cm])
        sig_table.setStyle(TableStyle([
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ]))
        story.append(sig_table)
        story.append(Spacer(1, 0.5 * cm))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.lightgrey))
        story.append(Paragraph(
            f"Generated by VidyaSetu ERP · {settings.SCHOOL_NAME} · {date.today().strftime('%d/%m/%Y')}",
            styles["footer"]
        ))

        doc.build(story)
        buffer.seek(0)
        return buffer

    @classmethod
    def generate_bonafide(cls, student: Student, purpose: str = "General Purpose") -> BytesIO:
        """
        Generate Bonafide Certificate in government format.
        Returns PDF as BytesIO buffer.
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=cls.MARGIN,
            rightMargin=cls.MARGIN,
            topMargin=cls.MARGIN,
            bottomMargin=cls.MARGIN,
        )

        styles = cls._styles()
        story = []

        # ── Header ────────────────────────────────────────────
        story.append(Paragraph(settings.SCHOOL_NAME, styles["school_name"]))
        story.append(Paragraph(settings.SCHOOL_ADDRESS, styles["school_sub"]))
        story.append(Paragraph(
            f"Phone: {settings.SCHOOL_PHONE}  |  Email: {settings.SCHOOL_EMAIL}",
            styles["school_sub"]
        ))
        story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#1D4ED8")))
        story.append(Spacer(1, 0.3 * cm))
        story.append(Paragraph("BONAFIDE CERTIFICATE", styles["cert_title"]))
        story.append(Paragraph("(बोनाफाइड प्रमाणपत्र)", styles["school_sub"]))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.lightgrey))
        story.append(Spacer(1, 0.5 * cm))

        # ── Ref + Date ────────────────────────────────────────
        story.append(Paragraph(f"Date: {date.today().strftime('%d/%m/%Y')}", styles["body"]))
        story.append(Spacer(1, 0.3 * cm))

        # ── Body ──────────────────────────────────────────────
        story.append(Paragraph("To Whomsoever It May Concern,", styles["body"]))
        story.append(Spacer(1, 0.3 * cm))

        body_text = (
            f"This is to certify that <b>{student.full_name}</b>, "
            f"{'Son' if student.gender == 'male' else 'Daughter'} of "
            f"<b>{student.father_name or '___________'}</b>, "
            f"is a <b>Bona Fide student</b> of this school. "
            f"{'He' if student.gender == 'male' else 'She'} is currently studying in "
            f"<b>Standard {student.standard}</b>"
            f"{f', Division <b>{student.division}</b>' if student.division else ''} "
            f"for the academic year <b>{settings.CURRENT_ACADEMIC_YEAR}</b>."
        )
        story.append(Paragraph(body_text, styles["body"]))
        story.append(Spacer(1, 0.4 * cm))

        dob_text = (
            f"{'His' if student.gender == 'male' else 'Her'} date of birth as per school record is "
            f"<b>{student.dob.strftime('%d/%m/%Y') if student.dob else '___________'}</b>"
            f"{f' ({student.dob_in_words})' if student.dob_in_words else ''}."
        )
        story.append(Paragraph(dob_text, styles["body"]))
        story.append(Spacer(1, 0.3 * cm))
        story.append(Paragraph(
            f"GR Number: <b>{student.gr_number}</b>",
            styles["body"]
        ))
        story.append(Spacer(1, 0.3 * cm))
        story.append(Paragraph(
            f"This certificate is issued for the purpose of <b>{purpose}</b>.",
            styles["body"]
        ))
        story.append(Spacer(1, 2 * cm))

        # ── Signature ─────────────────────────────────────────
        story.append(Paragraph("_________________________", styles["body"]))
        story.append(Paragraph(
            f"Principal<br/>{settings.PRINCIPAL_NAME}<br/>{settings.SCHOOL_NAME}",
            styles["body"]
        ))
        story.append(Spacer(1, 0.5 * cm))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.lightgrey))
        story.append(Paragraph(
            f"Generated by VidyaSetu ERP · {settings.SCHOOL_NAME} · {date.today().strftime('%d/%m/%Y')}",
            styles["footer"]
        ))

        doc.build(story)
        buffer.seek(0)
        return buffer
