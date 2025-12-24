"""Time Helpers"""
from datetime import datetime, timedelta

def parse_duration(duration: str) -> timedelta:
    unit = duration[-1]
    value = int(duration[:-1])
    if unit == 's': return timedelta(seconds=value)
    if unit == 'm': return timedelta(minutes=value)
    if unit == 'h': return timedelta(hours=value)
    if unit == 'd': return timedelta(days=value)
    return timedelta(seconds=0)
