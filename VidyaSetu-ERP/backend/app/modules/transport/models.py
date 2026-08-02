"""
VidyaSetu ERP — Transport Module Models
========================================
Manages school bus routes, vehicles, stops, drivers,
and student transport assignments.

Tables:
  - TransportRoute  : Defined routes (Route A, Route B ...)
  - TransportVehicle: School vehicles (buses, vans)
  - TransportStop   : Pickup/drop points on each route
  - StudentTransport: Student assignment to route + stop
  - DriverAttendance: Driver/attendant daily log
"""
from datetime import date, time
from sqlalchemy import (
    BigInteger, Boolean, Date, ForeignKey,
    Integer, Numeric, String, Text, Time, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import BaseModel


class TransportRoute(BaseModel):
    """School transport route master."""
    __tablename__ = "transport_routes"

    name: Mapped[str] = mapped_column(String(200), nullable=False, unique=True, index=True)
    route_code: Mapped[str] = mapped_column(String(30), nullable=False, unique=True)
    # e.g. ROUTE-A, ROUTE-B
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    start_point: Mapped[str] = mapped_column(String(200), nullable=False)
    end_point: Mapped[str] = mapped_column(String(200), nullable=False)
    total_distance_km: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    morning_start_time: Mapped[str | None] = mapped_column(String(10), nullable=True)
    afternoon_start_time: Mapped[str | None] = mapped_column(String(10), nullable=True)
    academic_year: Mapped[str | None] = mapped_column(String(10), nullable=True)
    monthly_fee: Mapped[float | None] = mapped_column(Numeric(8, 2), nullable=True)

    stops: Mapped[list["TransportStop"]] = relationship(
        "TransportStop", back_populates="route", cascade="all, delete-orphan"
    )


class TransportVehicle(BaseModel):
    """School vehicle master (buses, vans)."""
    __tablename__ = "transport_vehicles"

    vehicle_number: Mapped[str] = mapped_column(String(30), nullable=False, unique=True, index=True)
    vehicle_type: Mapped[str] = mapped_column(String(30), nullable=False, default="bus")
    # bus / van / auto / mini_bus
    capacity: Mapped[int] = mapped_column(Integer, nullable=False, default=40)
    model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    manufacturer: Mapped[str | None] = mapped_column(String(100), nullable=True)
    year_of_manufacture: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fitness_expiry: Mapped[date | None] = mapped_column(Date, nullable=True)
    insurance_expiry: Mapped[date | None] = mapped_column(Date, nullable=True)
    permit_expiry: Mapped[date | None] = mapped_column(Date, nullable=True)
    driver_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    driver_mobile: Mapped[str | None] = mapped_column(String(15), nullable=True)
    driver_license: Mapped[str | None] = mapped_column(String(50), nullable=True)
    attendant_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    attendant_mobile: Mapped[str | None] = mapped_column(String(15), nullable=True)
    assigned_route_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("transport_routes.id"), nullable=True
    )
    fuel_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # diesel / cng / electric / petrol
    gps_device_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    # active / under_maintenance / retired

    route: Mapped["TransportRoute | None"] = relationship("TransportRoute")


class TransportStop(BaseModel):
    """Individual pickup/drop stop on a route."""
    __tablename__ = "transport_stops"
    __table_args__ = (
        UniqueConstraint("route_id", "stop_order", name="uq_route_stop_order"),
    )

    route_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("transport_routes.id"), nullable=False, index=True
    )
    stop_name: Mapped[str] = mapped_column(String(200), nullable=False)
    stop_name_marathi: Mapped[str | None] = mapped_column(String(200), nullable=True)
    stop_order: Mapped[int] = mapped_column(Integer, nullable=False)
    morning_pickup_time: Mapped[str | None] = mapped_column(String(10), nullable=True)
    afternoon_drop_time: Mapped[str | None] = mapped_column(String(10), nullable=True)
    landmark: Mapped[str | None] = mapped_column(String(300), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Numeric(10, 7), nullable=True)
    longitude: Mapped[float | None] = mapped_column(Numeric(10, 7), nullable=True)

    route: Mapped["TransportRoute"] = relationship("TransportRoute", back_populates="stops")


class StudentTransport(BaseModel):
    """Student assignment to a transport route and stop."""
    __tablename__ = "student_transport"
    __table_args__ = (
        UniqueConstraint("student_id", "academic_year", name="uq_student_transport_year"),
    )

    student_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("students.id"), nullable=False, index=True
    )
    route_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("transport_routes.id"), nullable=False
    )
    stop_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("transport_stops.id"), nullable=True
    )
    academic_year: Mapped[str] = mapped_column(String(10), nullable=False)
    direction: Mapped[str] = mapped_column(String(10), nullable=False, default="both")
    # morning / afternoon / both
    fee_monthly: Mapped[float | None] = mapped_column(Numeric(8, 2), nullable=True)
    from_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    to_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    remarks: Mapped[str | None] = mapped_column(String(300), nullable=True)
    assigned_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    route: Mapped["TransportRoute"] = relationship("TransportRoute")
    stop: Mapped["TransportStop | None"] = relationship("TransportStop")
