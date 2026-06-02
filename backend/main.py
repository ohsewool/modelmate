from pathlib import Path

_PARTS_DIR = Path(__file__).with_name("main_parts")

for _part in sorted(_PARTS_DIR.glob("*.py")):
    _source = _part.read_text(encoding="utf-8-sig")
    exec(compile(_source, str(_part), "exec"), globals())
