"""Per-request analysis state, without touching the 232 places that use it.

`STATE` was one module-level dict. Every upload wrote the dataframe into it and
every later step read it back, with no user, session or workspace key anywhere.
Behind a login that means the dataset one person uploaded is the dataset the
next request analyses if that request does not bring its own - a data isolation
failure, reproduced in `tests/test_training_pipeline.py::TestSharedGlobalState`.

Reusing the last upload within a session is deliberate: the error for a missing
dataset tells the caller to upload one "or use an existing uploaded dataset".
The defect was never the reuse. It was that the scope of "existing" was the
whole process.

Threading a scope argument through 232 call sites across twenty `.part` files
would be a large, risky edit to a deployed application, and most of those sites
are three-line handlers that have no business knowing about scoping. So the name
keeps its meaning and the mapping underneath changes: `STATE["df"]` still reads
and writes "the current analysis", and what "current" means is now decided by a
context variable that middleware sets per request.

Two properties this has to have, and does:

unset scope behaves exactly as before
    Scripts, tests and any code path that never sets a scope share one default
    bucket. Nothing that works today stops working, and the change cannot break
    a caller by being installed.

scope is set from identity, not from anything the caller can choose
    The key comes from the authenticated subject or the guest session id that
    `get_current_user` already resolves. A client cannot ask to be scoped into
    somebody else's state, because it never names the scope at all.
"""

from __future__ import annotations

import threading
from collections.abc import Iterator, MutableMapping
from contextvars import ContextVar
from typing import Any

DEFAULT_SCOPE = "__default__"

_current_scope: ContextVar[str] = ContextVar("modelmate_state_scope", default=DEFAULT_SCOPE)


class ScopedState(MutableMapping):
    """A dict-shaped view onto whichever bucket the current scope names.

    Implements the full mapping protocol rather than a subset, because the call
    sites do everything a dict allows - `in`, `.get`, `.pop`, `.setdefault`,
    iteration, `len`. A partial imitation would fail somewhere in the twenty
    files that were never going to be re-read.
    """

    def __init__(self) -> None:
        self._buckets: dict[str, dict[str, Any]] = {}
        # ContextVars isolate concurrent requests, but two requests in the same
        # scope can still touch one bucket at once. Creating the bucket is the
        # only step where that matters.
        self._lock = threading.Lock()

    def _bucket(self) -> dict[str, Any]:
        scope = _current_scope.get()
        bucket = self._buckets.get(scope)
        if bucket is None:
            with self._lock:
                bucket = self._buckets.setdefault(scope, {})
        return bucket

    # -- mapping protocol, all against the current scope's bucket

    def __getitem__(self, key: str) -> Any:
        return self._bucket()[key]

    def __setitem__(self, key: str, value: Any) -> None:
        self._bucket()[key] = value

    def __delitem__(self, key: str) -> None:
        del self._bucket()[key]

    def __iter__(self) -> Iterator[str]:
        return iter(self._bucket())

    def __len__(self) -> int:
        return len(self._bucket())

    def __contains__(self, key: object) -> bool:
        return key in self._bucket()

    def __repr__(self) -> str:
        return f"ScopedState(scope={_current_scope.get()!r}, keys={sorted(self._bucket())})"

    # -- administration, deliberately not part of the mapping surface

    def scopes(self) -> tuple[str, ...]:
        return tuple(sorted(self._buckets))

    def drop_scope(self, scope: str) -> bool:
        """Forget one scope's analysis. Returns whether there was anything."""
        with self._lock:
            return self._buckets.pop(scope, None) is not None

    def clear_all(self) -> None:
        """Every scope. For tests and for a deliberate operator reset."""
        with self._lock:
            self._buckets.clear()


def current_scope() -> str:
    return _current_scope.get()


def set_scope(scope: str | None):
    """Enter a scope for this context. Returns the token to reset with.

    A falsy scope maps to the default bucket rather than raising: an
    unauthenticated request should behave as the process did before this
    existed, not fail in a new way.
    """
    return _current_scope.set(scope or DEFAULT_SCOPE)


def reset_scope(token) -> None:
    _current_scope.reset(token)


def scope_for_user(user: Any) -> str:
    """The bucket a request belongs to, derived from who is asking.

    `sub` is what `get_current_user` returns: a server-issued account
    identifier, or `guest:<session>` for the demo path.

    **The guest half is client-supplied.** The session id comes from the
    `x-modelmate-guest-session` header, so saying "the client never names a
    scope" - as this docstring did - is half true and the wrong half to be
    confident about. What holds is narrower and worth stating exactly:

    - a guest cannot reach an **account** bucket. The `guest:` prefix is added
      here and the header is stripped of colons, so `guest:<anything>` can
      never equal an account identifier.
    - a guest cannot reach the **shared default** bucket, which is the one
      per-request scoping exists to remove.

    What is *not* guaranteed: two guests who send the same session id share a
    bucket, and sanitising can make different headers collide (`a:b:c` and
    `abc`). That is what a session identifier is - the same property a cookie
    has - and it is recorded rather than hidden.

    `tests/test_scope_is_not_client_choosable.py` pins all of it.
    """
    if not isinstance(user, dict):
        return DEFAULT_SCOPE
    subject = user.get("sub")
    return str(subject) if subject else DEFAULT_SCOPE
