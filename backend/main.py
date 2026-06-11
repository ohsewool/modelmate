from pathlib import Path

_PARTS_DIR = Path(__file__).with_name("main_parts")

_sources = [
    _part.read_text(encoding="utf-8-sig")
    for _part in sorted(_PARTS_DIR.glob("*.part"))
]
_source = "\n".join(_sources)
exec(compile(_source, str(_PARTS_DIR), "exec"), globals())
