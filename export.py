"""Write render/data.js: road network, demo mission traces and headline results.
The demo seeds are hand-picked to illustrate behaviour; the statistics come from evaluate.py."""
import json
from sim import *

DEMOS = {"main": 10935, "counter": 10319}

data = dict(
    nodes=NODES,
    edges={e: dict(a=v[0], b=v[1], base=v[2], cls=v[3], via=v[4], seg=BASE_ID[e]) for e, v in EDGES.items()},
    demos={k: dict(seed=s, h1_open=World(s).h1_open, cond=World(s).cond,
                   A=run("certainty", World(s), trace=True), B=run("belief", World(s), trace=True))
           for k, s in DEMOS.items()},
    results=json.load(open("results.json")), scene_min=SCENE_MIN)
open("render/data.js", "w").write("export default " + json.dumps(data) + ";\n")
for k, d in data["demos"].items():
    print(k, d["seed"], {a: (round(d[a]["response"], 1), round(d[a]["total"], 1)) for a in "AB"})
