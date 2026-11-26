"""Correctness tests: python test_sim.py"""
import itertools
import numpy as np
from sim import *


def test_probabilities():
    for c in CLASSES.values():
        assert abs(sum(c["prior"]) - 1) < 1e-9
    assert np.allclose(OBS_REMOTE.sum(1), 1) and np.allclose(OBS_NEAR.sum(1), 1)


def test_bayes_matches_hand_calculation():
    p = bayes(np.array([.72, .18, .10]), CLEAR, False)
    raw = np.array([.72 * .80, .18 * .25, .10 * .35])
    assert np.allclose(p, raw / raw.sum())


def test_report_frequencies():
    n, hit = 4000, np.zeros(3)
    for s in range(n):
        w = World(s)
        if w.cond["A2"] == BLOCKED:
            hit[w.reports(0, "IKJ", {})["A2"][0]] += 1
    assert np.allclose(hit / hit.sum(), OBS_REMOTE[BLOCKED], atol=.07)


def test_dp_matches_brute_force_monte_carlo():
    """At a junction one step from the scene, DP value must equal simulating the same policy."""
    b = {s: np.array(CLASSES[EDGES[s][3]]["prior"]) for s in SEGMENTS}
    q = belief_dp("IKJ", False, frozenset(["OSH"]), b)
    # independent check: forward-simulate the greedy DP policy over sampled worlds and reports
    rng = np.random.default_rng(0)
    cache, tot, n = {}, 0.0, 30000
    for _ in range(n):
        belief = dict(b)
        node, via, t, e = "IKJ", False, 0.0, "A1"
        while True:
            c = rng.choice(3, p=b[BASE_ID[e]]) if node == "IKJ" else cond
            t += TIMES[e][c]
            node, via = EDGES[e][1], IS_LINK[e]
            if node == "OSH":
                break
            acts = actions(node, via)
            seen, conds = {}, {}
            for a in acts:
                s = BASE_ID[a]
                conds[a] = rng.choice(3, p=b[s])
                seen[a] = rng.choice(3, p=OBS_NEAR[conds[a]])
            key = (node, via, tuple(seen.values()))
            if key not in cache:
                bb = dict(b)
                for a in acts:
                    bb[BASE_ID[a]] = bayes(b[BASE_ID[a]], seen[a], True)
                qq = belief_dp(node, via, frozenset(["OSH"]), bb)
                cache[key] = min(qq, key=qq.get)
            e = cache[key]
            cond = conds[e]
        tot += t
    assert abs(tot / n - q["A1"]) < 0.15, (tot / n, q["A1"])


def test_oracle_is_lower_bound_and_agents_terminate():
    for seed in range(400):
        w = World(seed)
        o = run("oracle", w)
        for a in ["certainty", "belief", "expected", "always_A", "always_B"]:
            r = run(a, w)
            assert r["response"] >= o["response"] - 1e-9, (seed, a)
            assert r["hospital"] == "H2" or w.h1_open


def test_deterministic():
    assert run("belief", World(7), trace=True) == run("belief", World(7), trace=True)


if __name__ == "__main__":
    for name, f in list(globals().items()):
        if name.startswith("test_"):
            f()
            print("PASS", name)
