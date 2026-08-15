"""
VidyaSetu ERP — Missing Tables Schema Migration
=================================================
Phase: Comprehensive Schema Synchronization (a009)

Creates 21 missing tables across modules:
  - student_behaviour_logs        : Student discipline and behaviour records
  - fcm_tokens                    : Firebase Cloud Messaging tokens per device
  - notification_logs             : Push notification delivery audit history
  - video_contents                : Teacher uploaded/linked educational videos
  - transport_routes              : School bus/van route masters
  - transport_vehicles            : School vehicle registry and driver details
  - transport_stops               : Pickup & drop stops along routes
  - student_transport             : Student-to-route assignment
  - student_leaves                : Student leave applications
  - subjects                      : Subject catalog
  - period_configs                : School bell/period configurations
  - timetable_entries             : Weekly timetable grid
  - teacher_subject_assignments   : Teacher allocations per subject/class
  - substitute_entries            : Substitute teacher mappings
  - communication_logs            : SMS, WhatsApp, Email, and Push logs
  - announcements                 : Dashboard bulletin announcements
  - notifications                 : Per-user notification inbox
  - bonafide_applications         : Bonafide certificate requests & issuance
  - ai_logs                       : AI module interaction & token logs
  - qr_code_records               : System-generated QR tracking records
  - qr_scan_logs                  : Audit trail for all QR scans

Run: python -m alembic upgrade head
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a009_missing_tables'
down_revision = 'a008_device_security_tables'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. student_behaviour_logs ──────────────────────────────
    op.create_table(
        'student_behaviour_logs',
        sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('uuid', sa.String(36), nullable=False, unique=True),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('student_name', sa.String(150), nullable=False),
        sa.Column('gr_number', sa.String(50), nullable=False),
        sa.Column('standard', sa.String(10), nullable=False),
        sa.Column('division', sa.String(5), nullable=True),
        sa.Column('incident_date', sa.Date(), nullable=False),
        sa.Column('incident_type', sa.String(20), nullable=False, server_default='negative'),
        sa.Column('category', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('action_taken', sa.Text(), nullable=True),
        sa.Column('reported_by_name', sa.String(150), nullable=False),
        sa.Column('follow_up_required', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('follow_up_date', sa.Date(), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='open'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.BigInteger(), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
    )
    op.create_index('ix_student_behaviour_logs_student_id', 'student_behaviour_logs', ['student_id'])
    op.create_index('ix_student_behaviour_logs_gr_number', 'student_behaviour_logs', ['gr_number'])

    # ── 2. fcm_tokens ──────────────────────────────────────────
    op.create_table(
        'fcm_tokens',
        sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('uuid', sa.String(36), nullable=False, unique=True),
        sa.Column('user_id', sa.BigInteger(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('fcm_token', sa.Text(), nullable=False, unique=True),
        sa.Column('device_type', sa.String(20), nullable=False, server_default='web'),
        sa.Column('platform', sa.String(50), nullable=True),
        sa.Column('browser', sa.String(100), nullable=True),
        sa.Column('os', sa.String(100), nullable=True),
        sa.Column('device_name', sa.String(200), nullable=True),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.BigInteger(), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
    )
    op.create_index('ix_fcm_tokens_user_id', 'fcm_tokens', ['user_id'])
    op.create_index('ix_fcm_tokens_user_active', 'fcm_tokens', ['user_id', 'is_active', 'is_deleted'])

    # ── 3. notification_logs ───────────────────────────────────
    op.create_table(
        'notification_logs',
        sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('uuid', sa.String(36), nullable=False, unique=True),
        sa.Column('user_id', sa.BigInteger(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('payload', sa.Text(), nullable=True),
        sa.Column('fcm_token', sa.Text(), nullable=True),
        sa.Column('topic', sa.String(255), nullable=True),
        sa.Column('target_type', sa.String(20), nullable=False, server_default='token'),
        sa.Column('delivery_status', sa.String(20), nullable=False, server_default='sent'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('sent_by', sa.BigInteger(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.BigInteger(), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
    )
    op.create_index('ix_notification_logs_user_id', 'notification_logs', ['user_id'])

    # ── 4. video_contents ──────────────────────────────────────
    op.create_table(
        'video_contents',
        sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('uuid', sa.String(36), nullable=False, unique=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('standard', sa.String(20), nullable=False),
        sa.Column('division', sa.String(10), nullable=True),
        sa.Column('subject', sa.String(100), nullable=False),
        sa.Column('topic', sa.String(200), nullable=True),
        sa.Column('file_path', sa.String(500), nullable=True),
        sa.Column('video_url', sa.String(1000), nullable=True),
        sa.Column('file_size_bytes', sa.Integer(), nullable=True),
        sa.Column('mime_type', sa.String(100), nullable=True),
        sa.Column('duration', sa.String(20), nullable=True),
        sa.Column('teacher_id', sa.BigInteger(), sa.ForeignKey('teachers.id', ondelete='SET NULL'), nullable=True),
        sa.Column('uploaded_by', sa.BigInteger(), nullable=True),
        sa.Column('is_published', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.BigInteger(), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
    )
    op.create_index('ix_video_contents_standard', 'video_contents', ['standard'])
    op.create_index('ix_video_contents_teacher_id', 'video_contents', ['teacher_id'])

    # ── 5. transport_routes ────────────────────────────────────
    op.create_table(
        'transport_routes',
        sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('uuid', sa.String(36), nullable=False, unique=True),
        sa.Column('name', sa.String(200), nullable=False, unique=True),
        sa.Column('route_code', sa.String(30), nullable=False, unique=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('start_point', sa.String(200), nullable=False),
        sa.Column('end_point', sa.String(200), nullable=False),
        sa.Column('total_distance_km', sa.Numeric(6, 2), nullable=True),
        sa.Column('morning_start_time', sa.String(10), nullable=True),
        sa.Column('afternoon_start_time', sa.String(10), nullable=True),
        sa.Column('academic_year', sa.String(10), nullable=True),
        sa.Column('monthly_fee', sa.Numeric(8, 2), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.BigInteger(), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
    )
    op.create_index('ix_transport_routes_name', 'transport_routes', ['name'])

    # ── 6. transport_vehicles ──────────────────────────────────
    op.create_table(
        'transport_vehicles',
        sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('uuid', sa.String(36), nullable=False, unique=True),
        sa.Column('vehicle_number', sa.String(30), nullable=False, unique=True),
        sa.Column('vehicle_type', sa.String(30), nullable=False, server_default='bus'),
        sa.Column('capacity', sa.Integer(), nullable=False, server_default='40'),
        sa.Column('model', sa.String(100), nullable=True),
        sa.Column('manufacturer', sa.String(100), nullable=True),
        sa.Column('year_of_manufacture', sa.Integer(), nullable=True),
        sa.Column('fitness_expiry', sa.Date(), nullable=True),
        sa.Column('insurance_expiry', sa.Date(), nullable=True),
        sa.Column('permit_expiry', sa.Date(), nullable=True),
        sa.Column('driver_name', sa.String(200), nullable=True),
        sa.Column('driver_mobile', sa.String(15), nullable=True),
        sa.Column('driver_license', sa.String(50), nullable=True),
        sa.Column('attendant_name', sa.String(200), nullable=True),
        sa.Column('attendant_mobile', sa.String(15), nullable=True),
        sa.Column('assigned_route_id', sa.BigInteger(), sa.ForeignKey('transport_routes.id', ondelete='SET NULL'), nullable=True),
        sa.Column('fuel_type', sa.String(20), nullable=True),
        sa.Column('gps_device_id', sa.String(100), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='active'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.BigInteger(), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
    )
    op.create_index('ix_transport_vehicles_vehicle_number', 'transport_vehicles', ['vehicle_number'])

    # ── 7. transport_stops ─────────────────────────────────────
    op.create_table(
        'transport_stops',
        sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('uuid', sa.String(36), nullable=False, unique=True),
        sa.Column('route_id', sa.BigInteger(), sa.ForeignKey('transport_routes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('stop_name', sa.String(200), nullable=False),
        sa.Column('stop_name_marathi', sa.String(200), nullable=True),
        sa.Column('stop_order', sa.Integer(), nullable=False),
        sa.Column('morning_pickup_time', sa.String(10), nullable=True),
        sa.Column('afternoon_drop_time', sa.String(10), nullable=True),
        sa.Column('landmark', sa.String(300), nullable=True),
        sa.Column('latitude', sa.Numeric(10, 7), nullable=True),
        sa.Column('longitude', sa.Numeric(10, 7), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.BigInteger(), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.UniqueConstraint('route_id', 'stop_order', name='uq_route_stop_order'),
    )
    op.create_index('ix_transport_stops_route_id', 'transport_stops', ['route_id'])

    # ── 8. student_transport ───────────────────────────────────
    op.create_table(
        'student_transport',
        sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('uuid', sa.String(36), nullable=False, unique=True),
        sa.Column('student_id', sa.BigInteger(), sa.ForeignKey('students.id', ondelete='CASCADE'), nullable=False),
        sa.Column('route_id', sa.BigInteger(), sa.ForeignKey('transport_routes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('stop_id', sa.BigInteger(), sa.ForeignKey('transport_stops.id', ondelete='SET NULL'), nullable=True),
        sa.Column('academic_year', sa.String(10), nullable=False),
        sa.Column('direction', sa.String(10), nullable=False, server_default='both'),
        sa.Column('fee_monthly', sa.Numeric(8, 2), nullable=True),
        sa.Column('from_date', sa.Date(), nullable=True),
        sa.Column('to_date', sa.Date(), nullable=True),
        sa.Column('remarks', sa.String(300), nullable=True),
        sa.Column('assigned_by', sa.BigInteger(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.BigInteger(), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.UniqueConstraint('student_id', 'academic_year', name='uq_student_transport_year'),
    )
    op.create_index('ix_student_transport_student_id', 'student_transport', ['student_id'])

    # ── 9. student_leaves ──────────────────────────────────────
    op.create_table(
        'student_leaves',
        sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('uuid', sa.String(36), nullable=False, unique=True),
        sa.Column('student_id', sa.BigInteger(), sa.ForeignKey('students.id', ondelete='CASCADE'), nullable=False),
        sa.Column('leave_type', sa.String(50), nullable=False, server_default='casual'),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('total_days', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('rejection_reason', sa.String(500), nullable=True),
        sa.Column('actioned_by', sa.BigInteger(), nullable=True),
        sa.Column('actioned_at', sa.Date(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.BigInteger(), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
    )
    op.create_index('ix_student_leaves_student_id', 'student_leaves', ['student_id'])
    op.create_index('ix_student_leaves_status', 'student_leaves', ['status'])

    # ── 10. subjects ───────────────────────────────────────────
    op.create_table(
        'subjects',
        sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('uuid', sa.String(36), nullable=False, unique=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('name_marathi', sa.String(200), nullable=True),
        sa.Column('code', sa.String(20), nullable=True, unique=True),
        sa.Column('subject_type', sa.String(30), nullable=False, server_default='theory'),
        sa.Column('applicable_standards', sa.String(100), nullable=True),
        sa.Column('color', sa.String(10), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.BigInteger(), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
    )
    op.create_index('ix_subjects_name', 'subjects', ['name'])

    # ── 11. period_configs ─────────────────────────────────────
    op.create_table(
        'period_configs',
        sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('uuid', sa.String(36), nullable=False, unique=True),
        sa.Column('academic_year_id', sa.BigInteger(), nullable=False),
        sa.Column('period_number', sa.Integer(), nullable=False),
        sa.Column('period_name', sa.String(50), nullable=False),
        sa.Column('start_time', sa.String(10), nullable=False),
        sa.Column('end_time', sa.String(10), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), nullable=False, server_default='45'),
        sa.Column('period_type', sa.String(20), nullable=False, server_default='class'),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.BigInteger(), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.UniqueConstraint('period_number', 'academic_year_id', name='uq_period_config'),
    )

    # ── 12. timetable_entries ──────────────────────────────────
    op.create_table(
        'timetable_entries',
        sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('uuid', sa.String(36), nullable=False, unique=True),
        sa.Column('academic_year_id', sa.BigInteger(), nullable=False),
        sa.Column('standard', sa.String(10), nullable=False),
        sa.Column('division', sa.String(5), nullable=True),
        sa.Column('day_of_week', sa.Integer(), nullable=False),
        sa.Column('period_id', sa.BigInteger(), sa.ForeignKey('period_configs.id', ondelete='CASCADE'), nullable=False),
        sa.Column('subject_id', sa.BigInteger(), sa.ForeignKey('subjects.id', ondelete='SET NULL'), nullable=True),
        sa.Column('teacher_id', sa.BigInteger(), sa.ForeignKey('teachers.id', ondelete='SET NULL'), nullable=True),
        sa.Column('room', sa.String(50), nullable=True),
        sa.Column('notes', sa.String(300), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.BigInteger(), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.UniqueConstraint(
            'standard', 'division', 'day_of_week', 'period_id', 'academic_year_id',
            name='uq_timetable_entry'
        ),
    )
    op.create_index('ix_timetable_entries_academic_year', 'timetable_entries', ['academic_year_id'])
    op.create_index('ix_timetable_entries_standard', 'timetable_entries', ['standard'])

    # ── 13. teacher_subject_assignments ────────────────────────
    op.create_table(
        'teacher_subject_assignments',
        sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('uuid', sa.String(36), nullable=False, unique=True),
        sa.Column('teacher_id', sa.BigInteger(), sa.ForeignKey('teachers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('subject_id', sa.BigInteger(), sa.ForeignKey('subjects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('standard', sa.String(10), nullable=False),
        sa.Column('division', sa.String(5), nullable=True),
        sa.Column('academic_year_id', sa.BigInteger(), nullable=False),
        sa.Column('periods_per_week', sa.Integer(), nullable=False, server_default='5'),
        sa.Column('is_class_teacher', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.BigInteger(), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.UniqueConstraint(
            'teacher_id', 'subject_id', 'standard', 'division', 'academic_year_id',
            name='uq_teacher_subject'
        ),
    )
    op.create_index('ix_teacher_subject_assignments_teacher_id', 'teacher_subject_assignments', ['teacher_id'])
    op.create_index('ix_teacher_subject_assignments_subject_id', 'teacher_subject_assignments', ['subject_id'])

    # ── 14. substitute_entries ─────────────────────────────────
    op.create_table(
        'substitute_entries',
        sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('uuid', sa.String(36), nullable=False, unique=True),
        sa.Column('timetable_entry_id', sa.BigInteger(), sa.ForeignKey('timetable_entries.id', ondelete='CASCADE'), nullable=False),
        sa.Column('substitute_date', sa.String(10), nullable=False),
        sa.Column('substitute_teacher_id', sa.BigInteger(), sa.ForeignKey('teachers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('reason', sa.String(300), nullable=True),
        sa.Column('marked_by', sa.BigInteger(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.BigInteger(), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
    )
    op.create_index('ix_substitute_entries_timetable_entry_id', 'substitute_entries', ['timetable_entry_id'])

    # ── 15. communication_logs ─────────────────────────────────
    op.create_table(
        'communication_logs',
        sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('uuid', sa.String(36), nullable=False, unique=True),
        sa.Column('channel', sa.String(20), nullable=False),
        sa.Column('recipient_type', sa.String(30), nullable=False),
        sa.Column('recipient_id', sa.BigInteger(), nullable=True),
        sa.Column('recipient_phone', sa.String(20), nullable=True),
        sa.Column('recipient_email', sa.String(200), nullable=True),
        sa.Column('subject', sa.String(300), nullable=True),
        sa.Column('message_body', sa.Text(), nullable=False),
        sa.Column('template_id', sa.BigInteger(), nullable=True),
        sa.Column('notice_id', sa.BigInteger(), nullable=True),
        sa.Column('recipient_name', sa.String(255), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('sent_by', sa.BigInteger(), nullable=True),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('external_msg_id', sa.String(200), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.BigInteger(), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
    )

    # ── 16. announcements ──────────────────────────────────────
    op.create_table(
        'announcements',
        sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('uuid', sa.String(36), nullable=False, unique=True),
        sa.Column('title', sa.String(300), nullable=False),
        sa.Column('body', sa.Text(), nullable=True),
        sa.Column('announcement_type', sa.String(30), nullable=False, server_default='info'),
        sa.Column('target_roles', sa.String(200), nullable=False, server_default='all'),
        sa.Column('is_pinned', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('expiry_date', sa.Date(), nullable=True),
        sa.Column('academic_year_id', sa.BigInteger(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.BigInteger(), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
    )

    # ── 17. notifications ──────────────────────────────────────
    op.create_table(
        'notifications',
        sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('uuid', sa.String(36), nullable=False, unique=True),
        sa.Column('sender_id', sa.BigInteger(), nullable=True),
        sa.Column('sender_role', sa.String(50), nullable=True),
        sa.Column('recipient_id', sa.BigInteger(), nullable=True),
        sa.Column('recipient_role', sa.String(50), nullable=True),
        sa.Column('category', sa.String(50), nullable=False),
        sa.Column('notification_type', sa.String(100), nullable=False),
        sa.Column('priority', sa.String(20), nullable=False, server_default='medium'),
        sa.Column('title', sa.String(300), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('reference_module', sa.String(50), nullable=True),
        sa.Column('reference_id', sa.String(100), nullable=True),
        sa.Column('action_url', sa.String(500), nullable=True),
        sa.Column('channel', sa.String(20), nullable=False, server_default='both'),
        sa.Column('fcm_message_id', sa.String(200), nullable=True),
        sa.Column('delivered_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('seen_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('clicked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.BigInteger(), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
    )
    op.create_index('ix_notifications_sender_id', 'notifications', ['sender_id'])
    op.create_index('ix_notifications_recipient_id', 'notifications', ['recipient_id'])
    op.create_index('ix_notifications_recipient_role', 'notifications', ['recipient_role'])
    op.create_index('ix_notifications_category', 'notifications', ['category'])
    op.create_index('ix_notifications_priority', 'notifications', ['priority'])

    # ── 18. bonafide_applications ──────────────────────────────
    op.create_table(
        'bonafide_applications',
        sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('uuid', sa.String(36), nullable=False, unique=True),
        sa.Column('application_number', sa.String(50), nullable=False, unique=True),
        sa.Column('student_id', sa.BigInteger(), sa.ForeignKey('students.id', ondelete='CASCADE'), nullable=False),
        sa.Column('purpose', sa.String(255), nullable=False),
        sa.Column('fee_amount', sa.Numeric(10, 2), nullable=False, server_default='20.0'),
        sa.Column('payment_status', sa.String(20), nullable=False, server_default='PAID'),
        sa.Column('payment_reference', sa.String(100), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='PENDING'),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('applied_date', sa.Date(), nullable=False, server_default=sa.text('CURRENT_DATE')),
        sa.Column('processed_by', sa.BigInteger(), nullable=True),
        sa.Column('processed_date', sa.Date(), nullable=True),
        sa.Column('issued_certificate_number', sa.String(100), nullable=True),
        sa.Column('academic_year', sa.String(50), nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.BigInteger(), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
    )
    op.create_index('ix_bonafide_applications_application_number', 'bonafide_applications', ['application_number'])
    op.create_index('ix_bonafide_applications_student_id', 'bonafide_applications', ['student_id'])
    op.create_index('ix_bonafide_applications_status', 'bonafide_applications', ['status'])

    # ── 19. ai_logs ────────────────────────────────────────────
    op.create_table(
        'ai_logs',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('uuid', sa.String(36), nullable=False, unique=True),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('feature', sa.String(50), nullable=False),
        sa.Column('prompt', sa.Text(), nullable=False),
        sa.Column('response', sa.Text(), nullable=True),
        sa.Column('model_used', sa.String(100), nullable=True),
        sa.Column('tokens_used', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('status', sa.String(20), nullable=False, server_default='success'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
    )
    op.create_index('ix_ai_logs_user_id', 'ai_logs', ['user_id'])
    op.create_index('ix_ai_logs_feature', 'ai_logs', ['feature'])

    # ── 20. qr_code_records ────────────────────────────────────
    op.create_table(
        'qr_code_records',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('uuid', sa.String(36), nullable=False, unique=True),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('reference_id', sa.Integer(), nullable=False),
        sa.Column('reference_code', sa.String(100), nullable=False),
        sa.Column('label', sa.String(200), nullable=False),
        sa.Column('sub_label', sa.String(200), nullable=True),
        sa.Column('qr_data', sa.Text(), nullable=False),
        sa.Column('qr_image_url', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
    )
    op.create_index('ix_qr_code_records_uuid', 'qr_code_records', ['uuid'])
    op.create_index('ix_qr_code_records_type', 'qr_code_records', ['type'])
    op.create_index('ix_qr_code_records_reference_id', 'qr_code_records', ['reference_id'])
    op.create_index('ix_qr_code_records_reference_code', 'qr_code_records', ['reference_code'])

    # ── 21. qr_scan_logs ───────────────────────────────────────
    op.create_table(
        'qr_scan_logs',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('uuid', sa.String(36), nullable=False, unique=True),
        sa.Column('qr_record_id', sa.Integer(), sa.ForeignKey('qr_code_records.id', ondelete='SET NULL'), nullable=True),
        sa.Column('scanned_by', sa.Integer(), nullable=True),
        sa.Column('qr_data', sa.Text(), nullable=False),
        sa.Column('scan_type', sa.String(50), nullable=False),
        sa.Column('scan_result', sa.String(50), nullable=False),
        sa.Column('details', sa.Text(), nullable=True),
        sa.Column('scanned_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
    )


def downgrade() -> None:
    op.drop_table('qr_scan_logs')
    op.drop_table('qr_code_records')
    op.drop_table('ai_logs')
    op.drop_table('bonafide_applications')
    op.drop_table('notifications')
    op.drop_table('announcements')
    op.drop_table('communication_logs')
    op.drop_table('substitute_entries')
    op.drop_table('teacher_subject_assignments')
    op.drop_table('timetable_entries')
    op.drop_table('period_configs')
    op.drop_table('subjects')
    op.drop_table('student_leaves')
    op.drop_table('student_transport')
    op.drop_table('transport_stops')
    op.drop_table('transport_vehicles')
    op.drop_table('transport_routes')
    op.drop_table('video_contents')
    op.drop_table('notification_logs')
    op.drop_table('fcm_tokens')
    op.drop_table('student_behaviour_logs')
