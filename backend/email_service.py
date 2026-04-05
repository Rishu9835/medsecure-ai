"""
Brevo Email Service for Aegix AI
Sends alerts to admin email from database
"""

import requests
from typing import Optional

# Brevo (Sendinblue) Configuration
import os

BREVO_API_KEY = os.getenv("BREVO_API_KEY", "your-brevo-api-key")
BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"

# Sender info - MUST use verified sender from Brevo
SENDER_EMAIL = "rishuraj9431@gmail.com"
SENDER_NAME = "Aegix AI Alerts"


def send_email(to_email: str, subject: str, html_content: str, to_name: str = "") -> dict:
    """
    Send email via Brevo API
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        html_content: HTML email body
        to_name: Recipient name (optional)
    
    Returns:
        dict with success status
    """
    headers = {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    payload = {
        "sender": {
            "name": SENDER_NAME,
            "email": SENDER_EMAIL
        },
        "to": [
            {
                "email": to_email,
                "name": to_name or to_email.split('@')[0]
            }
        ],
        "subject": subject,
        "htmlContent": html_content
    }
    
    try:
        response = requests.post(
            BREVO_API_URL,
            json=payload,
            headers=headers,
            timeout=15
        )
        
        if response.status_code in [200, 201, 202]:
            print(f"✅ Email sent to {to_email}: {subject}")
            return {"success": True, "message": "Email sent"}
        else:
            error = response.json() if response.text else {"message": "Unknown error"}
            print(f"❌ Email failed: {error}")
            return {"success": False, "message": str(error)}
            
    except Exception as e:
        print(f"❌ Email error: {str(e)}")
        return {"success": False, "message": str(e)}


def send_safe_score_alert(to_email: str, score: float, device_id: str, issues: list) -> dict:
    """Send alert when safe score drops below threshold"""
    
    score_color = "#ef4444" if score < 50 else "#f59e0b" if score < 70 else "#22c55e"
    
    issues_html = "".join([f"<li style='margin: 5px 0;'>⚠️ {issue}</li>" for issue in issues])
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 20px; }}
            .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }}
            .header {{ background: linear-gradient(135deg, #dc2626, #991b1b); color: white; padding: 30px; text-align: center; }}
            .header h1 {{ margin: 0; font-size: 24px; }}
            .content {{ padding: 30px; }}
            .score-box {{ text-align: center; margin: 20px 0; }}
            .score {{ font-size: 72px; font-weight: bold; color: {score_color}; }}
            .score-label {{ color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; }}
            .issues {{ background: #fef2f2; border-radius: 12px; padding: 20px; margin: 20px 0; }}
            .issues h3 {{ color: #dc2626; margin: 0 0 10px 0; }}
            .issues ul {{ margin: 0; padding-left: 20px; color: #374151; }}
            .device {{ background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; color: #6b7280; }}
            .footer {{ background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚨 SAFE SCORE ALERT</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Immediate attention required</p>
            </div>
            <div class="content">
                <div class="score-box">
                    <div class="score-label">Current Safe Score</div>
                    <div class="score">{score:.0f}</div>
                    <div class="score-label">out of 100</div>
                </div>
                
                <div class="issues">
                    <h3>⚠️ Issues Detected:</h3>
                    <ul>
                        {issues_html}
                    </ul>
                </div>
                
                <div class="device">
                    <strong>Device:</strong> {device_id}
                </div>
                
                <p style="text-align: center; margin-top: 25px;">
                    <a href="#" style="background: #dc2626; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                        View Dashboard →
                    </a>
                </p>
            </div>
            <div class="footer">
                Aegix AI - Secure Medical Delivery System<br>
                This is an automated alert. Do not reply.
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(
        to_email=to_email,
        subject=f"🚨 Aegix Alert: Safe Score Critical ({score:.0f}/100) - {device_id}",
        html_content=html_content
    )


def send_tamper_alert_email(to_email: str, alert_type: str, message: str, 
                            device_id: str, location: tuple = None, distance: float = None) -> dict:
    """Send tamper/shock alert email to admin"""
    
    alert_emoji = "🚨" if alert_type == "UNAUTHORIZED_LOCATION" else "⚠️" if alert_type == "SHOCK_DETECTED" else "📢"
    alert_color = "#dc2626" if "UNAUTHORIZED" in alert_type else "#f59e0b"
    
    location_html = ""
    if location:
        lat, lng = location
        location_html = f"""
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <strong>📍 Location:</strong> {lat:.6f}, {lng:.6f}<br>
            <a href="https://maps.google.com/?q={lat},{lng}" style="color: #2563eb;">View on Google Maps →</a>
        </div>
        """
    
    distance_html = f"<p><strong>Distance from authorized zone:</strong> {distance:.0f}m</p>" if distance else ""
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 20px; }}
            .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }}
            .header {{ background: linear-gradient(135deg, {alert_color}, #7f1d1d); color: white; padding: 30px; text-align: center; }}
            .header h1 {{ margin: 0; font-size: 24px; }}
            .content {{ padding: 30px; }}
            .alert-type {{ background: {alert_color}; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-size: 14px; font-weight: bold; }}
            .message {{ background: #fef2f2; border-left: 4px solid {alert_color}; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }}
            .device {{ background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; color: #6b7280; margin-top: 20px; }}
            .footer {{ background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>{alert_emoji} TAMPER ALERT</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Security breach detected</p>
            </div>
            <div class="content">
                <p style="text-align: center;">
                    <span class="alert-type">{alert_type}</span>
                </p>
                
                <div class="message">
                    <p style="margin: 0; font-size: 16px;">{message}</p>
                </div>
                
                {distance_html}
                {location_html}
                
                <div class="device">
                    <strong>Device:</strong> {device_id}
                </div>
            </div>
            <div class="footer">
                Aegix AI - Secure Medical Delivery System<br>
                This is an automated security alert.
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(
        to_email=to_email,
        subject=f"{alert_emoji} Aegix Tamper Alert: {alert_type} - {device_id}",
        html_content=html_content
    )


def verify_api() -> dict:
    """Verify Brevo API key"""
    headers = {
        "api-key": BREVO_API_KEY,
        "Accept": "application/json"
    }
    
    try:
        response = requests.get(
            "https://api.brevo.com/v3/account",
            headers=headers,
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Brevo API valid. Plan: {data.get('plan', [{}])[0].get('type', 'Unknown')}")
            return {"valid": True, "email": data.get("email")}
        else:
            print(f"❌ Brevo API invalid: {response.status_code}")
            return {"valid": False}
            
    except Exception as e:
        print(f"❌ Brevo verification error: {str(e)}")
        return {"valid": False, "message": str(e)}


if __name__ == "__main__":
    print("Testing Brevo Email API...")
    verify_api()
