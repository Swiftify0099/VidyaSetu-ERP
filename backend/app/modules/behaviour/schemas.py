"""
VidyaSetu ERP — Student Behaviour Schemas
"""
from datetime import date
from typing import Optional
from pydantic import BaseModel, Field

class BehaviourCreateRequest(BaseModel):
    student_gr: str = Field(..., min_length=1)
    incident_date: date = Field(default_factory=date.today)
    incident_type: str = Field(default="negative")
    category: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)
    action_taken: Optional[str] = None
    follow_up_required: bool = False
    follow_up_date: Optional[date] = None

class BehaviourUpdateRequest(BaseModel):
    action_taken: Optional[str] = None
    status: Optional[str] = None
    follow_up_required: Optional[bool] = None
    follow_up_date: Optional[date] = None

class BehaviourResponse(BaseModel):
    id: int
    student_id: int
    student_name: str
    gr_number: str
    standard: str
    division: Optional[str]
    incident_date: date
    incident_type: str
    category: str
    description: str
    action_taken: Optional[str]
    reported_by_name: str
    follow_up_required: bool
    follow_up_date: Optional[date]
    status: str
    model_config = {"from_attributes": True}
