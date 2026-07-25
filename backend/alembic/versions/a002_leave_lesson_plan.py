"""Add leave management and lesson plan tables

Revision ID: a002_leave_lesson_plan
Revises: a001_initial_schema
Create Date: 2026-07-24

New tables:
  - leave_types
  - leave_balances
  - leave_applications
  - holiday_calendar
  - lesson_plans
  - teaching_diary
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'a002_leave_lesson_plan'
down_revision = 'a001_initial_schema'
branch_labels = None
depends_on = None


def upgrade() -> None:

    # ── leave_types ───────────────────────────────────────────
    op.create_table(
        'leave_types',
        sa.Column('id',              sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('uuid',            sa.String(36),   nullable=False, unique=True),
        sa.Column('name',            sa.String(100),  nullable=False, unique=True),
        sa.Column('name_marathi',    sa.String(100),  nullable=True),
        sa.Column('code',            sa.String(20),   nullable=False, unique=True),
        sa.Column('annual_quota',    sa.Numeric(5, 1), nullable=False, server_default='0'),
        sa.Column('is_paid',         sa.Boolean(),    nullable=False, server_default='true'),
        sa.Column('is_half_day_allowed', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('requires_document',   sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('carry_forward',   sa.Boolean(),    nullable=False, server_default='false'),
        sa.Column('max_carry_forward_days', sa.Numeric(5, 1), nullable=True),
        sa.Column('min_days_notice', sa.Integer(),    nullable=False, server_default='0'),
        sa.Column('description',     sa.String(500),  nullable=True),
        sa.Column('is_active',       sa.Boolean(),    nullable=False, server_default='true'),
        sa.Column('is_deleted',      sa.Boolean(),    nullable=False, server_default='false'),
        sa.Column('created_by',      sa.BigInteger(), nullable=True),
        sa.Column('updated_by',      sa.BigInteger(), nullable=True),
        sa.Column('created_at',      sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at',      sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ── leave_balances ────────────────────────────────────────
    op.create_table(
        'leave_balances',
        sa.Column('id',                  sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('uuid',                sa.String(36),   nullable=False, unique=True),
        sa.Column('employee_id',         sa.BigInteger(), nullable=False),
        sa.Column('leave_type_id',       sa.BigInteger(), sa.ForeignKey('leave_types.id'), nullable=False),
        sa.Column('academic_year',       sa.String(10),   nullable=False),
        sa.Column('entitled_days',       sa.Numeric(6, 1), nullable=False, server_default='0'),
        sa.Column('used_days',           sa.Numeric(6, 1), nullable=False, server_default='0'),
        sa.Column('pending_days',        sa.Numeric(6, 1), nullable=False, server_default='0'),
        sa.Column('carry_forward_days',  sa.Numeric(6, 1), nullable=False, server_default='0'),
        sa.Column('is_active',           sa.Boolean(),    nullable=False, server_default='true'),
        sa.Column('is_deleted',          sa.Boolean(),    nullable=False, server_default='false'),
        sa.Column('created_by',          sa.BigInteger(), nullable=True),
        sa.Column('updated_by',          sa.BigInteger(), nullable=True),
        sa.Column('created_at',          sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at',          sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('employee_id', 'leave_type_id', 'academic_year', name='uq_leave_balance'),
    )
    op.create_index('ix_leave_balances_employee_id', 'leave_balances', ['employee_id'])

    # ── leave_applications ────────────────────────────────────
    op.create_table(
        'leave_applications',
        sa.Column('id',                      sa.BigInteger(),  primary_key=True, autoincrement=True),
        sa.Column('uuid',                    sa.String(36),    nullable=False, unique=True),
        sa.Column('application_number',      sa.String(30),    nullable=False, unique=True),
        sa.Column('employee_id',             sa.BigInteger(),  nullable=False),
        sa.Column('employee_name',           sa.String(300),   nullable=False),
        sa.Column('employee_code',           sa.String(30),    nullable=True),
        sa.Column('leave_type_id',           sa.BigInteger(),  sa.ForeignKey('leave_types.id'), nullable=False),
        sa.Column('academic_year',           sa.String(10),    nullable=False),
        sa.Column('from_date',               sa.Date(),        nullable=False),
        sa.Column('to_date',                 sa.Date(),        nullable=False),
        sa.Column('total_days',              sa.Numeric(5, 1), nullable=False),
        sa.Column('is_half_day',             sa.Boolean(),     nullable=False, server_default='false'),
        sa.Column('half_day_session',        sa.String(10),    nullable=True),
        sa.Column('reason',                  sa.Text(),        nullable=False),
        sa.Column('document_path',           sa.String(500),   nullable=True),
        sa.Column('status',                  sa.String(20),    nullable=False, server_default='pending'),
        sa.Column('approved_by',             sa.BigInteger(),  nullable=True),
        sa.Column('approved_on',             sa.Date(),        nullable=True),
        sa.Column('rejection_reason',        sa.String(500),   nullable=True),
        sa.Column('substitute_teacher_id',   sa.BigInteger(),  nullable=True),
        sa.Column('substitute_accepted',     sa.Boolean(),     nullable=True),
        sa.Column('is_active',               sa.Boolean(),     nullable=False, server_default='true'),
        sa.Column('is_deleted',              sa.Boolean(),     nullable=False, server_default='false'),
        sa.Column('created_by',              sa.BigInteger(),  nullable=True),
        sa.Column('updated_by',              sa.BigInteger(),  nullable=True),
        sa.Column('created_at',              sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at',              sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_leave_applications_employee_id',   'leave_applications', ['employee_id'])
    op.create_index('ix_leave_applications_app_number',    'leave_applications', ['application_number'])
    op.create_index('ix_leave_applications_status',        'leave_applications', ['status'])

    # ── holiday_calendar ──────────────────────────────────────
    op.create_table(
        'holiday_calendar',
        sa.Column('id',            sa.BigInteger(),  primary_key=True, autoincrement=True),
        sa.Column('uuid',          sa.String(36),    nullable=False, unique=True),
        sa.Column('holiday_date',  sa.Date(),        nullable=False),
        sa.Column('name',          sa.String(200),   nullable=False),
        sa.Column('name_marathi',  sa.String(200),   nullable=True),
        sa.Column('academic_year', sa.String(10),    nullable=False),
        sa.Column('holiday_type',  sa.String(30),    nullable=False, server_default='national'),
        sa.Column('is_optional',   sa.Boolean(),     nullable=False, server_default='false'),
        sa.Column('description',   sa.String(300),   nullable=True),
        sa.Column('is_active',     sa.Boolean(),     nullable=False, server_default='true'),
        sa.Column('is_deleted',    sa.Boolean(),     nullable=False, server_default='false'),
        sa.Column('created_by',    sa.BigInteger(),  nullable=True),
        sa.Column('updated_by',    sa.BigInteger(),  nullable=True),
        sa.Column('created_at',    sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at',    sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('holiday_date', 'academic_year', name='uq_holiday'),
    )
    op.create_index('ix_holiday_calendar_date',    'holiday_calendar', ['holiday_date'])
    op.create_index('ix_holiday_calendar_year',    'holiday_calendar', ['academic_year'])

    # ── lesson_plans ──────────────────────────────────────────
    op.create_table(
        'lesson_plans',
        sa.Column('id',                    sa.BigInteger(),  primary_key=True, autoincrement=True),
        sa.Column('uuid',                  sa.String(36),    nullable=False, unique=True),
        sa.Column('teacher_id',            sa.BigInteger(),  nullable=False),
        sa.Column('teacher_name',          sa.String(300),   nullable=False),
        sa.Column('standard',              sa.String(10),    nullable=False),
        sa.Column('division',              sa.String(5),     nullable=False),
        sa.Column('subject_name',          sa.String(150),   nullable=False),
        sa.Column('subject_name_marathi',  sa.String(150),   nullable=True),
        sa.Column('academic_year',         sa.String(10),    nullable=False),
        sa.Column('month',                 sa.Integer(),     nullable=False),
        sa.Column('chapter_name',          sa.String(300),   nullable=False),
        sa.Column('chapter_name_marathi',  sa.String(300),   nullable=True),
        sa.Column('topics_planned',        sa.Text(),        nullable=False),
        sa.Column('learning_objectives',   sa.Text(),        nullable=True),
        sa.Column('teaching_methods',      sa.String(500),   nullable=True),
        sa.Column('resources_required',    sa.String(500),   nullable=True),
        sa.Column('planned_periods',       sa.Integer(),     nullable=False, server_default='0'),
        sa.Column('completed_periods',     sa.Integer(),     nullable=False, server_default='0'),
        sa.Column('formative_assessment',  sa.String(300),   nullable=True),
        sa.Column('summative_assessment',  sa.String(300),   nullable=True),
        sa.Column('status',                sa.String(20),    nullable=False, server_default='draft'),
        sa.Column('submitted_on',          sa.Date(),        nullable=True),
        sa.Column('approved_by',           sa.BigInteger(),  nullable=True),
        sa.Column('approved_on',           sa.Date(),        nullable=True),
        sa.Column('revision_remarks',      sa.String(500),   nullable=True),
        sa.Column('remarks',               sa.Text(),        nullable=True),
        sa.Column('is_active',             sa.Boolean(),     nullable=False, server_default='true'),
        sa.Column('is_deleted',            sa.Boolean(),     nullable=False, server_default='false'),
        sa.Column('created_by',            sa.BigInteger(),  nullable=True),
        sa.Column('updated_by',            sa.BigInteger(),  nullable=True),
        sa.Column('created_at',            sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at',            sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint(
            'teacher_id', 'standard', 'division', 'subject_name', 'academic_year', 'month',
            name='uq_lesson_plan'
        ),
    )
    op.create_index('ix_lesson_plans_teacher_id',    'lesson_plans', ['teacher_id'])
    op.create_index('ix_lesson_plans_academic_year', 'lesson_plans', ['academic_year'])

    # ── teaching_diary ────────────────────────────────────────
    op.create_table(
        'teaching_diary',
        sa.Column('id',                    sa.BigInteger(),  primary_key=True, autoincrement=True),
        sa.Column('uuid',                  sa.String(36),    nullable=False, unique=True),
        sa.Column('lesson_plan_id',        sa.BigInteger(),  sa.ForeignKey('lesson_plans.id'), nullable=True),
        sa.Column('teacher_id',            sa.BigInteger(),  nullable=False),
        sa.Column('teacher_name',          sa.String(300),   nullable=False),
        sa.Column('standard',              sa.String(10),    nullable=False),
        sa.Column('division',              sa.String(5),     nullable=False),
        sa.Column('subject_name',          sa.String(150),   nullable=False),
        sa.Column('academic_year',         sa.String(10),    nullable=False),
        sa.Column('diary_date',            sa.Date(),        nullable=False),
        sa.Column('period_number',         sa.Integer(),     nullable=True),
        sa.Column('topic_covered',         sa.String(500),   nullable=False),
        sa.Column('sub_topics',            sa.Text(),        nullable=True),
        sa.Column('teaching_method_used',  sa.String(200),   nullable=True),
        sa.Column('students_present',      sa.Integer(),     nullable=True),
        sa.Column('class_participation',   sa.String(20),    nullable=True),
        sa.Column('homework_given',        sa.Boolean(),     nullable=False, server_default='false'),
        sa.Column('homework_description',  sa.String(500),   nullable=True),
        sa.Column('homework_due_date',     sa.Date(),        nullable=True),
        sa.Column('difficulties_observed', sa.Text(),        nullable=True),
        sa.Column('remedial_needed',       sa.Boolean(),     nullable=False, server_default='false'),
        sa.Column('remedial_students',     sa.String(500),   nullable=True),
        sa.Column('remarks',               sa.Text(),        nullable=True),
        sa.Column('is_active',             sa.Boolean(),     nullable=False, server_default='true'),
        sa.Column('is_deleted',            sa.Boolean(),     nullable=False, server_default='false'),
        sa.Column('created_by',            sa.BigInteger(),  nullable=True),
        sa.Column('updated_by',            sa.BigInteger(),  nullable=True),
        sa.Column('created_at',            sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at',            sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint(
            'teacher_id', 'standard', 'division', 'subject_name', 'diary_date',
            name='uq_teaching_diary'
        ),
    )
    op.create_index('ix_teaching_diary_teacher_id',  'teaching_diary', ['teacher_id'])
    op.create_index('ix_teaching_diary_diary_date',  'teaching_diary', ['diary_date'])
    op.create_index('ix_teaching_diary_lesson_plan', 'teaching_diary', ['lesson_plan_id'])


def downgrade() -> None:
    # Drop in reverse order (child tables first)
    op.drop_table('teaching_diary')
    op.drop_table('lesson_plans')
    op.drop_table('holiday_calendar')
    op.drop_table('leave_applications')
    op.drop_table('leave_balances')
    op.drop_table('leave_types')
