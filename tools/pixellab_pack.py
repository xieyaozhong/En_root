#!/usr/bin/env python3
"""Pack user-owned PixelLab exported PNG animation strips/grids for Word Relic.

Install: python -m pip install Pillow
Input either <input>/<character>/<action>/<direction>.png or
<input>/<character>__<action>__<direction>.png.
Each input sheet is a grid of equal transparent cells, read left-right/top-bottom.
No AI calls, logins, tokens or copyright-restricted source media are bundled.
"""
from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from pathlib import Path
from PIL import Image

DIRECTIONS = (
    "east", "south-east", "south", "south-west", "west",
    "north-west", "north", "north-east",
)
ACTIONS = (
    "idle", "walk", "run", "attack", "cast",
    "chant", "dash", "hurt", "fallen", "death",
)

def parse_size(text: str) -> tuple[int, int]:
    try:
        a, b = (int(part) for part in text.lower().split("x"))
    except (ValueError, TypeError):
        raise argparse.ArgumentTypeError("Use e.g. --cell 64x96") from None
    if not 1 <= a <= 512 or not 1 <= b <= 512:
        raise argparse.ArgumentTypeError("Cell dimensions must be 1–512")
    return a, b

def parse_file(source: Path, path: Path) -> tuple[str, str, str] | None:
    relative = path.relative_to(source)
    if len(relative.parts) >= 4:
        actor, action, direction = relative.parts[-4], relative.parts[-3], path.stem
    else:
        fragments = path.stem.split("__")
        if len(fragments) != 3:
            return None
        actor, action, direction = fragments
    if not re.fullmatch(r"[a-z][a-z0-9_-]{0,39}", actor):
        raise ValueError(f"Invalid actor name: {actor}")
    if action not in ACTIONS or direction not in DIRECTIONS:
        raise ValueError(f"Invalid action/direction in {relative}")
    return actor, action, direction

def generate(source: Path, output: Path, cell: tuple[int, int], fps: float,
             scale: float, anchor: tuple[int, int], overwrite: bool = False) -> dict:
    source = source.resolve()
    output = output.resolve()
    if not source.is_dir():
        raise FileNotFoundError(source)
    if not 0.1 <= fps <= 60 or not 0.1 <= scale <= 4:
        raise ValueError("fps must be 0.1–60; scale must be 0.1–4")
    if not all(0 <= v <= limit for v,limit in zip(anchor,cell)):
        raise ValueError("Anchor must fall within cell")
    if source == output or source in output.parents or output in source.parents:
        raise ValueError("Keep source and output in separate folders")
    grouped: dict[tuple[str,str],dict[str,Path]] = defaultdict(dict)
    for image in sorted(source.rglob("*.png")):
        parsed = parse_file(source, image)
        if parsed:
            actor,action,direction = parsed
            if direction in grouped[actor,action]:
                raise ValueError(f"Duplicate direction: {parsed}")
            grouped[actor,action][direction] = image
    if not grouped:
        raise ValueError("No character/action/direction PNGs were found")
    if output.exists() and (output / "pack.json").exists() and not overwrite:
        raise FileExistsError(f"{output / 'pack.json'} exists; pass --force to replace")
    chars: dict[str,dict] = {}
    for (actor, action), directions in sorted(grouped.items()):
        rows = [d for d in DIRECTIONS if d in directions]
        sheets: list[list[Image.Image]] = []
        for direction in rows:
            with Image.open(directions[direction]) as img:
                img.load()
                if img.width%cell[0] or img.height%cell[1]:
                    raise ValueError(f"{directions[direction]} not divisible by {cell[0]}×{cell[1]}")
                columns, grid_rows = img.width//cell[0],img.height//cell[1]
                count = columns*grid_rows
                if count<1 or count>64:
                    raise ValueError(f"{directions[direction]} has {count} frames; supported 1–64")
                rgba = img.convert("RGBA")
                slices = [rgba.crop(((i%columns)*cell[0],(i//columns)*cell[1],
                                    ((i%columns)+1)*cell[0],((i//columns)+1)*cell[1]))
                          for i in range(count)]
                sheets.append(slices)
        frames = max(map(len,sheets))
        if frames * cell[0] > 8192 or len(rows)*cell[1] > 8192:
            raise ValueError("Packed atlas exceeds 8192px dimension")
        canvas = Image.new("RGBA", (frames*cell[0], len(rows)*cell[1]))
        for row,slices in enumerate(sheets):
            for index in range(frames):
                canvas.alpha_composite(slices[min(index,len(slices)-1)],(index*cell[0],row*cell[1]))
        dest_dir = output / actor
        dest_dir.mkdir(parents=True,exist_ok=True)
        canvas.save(dest_dir / (action+".png"), optimize=True)
        char = chars.setdefault(actor,{
            "cell":list(cell),"anchor":list(anchor),"scale":scale,
            "actions":{},
        })
        char["actions"][action]={
            "sheet":f"{actor}/{action}.png","frames":frames,"columns":frames,
            "fps":fps,"loop":action not in ("attack","cast","dash","hurt","fallen","death"),
            "directions":rows,
        }
    pack={
        "schema":"word-relic.pixellab.v1",
        "source":"user-supplied-png-export",
        "note":"Each input should be generated/exported by a provider you have rights to use.",
        "characters":chars,
    }
    (output / "pack.json").write_text(json.dumps(pack,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    return pack

def main() -> None:
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input",required=True,type=Path,help="Folder containing user-owned action/direction PNG strips or grids")
    parser.add_argument("--out",required=True,type=Path,help="Usually assets/dungeon/pixellab")
    parser.add_argument("--cell",type=parse_size,default=(64,96),help="Native frame cell pixels, e.g. 64x96")
    parser.add_argument("--fps",type=float,default=8)
    parser.add_argument("--scale",type=float,default=1.0)
    parser.add_argument("--anchor",type=parse_size,default=None,help="Pixel foot origin e.g. 32x89")
    parser.add_argument("--force",action="store_true")
    a=parser.parse_args()
    w,h=a.cell
    anchor=a.anchor or (w//2,h-6)
    result=generate(a.input,a.out,a.cell,a.fps,a.scale,anchor,a.force)
    print(f"Packed {len(result['characters'])} characters: "+
          ", ".join(f"{k} ({len(v['actions'])} actions)" for k,v in result["characters"].items()))
    print("No PixelLab account was accessed or billed. Commit output pack.json and PNGs to deploy.")

if __name__=="__main__":
    main()
