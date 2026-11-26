"""Evaluate all agents on the same missions: python evaluate.py  (writes results.json and assets/fig_results.png)"""
import json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from sim import *

AGENTS = ["oracle", "certainty", "belief", "expected", "always_A", "always_B"]
LABEL = dict(oracle="Oracle (knows roads)", certainty="A: certainty-based", belief="B: belief-based",
             expected="B without look-ahead", always_A="Always Route A", always_B="Always Route B")
COLOR = dict(oracle="#9aa0a6", certainty="#d1495b", belief="#00798c", expected="#6ab7c2", always_A="#007bff", always_B="#0a7d28")


def episodes(agents, n, offset=0, **world_kw):
    out = {}
    for a in agents:
        r = [run(a, World(offset + s, **world_kw)) for s in range(n)]
        out[a] = (np.array([x["response"] for x in r]), np.array([x["total"] for x in r]))
    return out


def ci(x, rng=np.random.default_rng(0), reps=4000):
    m = np.array([x[rng.integers(0, len(x), len(x))].mean() for _ in range(reps)])
    return [float(np.percentile(m, 2.5)), float(np.percentile(m, 97.5))]


def stats(resp, total):
    return dict(response_mean=float(resp.mean()), response_ci=ci(resp), response_p95=float(np.percentile(resp, 95)),
                response_median=float(np.median(resp)), late_25=float((resp > 25).mean()),
                total_mean=float(total.mean()), total_p95=float(np.percentile(total, 95)))


def paired(d, a="certainty", b="belief", i=0):
    diff = d[a][i] - d[b][i]
    return dict(mean_saved=float(diff.mean()), ci=ci(diff), b_faster=float((diff > 1e-9).mean()),
                same=float((np.abs(diff) <= 1e-9).mean()), a_faster=float((diff < -1e-9).mean()))


if __name__ == "__main__":
    N = 5000
    main = episodes(AGENTS, N, offset=10000)
    res = dict(n=N, agents={a: stats(*main[a]) for a in AGENTS},
               paired_response=paired(main), paired_total=paired(main, i=1))
    # robustness: the world changes, agent B keeps its original model
    stress = {
        "as modelled": {},
        "remote reports much worse": dict(obs_remote=np.array([[.60, .25, .15], [.30, .45, .25], [.45, .25, .30]])),
        "remote reports much better": dict(obs_remote=np.array([[.97, .02, .01], [.04, .93, .03], [.05, .05, .90]])),
        "stale reports repeat (80%)": dict(rho=0.8),
        "bad day: priors wrong": dict(priors={"A": (.45, .30, .25), "B": (.80, .17, .03), "C": (.45, .30, .25)}),
    }
    res["robustness"] = {}
    for name, kw in stress.items():
        d = episodes(["certainty", "belief"], 3000, offset=50000, **kw)
        res["robustness"][name] = dict(A=stats(*d["certainty"]), B=stats(*d["belief"]), saved=paired(d))
    json.dump(res, open("results.json", "w"), indent=1)

    fig, ax = plt.subplots(1, 3, figsize=(14, 4.2))
    y = np.arange(len(AGENTS))[::-1]
    for k, (key, title) in enumerate([("response_mean", "Mean response time (min)"),
                                      ("response_p95", "95th percentile response (min)"),
                                      ("late_25", "Responses over 25 min (%)")]):
        v = [res["agents"][a][key] * (100 if key == "late_25" else 1) for a in AGENTS]
        err = None
        if key == "response_mean":
            err = np.abs(np.array([res["agents"][a]["response_ci"] for a in AGENTS]).T - v)
        ax[k].barh(y, v, xerr=err, color=[COLOR[a] for a in AGENTS])
        for yi, vi in zip(y, v):
            ax[k].text(vi + max(v) * .02, yi, f"{vi:.1f}", va="center", fontsize=9)
        ax[k].set_xlim(0, max(v) * 1.15); ax[k].set_title(title, fontsize=11)
        ax[k].set_yticks(y, [LABEL[a] for a in AGENTS] if k == 0 else [""] * len(AGENTS))
        ax[k].spines[["top", "right"]].set_visible(False)
    fig.suptitle(f"{N} paired missions, Ikeja to Oshodi (simulated)"); fig.tight_layout()
    fig.savefig("assets/fig_results.png", dpi=150)

    for a in AGENTS:
        s = res["agents"][a]
        print(f"{LABEL[a]:24s} resp {s['response_mean']:.2f} p95 {s['response_p95']:.1f} late {100*s['late_25']:.1f}% total {s['total_mean']:.2f}")
    print("paired", res["paired_response"], "\ntotal", res["paired_total"])
    for k, v in res["robustness"].items():
        print(f"{k:28s} A {v['A']['response_mean']:.2f}/{100*v['A']['late_25']:.1f}%  B {v['B']['response_mean']:.2f}/{100*v['B']['late_25']:.1f}%  saved {v['saved']['mean_saved']:.2f} {np.round(v['saved']['ci'],2)}")
