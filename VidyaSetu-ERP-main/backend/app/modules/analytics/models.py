"""
VidyaSetu ERP — Analytics Module Models
=========================================
Analytics does not maintain its own database tables.
It reads and aggregates data from all other modules:
  - auth (users, roles)
  - student (students, admissions)
  - teacher (teachers, attendance)
  - attendance (daily records)
  - finance (fees, receipts, expenses)
  - exam (marks, results)
  - library (issues, returns, fines)
  - inventory (stock, assets)
  - office (visitors, complaints, transport)
  - communication (notifications, announcements)

All analytics are computed via JOIN queries in analytics/service.py.
No separate tables required for current implementation.

Future Ready:
  - Materialized views for heavy aggregations
  - Redis cache layer for dashboard KPIs
  - Pre-computed daily/weekly/monthly snapshots
"""
# No SQLAlchemy models defined here intentionally.
# Analytics is a read-only aggregation module.
