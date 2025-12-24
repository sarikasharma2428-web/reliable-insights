"""
Alert Notifier - Send alert notifications to various channels
"""
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from enum import Enum
import httpx

from utils.config import settings
from utils.logger import logger


class NotificationChannel(str, Enum):
    SLACK = "slack"
    EMAIL = "email"
    PAGERDUTY = "pagerduty"
    WEBHOOK = "webhook"


@dataclass
class NotificationConfig:
    """Notification channel configuration"""
    channel: NotificationChannel
    enabled: bool
    config: Dict[str, str]


# Notification channels configuration
_notification_channels: List[NotificationConfig] = []


def configure_slack(webhook_url: str, channel: str = "#alerts"):
    """Configure Slack notifications"""
    _notification_channels.append(NotificationConfig(
        channel=NotificationChannel.SLACK,
        enabled=True,
        config={
            "webhook_url": webhook_url,
            "channel": channel
        }
    ))
    logger.info(f"Slack notifications configured for {channel}")


def configure_webhook(url: str, headers: Optional[Dict[str, str]] = None):
    """Configure generic webhook notifications"""
    _notification_channels.append(NotificationConfig(
        channel=NotificationChannel.WEBHOOK,
        enabled=True,
        config={
            "url": url,
            "headers": str(headers or {})
        }
    ))
    logger.info(f"Webhook notifications configured for {url}")


async def send_notification(
    title: str,
    message: str,
    severity: str,
    alert_data: Optional[Dict[str, Any]] = None
):
    """
    Send notification to all configured channels
    
    Args:
        title: Notification title
        message: Notification message
        severity: Alert severity (critical, warning, info)
        alert_data: Additional alert data
    """
    for config in _notification_channels:
        if not config.enabled:
            continue
        
        try:
            if config.channel == NotificationChannel.SLACK:
                await send_slack_notification(config, title, message, severity, alert_data)
            elif config.channel == NotificationChannel.WEBHOOK:
                await send_webhook_notification(config, title, message, severity, alert_data)
            elif config.channel == NotificationChannel.PAGERDUTY:
                await send_pagerduty_notification(config, title, message, severity, alert_data)
        except Exception as e:
            logger.error(f"Failed to send {config.channel} notification: {e}")


async def send_slack_notification(
    config: NotificationConfig,
    title: str,
    message: str,
    severity: str,
    alert_data: Optional[Dict[str, Any]] = None
):
    """Send notification to Slack"""
    webhook_url = config.config.get("webhook_url")
    if not webhook_url:
        return
    
    # Color based on severity
    colors = {
        "critical": "#dc3545",
        "warning": "#ffc107",
        "info": "#17a2b8"
    }
    
    color = colors.get(severity, "#6c757d")
    
    payload = {
        "attachments": [
            {
                "color": color,
                "title": title,
                "text": message,
                "fields": [],
                "footer": "SRE Observability Platform",
                "ts": int(datetime.utcnow().timestamp())
            }
        ]
    }
    
    # Add alert data as fields
    if alert_data:
        if "service_name" in alert_data:
            payload["attachments"][0]["fields"].append({
                "title": "Service",
                "value": alert_data["service_name"],
                "short": True
            })
        if "metric_name" in alert_data:
            payload["attachments"][0]["fields"].append({
                "title": "Metric",
                "value": alert_data["metric_name"],
                "short": True
            })
        if "current_value" in alert_data:
            payload["attachments"][0]["fields"].append({
                "title": "Current Value",
                "value": str(alert_data["current_value"]),
                "short": True
            })
        if "threshold" in alert_data:
            payload["attachments"][0]["fields"].append({
                "title": "Threshold",
                "value": str(alert_data["threshold"]),
                "short": True
            })
    
    async with httpx.AsyncClient() as client:
        response = await client.post(webhook_url, json=payload, timeout=10.0)
        
        if response.status_code != 200:
            logger.error(f"Slack notification failed: {response.text}")
        else:
            logger.info(f"Slack notification sent: {title}")


async def send_webhook_notification(
    config: NotificationConfig,
    title: str,
    message: str,
    severity: str,
    alert_data: Optional[Dict[str, Any]] = None
):
    """Send notification to generic webhook"""
    url = config.config.get("url")
    if not url:
        return
    
    payload = {
        "title": title,
        "message": message,
        "severity": severity,
        "timestamp": datetime.utcnow().isoformat(),
        "data": alert_data or {}
    }
    
    headers = eval(config.config.get("headers", "{}"))
    headers["Content-Type"] = "application/json"
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers, timeout=10.0)
        
        if response.status_code not in (200, 201, 202, 204):
            logger.error(f"Webhook notification failed: {response.status_code}")
        else:
            logger.info(f"Webhook notification sent: {title}")


async def send_pagerduty_notification(
    config: NotificationConfig,
    title: str,
    message: str,
    severity: str,
    alert_data: Optional[Dict[str, Any]] = None
):
    """Send notification to PagerDuty"""
    routing_key = config.config.get("routing_key")
    if not routing_key:
        return
    
    # Map severity to PagerDuty severity
    pd_severity = {
        "critical": "critical",
        "high": "error",
        "warning": "warning",
        "info": "info"
    }.get(severity, "warning")
    
    payload = {
        "routing_key": routing_key,
        "event_action": "trigger",
        "payload": {
            "summary": title,
            "severity": pd_severity,
            "source": "sre-observability-platform",
            "custom_details": {
                "message": message,
                **(alert_data or {})
            }
        }
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://events.pagerduty.com/v2/enqueue",
            json=payload,
            timeout=10.0
        )
        
        if response.status_code != 202:
            logger.error(f"PagerDuty notification failed: {response.text}")
        else:
            logger.info(f"PagerDuty notification sent: {title}")


# Import datetime for timestamp
from datetime import datetime
