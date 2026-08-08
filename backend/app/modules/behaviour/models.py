"""
VidyaSetu ERP — Student Behaviour Models
"""
import enum
from datetime import date
from sqlalchemy import Column, String, Integer, Date, Boolean, Text, Enum
from app.database.base import BaseModel

class IncidentType(str, enum.Enum):
    positive = "positive"
    negative = "negative"
    neutral = "neutral"

class IncidentStatus(str, enum.Enum):
    open = "open"
    resolved = "resolved"
    escalated = "escalated"
    closed = "closed"

class StudentBehaviourLog(BaseModel):
    __tablename__ = "student_behaviour_logs"

    student_id = Column(Integer, nullable=False, index=True)
    student_name = Column(String(150), nullable=False)
    gr_number = Column(String(50), nullable=False, index=True)
    standard = Column(String(10), nullable=False)
    division = Column(String(5), nullable=True)

    incident_date = Column(Date, default=date.today, nullable=False)
    incident_type = Column(Enum(IncidentType), default=IncidentType.negative, nullable=False)
    category = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    action_taken = Column(Text, nullable=True)
    reported_by_name = Column(String(150), nullable=False)
    follow_up_required = Column(Boolean, default=False)
    follow_up_date = Column(Date, nullable=True)
    status = Column(Enum(IncidentStatus), default=IncidentStatus.open, nullable=False)
