"""Lagos ambulance dispatch under uncertain road conditions (a stylised toy, not a traffic model).

Mission: Ikeja -> Oshodi (accident scene) -> an available hospital.
Hidden state: each road segment is clear, congested or blocked, fixed for the mission.
Observation: at every junction, a noisy traffic report for every segment. Reports on the segments that
start at the current junction are sharper (the crew and nearby callers can see them).

This is a Canadian Traveller Problem with noisy remote sensing. Planners:
  certainty : takes the latest report as the truth, runs shortest path, replans at each junction.
  belief    : Bayes filter per segment + belief-space dynamic programming that also anticipates what it
              will see at later junctions (so keeping an escape road open has a value).
  expected  : ablation. Same Bayes filter, but plain shortest path on expected times (no anticipation).
  always_A / always_B : fixed route to the scene (belief planner afterwards).
  oracle    : knows the true conditions (lower bound on time).
"""
import functools
import itertools

import numpy as np

CLEAR, CONGESTED, BLOCKED = 0, 1, 2
NAMES = ["clear", "congested", "blocked"]
BLOCK_EXTRA = 14.0      # minutes lost getting past a blockage, on top of the free-flow time
SCENE_MIN = 3.0         # minutes on scene loading the patient
H1_OPEN_P = 0.7         # chance the nearer hospital has a bed (confirmed by phone at pickup)

# P(report | true condition). Rows: true condition. Columns: reported clear / congested / blocked.
# Remote reports are often stale: many blockages are still reported as clear.
OBS_REMOTE = np.array([[.80, .15, .05], [.25, .65, .10], [.35, .20, .45]])
OBS_NEAR = np.array([[.90, .08, .02], [.10, .85, .05], [.08, .07, .85]])

# Map pixel coordinates follow the blog's route map (1536 x 1024).
NODES = {
    "IKJ": (1322, 262), "A1": (975, 305), "A2": (545, 352), "B1": (1085, 505), "B2": (680, 545),
    "C1": (1235, 605), "C2": (720, 645), "OSH": (265, 545),
    "M1": (215, 410), "N1": (165, 665), "H1": (80, 320), "H2": (45, 760),
}
# class priors P(clear, congested, blocked) and the congestion slow-down factor
CLASSES = {
    "A": dict(prior=(.72, .18, .10), slow=2.0),    # fast, fragile
    "B": dict(prior=(.85, .14, .01), slow=1.6),    # slower, reliable
    "C": dict(prior=(.60, .25, .15), slow=1.9),    # long, uncertain
    "link": dict(prior=(.80, .17, .03), slow=1.8),
    "D": dict(prior=(.65, .22, .13), slow=2.0),
    "E": dict(prior=(.85, .13, .02), slow=1.6),
}
# id: (from, to, free-flow minutes, class, intermediate map points)
EDGES = {
    "A1": ("IKJ", "A1", 4.0, "A", [(1220, 240), (1100, 228)]),
    "A2": ("A1", "A2", 4.0, "A", [(850, 340), (700, 348)]),
    "A3": ("A2", "OSH", 4.0, "A", [(450, 385), (392, 408), (370, 455)]),
    "B1": ("IKJ", "B1", 5.4, "B", [(1225, 290), (1170, 345), (1140, 435)]),
    "B2": ("B1", "B2", 5.3, "B", [(985, 530), (860, 540), (740, 546)]),
    "B3": ("B2", "OSH", 5.3, "B", [(560, 535), (460, 510), (370, 515)]),
    "C1": ("IKJ", "C1", 6.7, "C", [(1312, 330), (1295, 430), (1270, 550)]),
    "C2": ("C1", "C2", 6.7, "C", [(1095, 628), (920, 640)]),
    "C3": ("C2", "OSH", 6.6, "C", [(580, 660), (490, 672), (385, 625)]),
    # side streets between routes, usable in both directions
    "X1": ("A1", "B1", 2.5, "link", [(1010, 400)]), "X1r": ("B1", "A1", 2.5, "link", [(1010, 400)]),
    "X2": ("A2", "B2", 2.5, "link", [(600, 450)]), "X2r": ("B2", "A2", 2.5, "link", [(600, 450)]),
    "Y1": ("B1", "C1", 2.5, "link", [(1175, 575)]), "Y1r": ("C1", "B1", 2.5, "link", [(1175, 575)]),
    "Y2": ("B2", "C2", 2.5, "link", [(695, 598)]), "Y2r": ("C2", "B2", 2.5, "link", [(695, 598)]),
    # transport leg
    "D1": ("OSH", "M1", 3.0, "D", [(250, 475)]), "D2": ("M1", "H1", 3.0, "D", [(150, 385)]),
    "E1": ("OSH", "N1", 4.5, "E", [(235, 625)]), "E2": ("N1", "H1", 4.5, "E", [(75, 560), (65, 430)]),
    "F": ("N1", "H2", 4.0, "E", [(95, 700)]),
    "G": ("M1", "N1", 2.0, "link", [(160, 520)]), "Gr": ("N1", "M1", 2.0, "link", [(160, 520)]),
}
IDS = list(EDGES)
TWIN = {e: (e[:-1] if e.endswith("r") else e + "r") for e in IDS}
BASE_ID = {e: e[:-1] if e.endswith("r") else e for e in IDS}   # both directions share one condition
SEGMENTS = sorted(set(BASE_ID.values()))
OUT = {n: [e for e in IDS if EDGES[e][0] == n] for n in NODES}
IS_LINK = {e: EDGES[e][3] == "link" for e in IDS}


def actions(node, via_link):
    """No two side streets in a row, which also rules out driving in circles."""
    return [e for e in OUT[node] if not (via_link and IS_LINK[e])]


def true_time(e, cond, jitter=1.0):
    base, cls = EDGES[e][2], EDGES[e][3]
    if cond == BLOCKED:
        return base * jitter + BLOCK_EXTRA
    return base * jitter * (CLASSES[cls]["slow"] if cond == CONGESTED else 1.0)


TIMES = {e: np.array([true_time(e, c) for c in range(3)]) for e in IDS}


class World:
    """All randomness of one mission, drawn up front so every agent faces exactly the same one."""
    MAX_VISITS = 12

    def __init__(self, seed, priors=None, rho=0.0, obs_remote=OBS_REMOTE):
        rng = np.random.default_rng(seed)
        self.seed, self.rho, self.obs_remote = seed, rho, obs_remote
        self.cond, self.jit = {}, {}
        for s in SEGMENTS:
            p = (priors or {}).get(EDGES[s][3], CLASSES[EDGES[s][3]]["prior"])
            self.cond[s] = int(rng.choice(3, p=p))
            self.jit[s] = float(rng.uniform(.9, 1.1))
        self.h1_open = bool(rng.random() < H1_OPEN_P)
        self.u = rng.random((self.MAX_VISITS, len(SEGMENTS)))      # report noise
        self.stale = rng.random((self.MAX_VISITS, len(SEGMENTS)))  # correlated-error draw

    def reports(self, visit, node, prev):
        near = {BASE_ID[e] for e in OUT[node]}
        out = {}
        for i, s in enumerate(SEGMENTS):
            is_near = s in near
            if not is_near and s in prev and self.stale[visit, i] < self.rho:
                out[s] = (prev[s][0], False)        # same old report repeated
                continue
            M = OBS_NEAR if is_near else self.obs_remote
            r = int(min(np.searchsorted(np.cumsum(M[self.cond[s]]), self.u[visit, i]), 2))
            out[s] = (r, is_near)
        return out


def bayes(b, report, is_near):
    post = b * (OBS_NEAR if is_near else OBS_REMOTE)[:, report]
    return post / post.sum()


def shortest(node, via_link, goals, cost):
    """Shortest path over (node, via_link) states. Returns (cost, first edge, path edges)."""
    @functools.lru_cache(None)
    def V(n, v):
        if n in goals:
            return 0.0, ()
        best = (float("inf"), ())
        for e in actions(n, v):
            c, path = V(EDGES[e][1], IS_LINK[e])
            if cost[e] + c < best[0]:
                best = (cost[e] + c, (e,) + path)
        return best
    c, path = V(node, via_link)
    return c, (path[0] if path else None), path


def belief_dp(node, via_link, goals, belief):
    """Q(e) = E_b[time(e)] + V(next). V averages, over the reports the crew will get on arrival, the
    best choice under the updated belief. Segments are independent and never revisited, so this is
    exact for the anticipated near reports (later long-range reports are used by replanning)."""
    @functools.lru_cache(None)
    def V(n, v):
        if n in goals:
            return 0.0
        acts = actions(n, v)
        if not acts:
            return float("inf")
        later = np.array([V(EDGES[e][1], IS_LINK[e]) for e in acts])
        k = len(acts)
        joint_p, q = np.ones((1,) * k), []
        for i, e in enumerate(acts):
            b = belief[BASE_ID[e]]
            like = b[:, None] * OBS_NEAR                 # P(true, report)
            p_rep = like.sum(0)
            qi = (TIMES[e] @ like) / p_rep + later[i]    # Q for each possible report
            shape = [1] * k
            shape[i] = 3
            joint_p = joint_p * p_rep.reshape(shape)
            q.append(np.broadcast_to(qi.reshape(shape), (3,) * k))
        return float((joint_p * np.minimum.reduce(q)).sum())

    return {e: float(TIMES[e] @ belief[BASE_ID[e]]) + V(EDGES[e][1], IS_LINK[e]) for e in actions(node, via_link)}


def run(agent, world, model_priors=None, trace=False):
    """Run one mission. Returns response time, total time and optionally a full decision trace."""
    pri = {k: np.array((model_priors or {}).get(k, v["prior"])) for k, v in CLASSES.items()}
    belief = {s: pri[EDGES[s][3]].copy() for s in SEGMENTS}
    t, node, via, visit, prev, steps = 0.0, "IKJ", False, 0, {}, []
    response = None
    goals = frozenset(["OSH"])
    while True:
        if node == "OSH" and response is None:
            response = t
            t += SCENE_MIN
            goals = frozenset(["H1", "H2"] if world.h1_open else ["H2"])
            via = False
        elif node in goals:
            break
        reports = world.reports(visit, node, prev)
        prev = reports
        visit += 1
        for s, (r, near) in reports.items():
            belief[s] = bayes(belief[s], r, near)
        acts = actions(node, via)
        info = {}
        if agent == "oracle":
            cost = {e: true_time(e, world.cond[BASE_ID[e]], world.jit[BASE_ID[e]]) for e in IDS}
            _, choice, _ = shortest(node, via, goals, cost)
        elif agent == "certainty":
            cost = {e: TIMES[e][reports[BASE_ID[e]][0]] for e in IDS}
            _, choice, path = shortest(node, via, goals, cost)
            for e in acts:
                c, _, _ = shortest(EDGES[e][1], IS_LINK[e], goals, cost)
                info[e] = cost[e] + c
        elif agent.startswith("always_") and response is None:
            choice = next(e for e in acts if EDGES[e][3] == agent[-1] and not IS_LINK[e])
        elif agent == "expected":
            cost = {e: TIMES[e] @ belief[BASE_ID[e]] for e in IDS}
            _, choice, _ = shortest(node, via, goals, cost)
        else:  # belief
            info = belief_dp(node, via, goals, belief)
            info = {e: v for e, v in info.items() if np.isfinite(v)}
            choice = min(info, key=info.get)
        seg = BASE_ID[choice]
        dt = true_time(choice, world.cond[seg], world.jit[seg])
        if trace:
            steps.append(dict(
                node=node, edge=choice, t0=round(t, 3), t1=round(t + dt, 3), cond=world.cond[seg],
                leg="response" if response is None else "transport",
                reports={s: reports[s][0] for s in SEGMENTS},
                belief={s: [round(float(x), 4) for x in belief[s]] for s in SEGMENTS},
                q={e: round(float(v), 2) for e, v in info.items() if np.isfinite(v)}))
        belief[seg] = np.eye(3)[world.cond[seg]]
        t, node, via = t + dt, EDGES[choice][1], IS_LINK[choice]
    res = dict(agent=agent, response=response, total=t, hospital=node)
    if trace:
        res["steps"] = steps
    return res
