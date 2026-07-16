"""
hoare-ai Python SDK client.

Usage::

    from client import HoareAIClient

    client = HoareAIClient(base_url="http://localhost:3000", api_key="your-key")
    result = client.chat("Hello, agent!")
    print(result)
"""

from __future__ import annotations

import json
import urllib.request
import urllib.error
from typing import Any, Dict, List, Optional


class HoareAIError(Exception):
    """Raised when the hoare-ai API returns an error response."""

    def __init__(self, message: str, status_code: Optional[int] = None) -> None:
        super().__init__(message)
        self.status_code = status_code


class HoareAIClient:
    """HTTP client for the hoare-ai agent runtime REST API."""

    def __init__(
        self,
        base_url: str,
        api_key: Optional[str] = None,
        org_id: Optional[str] = None,
        timeout: int = 30,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self._headers: Dict[str, str] = {"Content-Type": "application/json"}
        if api_key:
            self._headers["Authorization"] = "Bearer " + api_key
        if org_id:
            self._headers["x-org-id"] = org_id
        self.timeout = timeout

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _request(
        self,
        method: str,
        path: str,
        body: Optional[Dict[str, Any]] = None,
    ) -> Any:
        url = self.base_url + path
        data = json.dumps(body).encode("utf-8") if body is not None else None
        req = urllib.request.Request(url, data=data, headers=self._headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            try:
                detail = json.loads(exc.read().decode("utf-8"))
                msg = detail.get("error", str(exc))
            except Exception:
                msg = str(exc)
            raise HoareAIError(msg, status_code=exc.code) from exc
        except urllib.error.URLError as exc:
            raise HoareAIError(str(exc)) from exc

    # ------------------------------------------------------------------
    # Chat
    # ------------------------------------------------------------------

    def chat(self, message: str, session_id: Optional[str] = None) -> Dict[str, Any]:
        """Send a message and receive an agent response."""
        payload: Dict[str, Any] = {"message": message}
        if session_id:
            payload["sessionId"] = session_id
        return self._request("POST", "/api/chat", payload)

    def get_chat_history(self, session_id: str) -> Dict[str, Any]:
        """Retrieve conversation history for a session."""
        return self._request("GET", "/api/chat/" + session_id + "/history")

    def clear_chat_history(self, session_id: str) -> Dict[str, Any]:
        """Clear the conversation history for a session."""
        return self._request("DELETE", "/api/chat/" + session_id)

    # ------------------------------------------------------------------
    # Tools
    # ------------------------------------------------------------------

    def list_tools(self) -> Dict[str, Any]:
        """List all registered tools."""
        return self._request("GET", "/api/tools")

    def get_tool(self, name: str) -> Dict[str, Any]:
        """Get details of a specific tool by name."""
        return self._request("GET", "/api/tools/" + name)

    def invoke_tool(self, name: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Directly invoke a tool by name."""
        return self._request("POST", "/api/tools/" + name + "/invoke", {"params": params or {}})

    # ------------------------------------------------------------------
    # Execute (async jobs)
    # ------------------------------------------------------------------

    def execute(
        self,
        tool_name: str,
        params: Optional[Dict[str, Any]] = None,
        async_mode: bool = False,
    ) -> Dict[str, Any]:
        """Submit a tool execution job."""
        return self._request(
            "POST",
            "/api/execute",
            {"toolName": tool_name, "params": params or {}, "async": async_mode},
        )

    def get_job(self, job_id: str) -> Dict[str, Any]:
        """Poll the status and result of a submitted job."""
        return self._request("GET", "/api/execute/" + job_id)

    def list_jobs(self) -> List[Dict[str, Any]]:
        """List all submitted execution jobs."""
        return self._request("GET", "/api/execute")

    # ------------------------------------------------------------------
    # Session
    # ------------------------------------------------------------------

    def create_session(
        self,
        name: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Create a new session."""
        payload: Dict[str, Any] = {}
        if name is not None:
            payload["name"] = name
        if metadata is not None:
            payload["metadata"] = metadata
        return self._request("POST", "/api/session", payload)

    def list_sessions(self) -> List[Dict[str, Any]]:
        """List all sessions."""
        return self._request("GET", "/api/session")

    def get_session(self, session_id: str) -> Dict[str, Any]:
        """Get details of a specific session."""
        return self._request("GET", "/api/session/" + session_id)

    def update_session(
        self,
        session_id: str,
        name: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Update a session's name or metadata."""
        payload: Dict[str, Any] = {}
        if name is not None:
            payload["name"] = name
        if metadata is not None:
            payload["metadata"] = metadata
        return self._request("PATCH", "/api/session/" + session_id, payload)

    def delete_session(self, session_id: str) -> Dict[str, Any]:
        """Delete a session."""
        return self._request("DELETE", "/api/session/" + session_id)

    # ------------------------------------------------------------------
    # Partner integration surface
    # ------------------------------------------------------------------

    def run_agent(self, message: str) -> Dict[str, Any]:
        return self._request("POST", "/agent/run", {"message": message})

    def invoke_partner_tool(self, tool_name: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        return self._request("POST", "/tools/invoke", {"toolName": tool_name, "params": params or {}})

    def execute_workflow(self, definition: Dict[str, Any]) -> Dict[str, Any]:
        return self._request("POST", "/workflow/execute", {"definition": definition})

    def generate_foundation(self, task: str, params: Dict[str, Any]) -> Dict[str, Any]:
        return self._request("POST", "/foundation/generate", {"task": task, "params": params})


HoareClient = HoareAIClient
