import asyncio
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")
SMTP_FROM = os.environ.get("SMTP_FROM", "noreply@hive.rllm-project.com")
APP_URL = os.environ.get("APP_URL", "http://localhost:3000")


def _send_sync(to: str, subject: str, body_text: str, body_html: str = ""):
    if not SMTP_HOST:
        print(f"[email] SMTP not configured. Would send to {to}: {subject}")
        return
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = SMTP_FROM
    msg["To"] = to
    msg.attach(MIMEText(body_text, "plain"))
    if body_html:
        msg.attach(MIMEText(body_html, "html"))
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        if SMTP_USER:
            server.login(SMTP_USER, SMTP_PASS)
        server.sendmail(SMTP_FROM, [to], msg.as_string())


async def send_verification_email(to: str, token: str):
    link = f"{APP_URL}/auth/verify?token={token}"
    subject = "Verify your Hive email"
    body_text = f"Click this link to verify your email: {link}\n\nThis link expires in 24 hours."
    body_html = (
        f'<p>Click the link below to verify your email:</p>'
        f'<p><a href="{link}">Verify email</a></p>'
        f'<p>This link expires in 24 hours.</p>'
        f'<p style="color:#888;font-size:12px">If you didn\'t create a Hive account, ignore this email.</p>'
    )
    await asyncio.to_thread(_send_sync, to, subject, body_text, body_html)
