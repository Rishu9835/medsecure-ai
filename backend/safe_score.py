"""
Safe Score Calculator for Aegix AI
Calculates package safety score based on environmental conditions
"""

from typing import Tuple, List

# Safe ranges for medical delivery (prototype demo values)
TEMP_MIN = 15.0   # Celsius
TEMP_MAX = 34.0   # Celsius
HUMIDITY_MIN = 30.0
HUMIDITY_MAX = 70.0
SHOCK_THRESHOLD = 1.5  # g-force

# Score thresholds
SCORE_CRITICAL = 50
SCORE_WARNING = 70

def calculate_safe_score(
    temperature: float,
    humidity: float, 
    shock: float,
    gps_status: str = "LIVE"
) -> Tuple[float, List[str]]:
    """
    Calculate safe score (0-100) based on sensor data
    
    Returns:
        Tuple of (score, list of issues)
    """
    score = 100.0
    issues = []
    
    # Temperature scoring (40% weight)
    if temperature is not None:
        if temperature < TEMP_MIN:
            temp_penalty = min(40, (TEMP_MIN - temperature) * 8)
            score -= temp_penalty
            issues.append(f"Temperature too low: {temperature:.1f}°C (min: {TEMP_MIN}°C)")
        elif temperature > TEMP_MAX:
            temp_penalty = min(40, (temperature - TEMP_MAX) * 8)
            score -= temp_penalty
            issues.append(f"Temperature too high: {temperature:.1f}°C (max: {TEMP_MAX}°C)")
    else:
        score -= 20
        issues.append("Temperature sensor unavailable")
    
    # Humidity scoring (25% weight)
    if humidity is not None:
        if humidity < HUMIDITY_MIN:
            humid_penalty = min(25, (HUMIDITY_MIN - humidity) * 0.5)
            score -= humid_penalty
            issues.append(f"Humidity too low: {humidity:.1f}% (min: {HUMIDITY_MIN}%)")
        elif humidity > HUMIDITY_MAX:
            humid_penalty = min(25, (humidity - HUMIDITY_MAX) * 0.5)
            score -= humid_penalty
            issues.append(f"Humidity too high: {humidity:.1f}% (max: {HUMIDITY_MAX}%)")
    else:
        score -= 10
        issues.append("Humidity sensor unavailable")
    
    # Shock scoring (25% weight)
    if shock is not None:
        if shock > SHOCK_THRESHOLD:
            shock_penalty = min(25, (shock - SHOCK_THRESHOLD) * 10)
            score -= shock_penalty
            issues.append(f"High shock detected: {shock:.2f}g (threshold: {SHOCK_THRESHOLD}g)")
    
    # GPS status (10% weight)
    if gps_status == "NO_FIX":
        score -= 10
        issues.append("GPS signal lost - location unknown")
    elif gps_status == "LAST_KNOWN":
        score -= 5
        issues.append("GPS using last known position")
    
    # Ensure score is between 0 and 100
    score = max(0, min(100, score))
    
    return score, issues


def get_score_status(score: float) -> str:
    """Get status label for score"""
    if score >= 90:
        return "EXCELLENT"
    elif score >= SCORE_WARNING:
        return "GOOD"
    elif score >= SCORE_CRITICAL:
        return "WARNING"
    else:
        return "CRITICAL"


def get_score_color(score: float) -> str:
    """Get color for score display"""
    if score >= 90:
        return "#22c55e"  # Green
    elif score >= SCORE_WARNING:
        return "#84cc16"  # Lime
    elif score >= SCORE_CRITICAL:
        return "#f59e0b"  # Amber
    else:
        return "#ef4444"  # Red


def should_alert(score: float, previous_score: float = None) -> bool:
    """Determine if an alert should be sent"""
    # Alert if score drops below critical threshold
    if score < SCORE_CRITICAL:
        return True
    
    # Alert if score dropped significantly (20+ points)
    if previous_score and (previous_score - score) >= 20:
        return True
    
    return False
