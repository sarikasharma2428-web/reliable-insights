"""
Alert Notifier - Log alert notifications
"""
from typing import Dict, Any, Optional
from datetime import datetime

from utils.logger import logger


async def send_notification(
    title: str,
    message: str,
    severity: str,
    alert_data: Optional[Dict[str, Any]] = None
):
    """
    Log alert notification
    
    Args:
        title: Notification title
        message: Notification message
        severity: Alert severity (critical, warning, info)
        alert_data: Additional alert data
    """
    log_message = f"[ALERT] {severity.upper()}: {title} - {message}"
    
    if alert_data:
        log_message += f" | Data: {alert_data}"
    
    if severity == "critical":
        logger.critical(log_message)
    elif severity == "warning":
        logger.warning(log_message)
    else:
        logger.info(log_message)
