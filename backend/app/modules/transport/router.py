"""
VidyaSetu ERP — Transport Module Router
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.dependencies import AuthUser, DBSession, require_permission
from app.modules.transport.models import (
    TransportRoute, TransportVehicle, TransportStop, StudentTransport
)
from app.shared.responses import APIResponse
from app.shared.audit import create_audit_log

router = APIRouter(prefix="/transport", tags=["Transport"])


# ── Routes ────────────────────────────────────────────────────

@router.get("/routes", response_model=APIResponse,
            dependencies=[Depends(require_permission("transport.read"))])
async def list_routes(db: DBSession, current_user: AuthUser,
                      academic_year: Optional[str] = None):
    q = select(TransportRoute).where(TransportRoute.is_deleted == False)
    if academic_year:
        q = q.where(TransportRoute.academic_year == academic_year)
    routes = db.scalars(q.order_by(TransportRoute.route_code)).all()
    return APIResponse.ok(data=[_route_dict(r) for r in routes])


@router.post("/routes", response_model=APIResponse, status_code=201,
             dependencies=[Depends(require_permission("transport.create"))])
async def create_route(body: dict, db: DBSession, current_user: AuthUser):
    route = TransportRoute(**body, created_by=current_user.user_id, updated_by=current_user.user_id)
    db.add(route)
    db.commit()
    db.refresh(route)
    create_audit_log(db, "create", "transport_routes", route.id, None, body, current_user.user_id)
    return APIResponse.created(data=_route_dict(route), message="Route created.")


@router.put("/routes/{route_id}", response_model=APIResponse,
            dependencies=[Depends(require_permission("transport.update"))])
async def update_route(route_id: int, body: dict, db: DBSession, current_user: AuthUser):
    route = db.get(TransportRoute, route_id)
    if not route or route.is_deleted:
        return APIResponse.error("Route not found", status_code=404)
    before = _route_dict(route)
    for k, v in body.items():
        if hasattr(route, k):
            setattr(route, k, v)
    route.updated_by = current_user.user_id
    db.commit()
    db.refresh(route)
    create_audit_log(db, "update", "transport_routes", route_id, before, body, current_user.user_id)
    return APIResponse.ok(data=_route_dict(route))


@router.delete("/routes/{route_id}", response_model=APIResponse,
               dependencies=[Depends(require_permission("transport.update"))])
async def delete_route(route_id: int, db: DBSession, current_user: AuthUser):
    route = db.get(TransportRoute, route_id)
    if not route:
        return APIResponse.error("Route not found", status_code=404)
    route.is_deleted = True
    route.updated_by = current_user.user_id
    db.commit()
    return APIResponse.ok(message="Route deleted.")


# ── Vehicles ──────────────────────────────────────────────────

@router.get("/vehicles", response_model=APIResponse,
            dependencies=[Depends(require_permission("transport.read"))])
async def list_vehicles(db: DBSession, current_user: AuthUser):
    vehicles = db.scalars(
        select(TransportVehicle).where(TransportVehicle.is_deleted == False)
        .order_by(TransportVehicle.vehicle_number)
    ).all()
    return APIResponse.ok(data=[_vehicle_dict(v) for v in vehicles])


@router.post("/vehicles", response_model=APIResponse, status_code=201,
             dependencies=[Depends(require_permission("transport.create"))])
async def create_vehicle(body: dict, db: DBSession, current_user: AuthUser):
    vehicle = TransportVehicle(**body, created_by=current_user.user_id, updated_by=current_user.user_id)
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return APIResponse.created(data=_vehicle_dict(vehicle), message="Vehicle added.")


@router.put("/vehicles/{vehicle_id}", response_model=APIResponse,
            dependencies=[Depends(require_permission("transport.update"))])
async def update_vehicle(vehicle_id: int, body: dict, db: DBSession, current_user: AuthUser):
    vehicle = db.get(TransportVehicle, vehicle_id)
    if not vehicle or vehicle.is_deleted:
        return APIResponse.error("Vehicle not found", status_code=404)
    for k, v in body.items():
        if hasattr(vehicle, k):
            setattr(vehicle, k, v)
    vehicle.updated_by = current_user.user_id
    db.commit()
    db.refresh(vehicle)
    return APIResponse.ok(data=_vehicle_dict(vehicle))


# ── Stops ──────────────────────────────────────────────────────

@router.get("/routes/{route_id}/stops", response_model=APIResponse,
            dependencies=[Depends(require_permission("transport.read"))])
async def route_stops(route_id: int, db: DBSession, current_user: AuthUser):
    stops = db.scalars(
        select(TransportStop)
        .where(TransportStop.route_id == route_id, TransportStop.is_deleted == False)
        .order_by(TransportStop.stop_order)
    ).all()
    return APIResponse.ok(data=[_stop_dict(s) for s in stops])


@router.post("/stops", response_model=APIResponse, status_code=201,
             dependencies=[Depends(require_permission("transport.create"))])
async def create_stop(body: dict, db: DBSession, current_user: AuthUser):
    stop = TransportStop(**body, created_by=current_user.user_id, updated_by=current_user.user_id)
    db.add(stop)
    db.commit()
    db.refresh(stop)
    return APIResponse.created(data=_stop_dict(stop), message="Stop added.")


# ── Student Transport Assignment ──────────────────────────────

@router.get("/students", response_model=APIResponse,
            dependencies=[Depends(require_permission("transport.read"))])
async def list_student_transport(db: DBSession, current_user: AuthUser,
                                  academic_year: Optional[str] = None,
                                  route_id: Optional[int] = None):
    q = select(StudentTransport).where(StudentTransport.is_deleted == False)
    if academic_year:
        q = q.where(StudentTransport.academic_year == academic_year)
    if route_id:
        q = q.where(StudentTransport.route_id == route_id)
    records = db.scalars(q.order_by(StudentTransport.student_id)).all()
    return APIResponse.ok(data=[_student_transport_dict(r) for r in records])


@router.post("/students/assign", response_model=APIResponse, status_code=201,
             dependencies=[Depends(require_permission("transport.create"))])
async def assign_student(body: dict, db: DBSession, current_user: AuthUser):
    assign = StudentTransport(
        **body, assigned_by=current_user.user_id,
        created_by=current_user.user_id, updated_by=current_user.user_id
    )
    db.add(assign)
    db.commit()
    db.refresh(assign)
    create_audit_log(db, "create", "student_transport", assign.id, None, body, current_user.user_id)
    return APIResponse.created(data=_student_transport_dict(assign), message="Student assigned to transport.")


@router.delete("/students/{assign_id}", response_model=APIResponse,
               dependencies=[Depends(require_permission("transport.update"))])
async def remove_student_transport(assign_id: int, db: DBSession, current_user: AuthUser):
    assign = db.get(StudentTransport, assign_id)
    if not assign:
        return APIResponse.error("Assignment not found", status_code=404)
    assign.is_active = False
    assign.updated_by = current_user.user_id
    db.commit()
    return APIResponse.ok(message="Student removed from transport.")


# ── Summary Stats ─────────────────────────────────────────────

@router.get("/stats", response_model=APIResponse,
            dependencies=[Depends(require_permission("transport.read"))])
async def transport_stats(db: DBSession, current_user: AuthUser,
                           academic_year: Optional[str] = None):
    total_routes = db.scalar(
        select(__import__("sqlalchemy", fromlist=["func"]).func.count())
        .select_from(TransportRoute)
        .where(TransportRoute.is_deleted == False)
    ) or 0
    total_vehicles = db.scalar(
        select(__import__("sqlalchemy", fromlist=["func"]).func.count())
        .select_from(TransportVehicle)
        .where(TransportVehicle.is_deleted == False)
    ) or 0
    q = select(__import__("sqlalchemy", fromlist=["func"]).func.count()).select_from(StudentTransport)\
        .where(StudentTransport.is_deleted == False, StudentTransport.is_active == True)
    if academic_year:
        q = q.where(StudentTransport.academic_year == academic_year)
    total_students = db.scalar(q) or 0

    return APIResponse.ok(data={
        "total_routes": total_routes,
        "total_vehicles": total_vehicles,
        "students_on_transport": total_students,
    })


# ── Helpers ───────────────────────────────────────────────────

def _route_dict(r: TransportRoute) -> dict:
    return {
        "id": r.id, "name": r.name, "route_code": r.route_code,
        "description": r.description, "start_point": r.start_point,
        "end_point": r.end_point, "total_distance_km": r.total_distance_km,
        "morning_start_time": r.morning_start_time,
        "afternoon_start_time": r.afternoon_start_time,
        "academic_year": r.academic_year, "monthly_fee": r.monthly_fee,
        "is_active": r.is_active,
    }


def _vehicle_dict(v: TransportVehicle) -> dict:
    return {
        "id": v.id, "vehicle_number": v.vehicle_number, "vehicle_type": v.vehicle_type,
        "capacity": v.capacity, "model": v.model,
        "fitness_expiry": str(v.fitness_expiry) if v.fitness_expiry else None,
        "insurance_expiry": str(v.insurance_expiry) if v.insurance_expiry else None,
        "driver_name": v.driver_name, "driver_mobile": v.driver_mobile,
        "attendant_name": v.attendant_name,
        "assigned_route_id": v.assigned_route_id, "status": v.status,
        "is_active": v.is_active,
    }


def _stop_dict(s: TransportStop) -> dict:
    return {
        "id": s.id, "route_id": s.route_id, "stop_name": s.stop_name,
        "stop_name_marathi": s.stop_name_marathi, "stop_order": s.stop_order,
        "morning_pickup_time": s.morning_pickup_time,
        "afternoon_drop_time": s.afternoon_drop_time,
        "landmark": s.landmark, "latitude": s.latitude, "longitude": s.longitude,
    }


def _student_transport_dict(r: StudentTransport) -> dict:
    return {
        "id": r.id, "student_id": r.student_id,
        "route_id": r.route_id, "stop_id": r.stop_id,
        "academic_year": r.academic_year, "direction": r.direction,
        "fee_monthly": r.fee_monthly, "is_active": r.is_active,
        "from_date": str(r.from_date) if r.from_date else None,
        "to_date": str(r.to_date) if r.to_date else None,
        "remarks": r.remarks,
    }
