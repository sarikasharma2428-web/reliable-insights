"""
Alert Rules - Define and manage alert rules
"""
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum

from utils.logger import logger


class Comparison(str, Enum):
    GT = "gt"       # Greater than
    LT = "lt"       # Less than
    GTE = "gte"     # Greater than or equal
    LTE = "lte"     # Less than or equal
    EQ = "eq"       # Equal


@dataclass
class AlertRule:
    """Alert rule definition"""
    id: str
    name: str
    metric_name: str
    threshold: float
    comparison: Comparison
    severity: str
    service_id: Optional[str] = None
    for_duration: str = "5m"
    enabled: bool = True
    labels: Dict[str, str] = None
    annotations: Dict[str, str] = None


# In-memory rule storage (would be database in production)
_alert_rules: Dict[str, AlertRule] = {}


# Default alert rules
DEFAULT_RULES = [
    AlertRule(
        id="high_error_rate",
        name="High Error Rate",
        metric_name="error_rate",
        threshold=5.0,
        comparison=Comparison.GT,
        severity="warning",
        for_duration="5m"
    ),
    AlertRule(
        id="critical_error_rate",
        name="Critical Error Rate",
        metric_name="error_rate",
        threshold=10.0,
        comparison=Comparison.GT,
        severity="critical",
        for_duration="2m"
    ),
    AlertRule(
        id="high_latency",
        name="High Latency",
        metric_name="latency_p99",
        threshold=1000,
        comparison=Comparison.GT,
        severity="warning",
        for_duration="5m"
    ),
    AlertRule(
        id="critical_latency",
        name="Critical Latency",
        metric_name="latency_p99",
        threshold=2000,
        comparison=Comparison.GT,
        severity="critical",
        for_duration="2m"
    ),
    AlertRule(
        id="high_cpu",
        name="High CPU Usage",
        metric_name="cpu_usage",
        threshold=85,
        comparison=Comparison.GT,
        severity="warning",
        for_duration="10m"
    ),
    AlertRule(
        id="critical_cpu",
        name="Critical CPU Usage",
        metric_name="cpu_usage",
        threshold=95,
        comparison=Comparison.GT,
        severity="critical",
        for_duration="5m"
    ),
    AlertRule(
        id="high_memory",
        name="High Memory Usage",
        metric_name="memory_usage",
        threshold=85,
        comparison=Comparison.GT,
        severity="warning",
        for_duration="10m"
    ),
    AlertRule(
        id="critical_memory",
        name="Critical Memory Usage",
        metric_name="memory_usage",
        threshold=95,
        comparison=Comparison.GT,
        severity="critical",
        for_duration="5m"
    ),
    AlertRule(
        id="low_availability",
        name="Low Availability",
        metric_name="availability",
        threshold=99.5,
        comparison=Comparison.LT,
        severity="warning",
        for_duration="15m"
    ),
    AlertRule(
        id="critical_availability",
        name="Critical Availability",
        metric_name="availability",
        threshold=99.0,
        comparison=Comparison.LT,
        severity="critical",
        for_duration="5m"
    ),
]


def init_default_rules():
    """Initialize default alert rules"""
    for rule in DEFAULT_RULES:
        _alert_rules[rule.id] = rule
    logger.info(f"Initialized {len(DEFAULT_RULES)} default alert rules")


async def get_alert_rules() -> List[Dict[str, Any]]:
    """Get all alert rules"""
    if not _alert_rules:
        init_default_rules()
    
    return [
        {
            "id": rule.id,
            "name": rule.name,
            "metric_name": rule.metric_name,
            "threshold": rule.threshold,
            "comparison": rule.comparison.value,
            "severity": rule.severity,
            "service_id": rule.service_id,
            "for_duration": rule.for_duration,
            "enabled": rule.enabled
        }
        for rule in _alert_rules.values()
    ]


async def get_alert_rule(rule_id: str) -> Optional[Dict[str, Any]]:
    """Get a specific alert rule"""
    rule = _alert_rules.get(rule_id)
    if not rule:
        return None
    
    return {
        "id": rule.id,
        "name": rule.name,
        "metric_name": rule.metric_name,
        "threshold": rule.threshold,
        "comparison": rule.comparison.value,
        "severity": rule.severity,
        "service_id": rule.service_id,
        "for_duration": rule.for_duration,
        "enabled": rule.enabled
    }


async def create_alert_rule(
    name: str,
    metric_name: str,
    threshold: float,
    comparison: str,
    severity: str,
    service_id: Optional[str] = None,
    for_duration: str = "5m"
) -> Dict[str, Any]:
    """Create a new alert rule"""
    import uuid
    
    rule_id = str(uuid.uuid4())[:8]
    
    rule = AlertRule(
        id=rule_id,
        name=name,
        metric_name=metric_name,
        threshold=threshold,
        comparison=Comparison(comparison),
        severity=severity,
        service_id=service_id,
        for_duration=for_duration
    )
    
    _alert_rules[rule_id] = rule
    
    logger.info(f"Alert rule created: {name}")
    
    return {
        "id": rule.id,
        "name": rule.name,
        "metric_name": rule.metric_name,
        "threshold": rule.threshold,
        "comparison": rule.comparison.value,
        "severity": rule.severity,
        "service_id": rule.service_id,
        "for_duration": rule.for_duration,
        "enabled": rule.enabled
    }


async def update_alert_rule(rule_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update an alert rule"""
    rule = _alert_rules.get(rule_id)
    if not rule:
        return None
    
    if "name" in updates:
        rule.name = updates["name"]
    if "threshold" in updates:
        rule.threshold = updates["threshold"]
    if "comparison" in updates:
        rule.comparison = Comparison(updates["comparison"])
    if "severity" in updates:
        rule.severity = updates["severity"]
    if "for_duration" in updates:
        rule.for_duration = updates["for_duration"]
    if "enabled" in updates:
        rule.enabled = updates["enabled"]
    
    logger.info(f"Alert rule updated: {rule.name}")
    
    return await get_alert_rule(rule_id)


async def delete_alert_rule(rule_id: str) -> bool:
    """Delete an alert rule"""
    if rule_id in _alert_rules:
        del _alert_rules[rule_id]
        logger.info(f"Alert rule deleted: {rule_id}")
        return True
    return False


def evaluate_comparison(value: float, threshold: float, comparison: Comparison) -> bool:
    """Evaluate a comparison"""
    if comparison == Comparison.GT:
        return value > threshold
    elif comparison == Comparison.LT:
        return value < threshold
    elif comparison == Comparison.GTE:
        return value >= threshold
    elif comparison == Comparison.LTE:
        return value <= threshold
    elif comparison == Comparison.EQ:
        return value == threshold
    return False
