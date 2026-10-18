"""
Conversation History Service.
Maintains session-based multi-turn conversation context,
respects context windows, and provides immediate local memory wiping for student privacy.
"""
import uuid
from typing import List, Dict, Optional
from datetime import datetime, timezone


class ConversationService:
    """Manages active conversation threads and multi-turn message history."""

    def __init__(self, max_history_per_conv: int = 12):
        self._conversations: Dict[str, List[Dict[str, str]]] = {}
        self.max_history = max_history_per_conv

    def get_or_create_id(self, conv_id: Optional[str] = None) -> str:
        """Return valid conversation ID, generating a new one if not provided."""
        if conv_id and conv_id.strip():
            cid = conv_id.strip()
            if cid not in self._conversations:
                self._conversations[cid] = []
            return cid
        new_id = str(uuid.uuid4())
        self._conversations[new_id] = []
        return new_id

    def add_message(self, conv_id: str, role: str, content: str) -> None:
        """Append message to conversation history, enforcing max history limit."""
        if conv_id not in self._conversations:
            self._conversations[conv_id] = []
        
        self._conversations[conv_id].append({
            "role": role,
            "content": content,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })

        # Trim oldest messages (preserving pair context)
        if len(self._conversations[conv_id]) > self.max_history:
            self._conversations[conv_id] = self._conversations[conv_id][-self.max_history:]

    def get_messages(self, conv_id: str) -> List[Dict[str, str]]:
        """Retrieve conversation history without timestamps for LLM formatting."""
        history = self._conversations.get(conv_id, [])
        return [{"role": m["role"], "content": m["content"]} for m in history]

    def clear_conversation(self, conv_id: str) -> bool:
        """Clear conversation history for a specific session."""
        if conv_id in self._conversations:
            self._conversations[conv_id] = []
            return True
        return False

    def clear_all(self) -> int:
        """Clear all stored sessions from memory."""
        count = len(self._conversations)
        self._conversations.clear()
        return count


conversation_service = ConversationService()
