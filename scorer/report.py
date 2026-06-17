from dataclasses import dataclass, field
from typing import List
from enum import Enum


class Severity(Enum):
    CRITICAL = "critical"
    WARNING = "warning"
    INFO = "info"


@dataclass
class Finding:
    heuristic_id: str
    severity: Severity
    title: str
    detail: str
    suggestion: str
    weight: int


@dataclass
class Report:
    score: int
    findings: List[Finding]
    input_count: int
    output_count: int
    psbt_version: int
    warnings: List[str] = field(default_factory=list)
