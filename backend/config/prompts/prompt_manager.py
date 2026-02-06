"""PromptManager — centralized prompt loading with context injection."""

import logging
from typing import Any

from . import bim_prompts, cim_prompts, iim_prompts

logger = logging.getLogger(__name__)

VERSIONS = {"iim": "v1.0.0", "cim": "v1.0.0", "bim": "v1.0.0"}


class PromptManager:
    """Load versioned prompts and inject context."""

    def build_prompt(self, template_name: str, context: dict[str, Any]) -> str:
        """Load template, inject context, validate completeness."""
        templates = {
            "iim_household": iim_prompts.IIM_HOUSEHOLD_ANALYSIS_v1,
            "cim_validation": cim_prompts.CIM_VALIDATION_v1,
            "bim_message": bim_prompts.BIM_MESSAGE_v1,
        }
        tpl = templates.get(template_name, "")
        if not tpl:
            raise ValueError(f"Unknown template: {template_name}")
        try:
            return tpl.format(**context)
        except KeyError as e:
            logger.warning("Missing context key for %s: %s", template_name, e)
            return tpl

    def get_system_prompt(self, model: str, version: str = "latest") -> str:
        """Return versioned system prompt for IIM/CIM/BIM."""
        prompts = {
            "iim": iim_prompts.IIM_SYSTEM_v1,
            "cim": cim_prompts.CIM_SYSTEM_v1,
            "bim": bim_prompts.BIM_SYSTEM_v1,
        }
        return prompts.get(model, "")
