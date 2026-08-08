"""
VidyaSetu ERP — Enterprise Email Dispatcher & HTML Templates
============================================================
Handles SMTP email transmission and HTML email template generation for automated ERP events.
"""

import logging
import smtplib
import threading
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from app.core.config import settings

logger = logging.getLogger("app.shared.email")


def _send_email_sync(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: Optional[str] = None,
) -> bool:
    """
    Synchronous helper to send an email via SMTP.
    Returns True if sent successfully, False otherwise.
    """
    if not to_email or "@" not in to_email:
        logger.warning(f"Email dispatch skipped: invalid email address '{to_email}'.")
        return False

    smtp_user = settings.SMTP_USER.strip() if settings.SMTP_USER else ""
    smtp_pass = settings.SMTP_PASSWORD.replace(" ", "").strip() if settings.SMTP_PASSWORD else ""
    from_email = settings.SMTP_FROM_EMAIL.strip() if settings.SMTP_FROM_EMAIL else smtp_user

    # Check if SMTP is configured
    if not smtp_user or not smtp_pass:
        logger.info(
            f"SMTP not configured (SMTP_USER/SMTP_PASSWORD empty). "
            f"Email simulated for '{to_email}' with subject: '{subject}'."
        )
        logger.debug(f"[EMULATED EMAIL TO {to_email}]\nSubject: {subject}\n\n{text_content or 'HTML Content provided'}")
        return True

    try:
        msg = MIMEMultipart("alternative")
        from_name = settings.SMTP_FROM_NAME or "VidyaSetu ERP"
        msg["From"] = f"{from_name} <{from_email}>"
        msg["To"] = to_email
        msg["Subject"] = subject

        if text_content:
            msg.attach(MIMEText(text_content, "plain", "utf-8"))
        msg.attach(MIMEText(html_content, "html", "utf-8"))

        if settings.SMTP_TLS:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=12)
            server.starttls()
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=12)

        server.login(smtp_user, smtp_pass)
        server.sendmail(from_email, [to_email], msg.as_string())
        server.quit()

        logger.info(f"Email successfully sent to {to_email} (Subject: '{subject}')")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}", exc_info=True)
        return False


def send_email_async(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: Optional[str] = None,
):
    """
    Fire-and-forget email transmission in a daemon thread so API response is not blocked.
    """
    thread = threading.Thread(
        target=_send_email_sync,
        args=(to_email, subject, html_content, text_content),
        daemon=True,
    )
    thread.start()


def build_admission_credentials_email(
    student_name: str,
    gr_number: str,
    username: str,
    password: str,
    standard: str,
    division: Optional[str] = None,
    academic_year: str = "2025-2026",
    login_url: str = None,
) -> tuple[str, str]:
    """
    Generates a high-quality HTML email template and plain text version
    for new student admission login credentials.

    Returns: (html_content, plain_text_content)
    """
    school_name = settings.SCHOOL_NAME or "VidyaSetu Academy"
    portal_url = login_url or f"{settings.FRONTEND_URL}/login"
    class_str = f"Std {standard}" + (f" - Division {division}" if division else "")

    # Plain text version fallback
    plain_text = f"""
Dear {student_name},

Welcome to {school_name}!

Your admission has been successfully processed. Here are your student portal login credentials:

---------------------------------------------------
User ID / Username : {username}
Temporary Password : {password}
GR Number          : {gr_number}
Class / Division   : {class_str}
Academic Year      : {academic_year}
---------------------------------------------------

Portal Login Link: {portal_url}

For security purposes, please log in to your account and change your password as soon as possible.

Best Regards,
Admissions Office
{school_name}
    """.strip()

    # Premium HTML Email Template
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to {school_name} — Admission Confirmed</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%); padding: 36px 32px; text-align: center;">
              <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.18); border-radius: 50%; padding: 14px; margin-bottom: 12px; backdrop-filter: blur(4px);">
                <span style="font-size: 32px;">🎓</span>
              </div>
              <h1 style="color: #ffffff; margin: 0 0 6px 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">{school_name}</h1>
              <p style="color: #e0e7ff; margin: 0; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">VidyaSetu ERP — Student Admission Confirmed</p>
            </td>
          </tr>

          <!-- Welcome Banner Accent -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; border-bottom: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 16px; font-weight: 600; color: #0f172a;">
                Welcome aboard, <span style="color: #2563eb;">{student_name}</span>! 🎉
              </p>
              <p style="margin: 6px 0 0 0; font-size: 14px; color: #64748b; line-height: 1.5;">
                We are delighted to confirm your admission for the <strong>{academic_year}</strong> academic session. Your student profile and portal access have been initialized.
              </p>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px;">

              <!-- Credentials Box -->
              <div style="background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%); border: 2px dashed #3b82f6; border-radius: 12px; padding: 24px; margin-bottom: 28px;">
                <div style="text-align: center; margin-bottom: 16px;">
                  <span style="background-color: #2563eb; color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.8px;">
                    🔑 Official Login Credentials
                  </span>
                </div>
                
                <table width="100%" cellspacing="0" cellpadding="0" style="margin-top: 10px;">
                  <tr>
                    <td width="40%" style="padding: 8px 0; font-size: 13px; color: #475569; font-weight: 600; text-transform: uppercase;">
                      User ID / Username:
                    </td>
                    <td width="60%" style="padding: 8px 0; font-size: 16px; font-family: monospace; font-weight: 700; color: #1e293b; background: #ffffff; padding-left: 12px; border-radius: 6px; border: 1px solid #cbd5e1;">
                      {username}
                    </td>
                  </tr>
                  <tr>
                    <td width="40%" style="padding: 10px 0 8px 0; font-size: 13px; color: #475569; font-weight: 600; text-transform: uppercase;">
                      Initial Password:
                    </td>
                    <td width="60%" style="padding: 10px 0 8px 0; font-size: 16px; font-family: monospace; font-weight: 700; color: #2563eb; background: #ffffff; padding-left: 12px; border-radius: 6px; border: 1px solid #cbd5e1;">
                      {password}
                    </td>
                  </tr>
                  <tr>
                    <td width="40%" style="padding: 8px 0; font-size: 13px; color: #475569; font-weight: 600; text-transform: uppercase;">
                      GR Number:
                    </td>
                    <td width="60%" style="padding: 8px 0; font-size: 14px; font-family: monospace; font-weight: 600; color: #0f172a; padding-left: 12px;">
                      {gr_number}
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Admission Summary Card -->
              <h3 style="margin: 0 0 14px 0; font-size: 15px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
                📋 Student Details Summary
              </h3>
              
              <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px; font-size: 14px;">
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Full Name:</td>
                  <td style="padding: 8px 0; color: #0f172a; font-weight: 600; text-align: right;">{student_name}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Class / Standard:</td>
                  <td style="padding: 8px 0; color: #0f172a; font-weight: 600; text-align: right;">{class_str}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Academic Year:</td>
                  <td style="padding: 8px 0; color: #0f172a; font-weight: 600; text-align: right;">{academic_year}</td>
                </tr>
              </table>

              <!-- Call To Action Button -->
              <div style="text-align: center; margin: 32px 0 24px 0;">
                <a href="{portal_url}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 700; padding: 14px 36px; border-radius: 10px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); transition: all 0.3s ease;">
                  🚀 Log In to Student Portal
                </a>
              </div>

              <!-- Security Instructions -->
              <div style="background-color: #fffbebf5; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 6px; margin-top: 20px;">
                <p style="margin: 0; font-size: 13px; color: #b45309; line-height: 1.5;">
                  <strong>🛡️ Important Security Notice:</strong><br>
                  For security, please log in using the credentials above and update your password under account settings right away. Never share your password with anyone.
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; padding: 24px 32px; text-align: center; border-top: 1px solid #1e293b;">
              <p style="margin: 0 0 6px 0; font-size: 14px; font-weight: 600; color: #f8fafc;">{school_name}</p>
              <p style="margin: 0 0 12px 0; font-size: 12px; color: #94a3b8;">
                Powered by VidyaSetu ERP — Academic Management Platform
              </p>
              <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.4;">
                This is an automated system notification regarding your admission. If you did not request this, please contact the school administration.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    return html_content, plain_text
