"""
VidyaSetu ERP — Device Security Email Templates
=================================================
Beautiful, security-focused HTML email templates for:
  - New device login verification (Yes/No buttons)
  - Verification success confirmation
  - Suspicious login alert
"""
from datetime import datetime
from typing import Optional

from app.core.config import settings


def build_device_verification_email(
    user_name: str,
    device_type: Optional[str],
    browser_or_app: Optional[str],
    ip_address: Optional[str],
    approximate_location: Optional[str],
    login_time: datetime,
    approve_url: str,
    reject_url: str,
) -> tuple[str, str]:
    """
    Generate the new-device login verification email.
    Returns: (html_content, plain_text_content)
    
    Security notes:
    - Never expose internal IDs, database IDs, or token hashes
    - The approve/reject URLs contain the signed random token only
    - Short, descriptive subject line
    """
    school_name = settings.SCHOOL_NAME or "VidyaSetu School"
    time_str = login_time.strftime("%d %b %Y, %I:%M %p UTC")
    device_label = (device_type or "Unknown Device").title()
    browser_label = browser_or_app or "Unknown Browser/App"
    location_label = approximate_location or "Location unavailable"
    ip_label = ip_address or "Unknown"

    plain_text = f"""
{school_name} — New Login Verification

Hello {user_name},

A login to your account was attempted from a new device. Please verify if this was you.

Device     : {device_label}
Browser/App: {browser_label}
Location   : {location_label}
IP Address : {ip_label}
Time       : {time_str}

If this was you:
  {approve_url}

If this was NOT you:
  {reject_url}

This verification link expires in 30 minutes. If you did not attempt to login, click the second link immediately to block this login.

— VidyaSetu Security Team
{school_name}
    """.strip()

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Login Verification — {school_name}</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#0f1117;color:#e2e8f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
         style="background:#0f1117;padding:32px 16px;">
    <tr><td align="center">

      <!-- Card -->
      <table role="presentation" width="580" cellspacing="0" cellpadding="0"
             style="background:#1a1d2e;border-radius:16px;overflow:hidden;
                    border:1px solid #2d3155;box-shadow:0 20px 60px rgba(0,0,0,0.5);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e3a8a 0%,#3730a3 50%,#4f46e5 100%);
                     padding:36px 32px;text-align:center;">
            <div style="display:inline-block;background:rgba(255,255,255,0.12);
                        border-radius:50%;padding:14px;margin-bottom:14px;">
              <span style="font-size:32px;">🔐</span>
            </div>
            <h1 style="margin:0 0 6px;color:#fff;font-size:22px;font-weight:700;
                       letter-spacing:-0.3px;">{school_name}</h1>
            <p style="margin:0;color:#c7d2fe;font-size:13px;font-weight:500;
                      text-transform:uppercase;letter-spacing:1px;">
              Security Alert — New Device Login Detected
            </p>
          </td>
        </tr>

        <!-- Alert Banner -->
        <tr>
          <td style="background:#1e2035;padding:20px 32px;border-bottom:1px solid #2d3155;">
            <p style="margin:0;font-size:15px;font-weight:600;color:#f8fafc;">
              Hello, <span style="color:#818cf8;">{user_name}</span> 👋
            </p>
            <p style="margin:8px 0 0;font-size:14px;color:#94a3b8;line-height:1.6;">
              We detected a login attempt to your VidyaSetu ERP account from a
              <strong style="color:#f8fafc;">new device</strong> that we haven't seen before.
              Please confirm whether this was you.
            </p>
          </td>
        </tr>

        <!-- Login Details -->
        <tr>
          <td style="padding:28px 32px;">
            <h3 style="margin:0 0 16px;font-size:13px;font-weight:700;color:#64748b;
                       text-transform:uppercase;letter-spacing:1px;">
              Login Details
            </h3>
            <table width="100%" cellspacing="0" cellpadding="0"
                   style="background:#12152a;border-radius:10px;border:1px solid #2d3155;
                          overflow:hidden;font-size:14px;">
              <tr>
                <td style="padding:14px 18px;color:#64748b;font-weight:500;width:40%;
                            border-bottom:1px solid #2d3155;">📱 Device</td>
                <td style="padding:14px 18px;color:#e2e8f0;font-weight:600;
                            border-bottom:1px solid #2d3155;">{device_label}</td>
              </tr>
              <tr>
                <td style="padding:14px 18px;color:#64748b;font-weight:500;
                            border-bottom:1px solid #2d3155;">🌐 Browser / App</td>
                <td style="padding:14px 18px;color:#e2e8f0;font-weight:600;
                            border-bottom:1px solid #2d3155;">{browser_label}</td>
              </tr>
              <tr>
                <td style="padding:14px 18px;color:#64748b;font-weight:500;
                            border-bottom:1px solid #2d3155;">📍 Location</td>
                <td style="padding:14px 18px;color:#e2e8f0;font-weight:600;
                            border-bottom:1px solid #2d3155;">{location_label}</td>
              </tr>
              <tr>
                <td style="padding:14px 18px;color:#64748b;font-weight:500;
                            border-bottom:1px solid #2d3155;">🌍 IP Address</td>
                <td style="padding:14px 18px;color:#e2e8f0;font-weight:600;
                            border-bottom:1px solid #2d3155;">{ip_label}</td>
              </tr>
              <tr>
                <td style="padding:14px 18px;color:#64748b;font-weight:500;">⏱ Time</td>
                <td style="padding:14px 18px;color:#e2e8f0;font-weight:600;">{time_str}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Action Buttons -->
        <tr>
          <td style="padding:4px 32px 32px;">
            <p style="margin:0 0 20px;font-size:15px;font-weight:600;color:#e2e8f0;text-align:center;">
              Was this you?
            </p>

            <!-- YES Button -->
            <div style="text-align:center;margin-bottom:14px;">
              <a href="{approve_url}" target="_blank"
                 style="display:inline-block;background:linear-gradient(135deg,#059669,#10b981);
                        color:#fff;text-decoration:none;font-size:15px;font-weight:700;
                        padding:15px 40px;border-radius:10px;
                        box-shadow:0 4px 15px rgba(16,185,129,0.35);
                        letter-spacing:0.3px;">
                ✅ &nbsp; Yes, This Is Me — Allow Login
              </a>
            </div>

            <!-- NO Button -->
            <div style="text-align:center;margin-bottom:24px;">
              <a href="{reject_url}" target="_blank"
                 style="display:inline-block;background:linear-gradient(135deg,#dc2626,#ef4444);
                        color:#fff;text-decoration:none;font-size:15px;font-weight:700;
                        padding:15px 40px;border-radius:10px;
                        box-shadow:0 4px 15px rgba(220,38,38,0.35);
                        letter-spacing:0.3px;">
                🚫 &nbsp; No, Block This Login
              </a>
            </div>

            <!-- Expiry Warning -->
            <div style="background:#1e1a0e;border:1px solid #b45309;border-radius:8px;
                        padding:14px 18px;">
              <p style="margin:0;font-size:13px;color:#fcd34d;line-height:1.5;">
                ⏰ <strong>This link expires in 30 minutes.</strong>
                If you did not attempt this login, click <strong>Block This Login</strong>
                immediately to protect your account.
              </p>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0d0f1e;padding:22px 32px;text-align:center;
                     border-top:1px solid #2d3155;">
            <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#e2e8f0;">
              {school_name}
            </p>
            <p style="margin:0 0 10px;font-size:11px;color:#475569;">
              Powered by VidyaSetu ERP — Trusted Device Security System
            </p>
            <p style="margin:0;font-size:11px;color:#334155;line-height:1.4;">
              This is an automated security email. Do not reply.
              If you need help, contact your school administrator.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""

    return html_content, plain_text


def build_verification_success_email(
    user_name: str,
    device_type: Optional[str],
    ip_address: Optional[str],
    login_time: datetime,
) -> tuple[str, str]:
    """Email sent after successful device verification."""
    school_name = settings.SCHOOL_NAME or "VidyaSetu School"
    time_str = login_time.strftime("%d %b %Y, %I:%M %p UTC")

    plain_text = f"""
{school_name} — Login Approved

Hello {user_name},

Your login from a new {(device_type or 'device').title()} has been approved and the device is now trusted.

Time: {time_str}
IP  : {ip_address or 'Unknown'}

If you did not approve this, please contact your administrator immediately and change your password.

— VidyaSetu Security Team
    """.strip()

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Login Approved — {school_name}</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#0f1117;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
         style="background:#0f1117;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0"
             style="background:#1a1d2e;border-radius:16px;overflow:hidden;border:1px solid #1f4a2e;">
        <tr>
          <td style="background:linear-gradient(135deg,#065f46,#059669,#10b981);
                     padding:32px;text-align:center;">
            <span style="font-size:40px;">✅</span>
            <h1 style="margin:12px 0 4px;color:#fff;font-size:20px;">Login Approved</h1>
            <p style="margin:0;color:#a7f3d0;font-size:13px;">{school_name}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;text-align:center;">
            <p style="margin:0 0 16px;font-size:15px;color:#e2e8f0;">
              Hi <strong style="color:#34d399;">{user_name}</strong>,
              your new device has been verified and trusted. 🎉
            </p>
            <p style="margin:0 0 16px;font-size:13px;color:#94a3b8;">
              Device: <strong style="color:#e2e8f0;">{(device_type or 'Unknown').title()}</strong>
              &nbsp;|&nbsp; Time: <strong style="color:#e2e8f0;">{time_str}</strong>
            </p>
            <div style="background:#0f2920;border:1px solid #065f46;border-radius:8px;
                        padding:14px;margin-top:16px;">
              <p style="margin:0;font-size:12px;color:#6ee7b7;line-height:1.5;">
                🛡️ If you did not approve this login, change your password immediately
                and contact your school administrator.
              </p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#0d0f1e;padding:18px;text-align:center;border-top:1px solid #1f4a2e;">
            <p style="margin:0;font-size:11px;color:#475569;">{school_name} — VidyaSetu ERP</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>"""
    return html_content, plain_text


def build_suspicious_login_email(
    user_name: str,
    ip_address: Optional[str],
    login_time: datetime,
) -> tuple[str, str]:
    """Email sent when user clicks 'No, This Wasn't Me'."""
    school_name = settings.SCHOOL_NAME or "VidyaSetu School"
    time_str = login_time.strftime("%d %b %Y, %I:%M %p UTC")
    ip_label = ip_address or "Unknown"

    plain_text = f"""
{school_name} — Suspicious Login Blocked

Hello {user_name},

You reported that a login attempt was NOT made by you.

Time: {time_str}
IP  : {ip_label}

The login has been blocked. We recommend:
1. Change your password immediately
2. Contact your school administrator

— VidyaSetu Security Team
    """.strip()

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Login Blocked — {school_name}</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#0f1117;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
         style="background:#0f1117;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0"
             style="background:#1a1d2e;border-radius:16px;overflow:hidden;border:1px solid #7f1d1d;">
        <tr>
          <td style="background:linear-gradient(135deg,#7f1d1d,#b91c1c,#dc2626);
                     padding:32px;text-align:center;">
            <span style="font-size:40px;">🚫</span>
            <h1 style="margin:12px 0 4px;color:#fff;font-size:20px;">Login Blocked</h1>
            <p style="margin:0;color:#fecaca;font-size:13px;">{school_name}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 14px;font-size:15px;color:#e2e8f0;">
              Hi <strong style="color:#f87171;">{user_name}</strong>,
              the suspicious login attempt has been <strong>blocked</strong>.
            </p>
            <p style="margin:0 0 14px;font-size:13px;color:#94a3b8;">
              Time: {time_str} &nbsp;|&nbsp; IP: {ip_label}
            </p>
            <div style="background:#2d0a0a;border:1px solid #7f1d1d;border-radius:8px;padding:16px;">
              <p style="margin:0 0 10px;font-size:13px;color:#fca5a5;font-weight:600;">
                ⚠️ Recommended Actions:
              </p>
              <ul style="margin:0;padding-left:18px;font-size:13px;color:#fca5a5;line-height:1.8;">
                <li>Change your password immediately</li>
                <li>Contact your school administrator</li>
                <li>Review your account activity</li>
              </ul>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#0d0f1e;padding:18px;text-align:center;border-top:1px solid #7f1d1d;">
            <p style="margin:0;font-size:11px;color:#475569;">{school_name} — VidyaSetu ERP</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>"""
    return html_content, plain_text
