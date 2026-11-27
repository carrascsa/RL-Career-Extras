"""Feeds a synthetic match (built from real rlbot.flat objects) through observer.Detector and checks the calls."""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import rlbot.flat as flat

from observer import Detector, phases_from_flat

events = []
det = Detector(events.append, phases_from_flat(flat))

NAMES = [("zoldy !", 0, True), ("borja", 0, True), ("rookie", 0, False), ("Rw9", 1, True), ("dralii", 1, True), ("Kiileerrz", 1, True)]
stats = {n: dict(goals=0, saves=0, assists=0, shots=0, score=0) for n, _, _ in NAMES}


def packet(phase, score=(0, 0), remaining=300.0, ot=False, acc=None, ball_speed=0.0, demolished=()):
    acc = acc or {}
    players = []
    for i, (n, team, bot) in enumerate(NAMES):
        s = stats[n]
        players.append(flat.PlayerInfo(
            name=n, team=team, is_bot=bot, player_id=i, accolades=acc.get(n, []),
            score_info=flat.ScoreInfo(score=s["score"], goals=s["goals"], own_goals=0, assists=s["assists"], saves=s["saves"], shots=s["shots"], demolitions=0),
            demolished_timeout=1.5 if n in demolished else 0.0))
    v = ball_speed / 0.036
    ball = flat.BallInfo(physics=flat.Physics(velocity=flat.Vector3(v, 0.0, 0.0)))
    return flat.GamePacket(
        players=players, balls=[ball],
        match_info=flat.MatchInfo(match_phase=phase, game_time_remaining=remaining, is_overtime=ot, is_unlimited_time=False),
        teams=[flat.TeamInfo(team_index=0, score=score[0]), flat.TeamInfo(team_index=1, score=score[1])])


MP = flat.MatchPhase
t = [0.0]


def feed(*a, dt=0.1, **k):
    t[0] += dt
    det.feed(packet(*a, **k), now=t[0])


feed(MP.Inactive)
feed(MP.Countdown, remaining=300)
feed(MP.Kickoff, remaining=300)
feed(MP.Active, remaining=290, ball_speed=80)
feed(MP.Active, remaining=280, ball_speed=40, acc={"Rw9": ["Shot", "AerialHit"]})
feed(MP.Active, remaining=279, acc={"rookie": ["Save", "EpicSave"]})
feed(MP.Active, remaining=279, acc={"rookie": ["Save"]})  # same save, throttled
feed(MP.Active, remaining=270, ball_speed=128, acc={"borja": ["Demolish"]}, demolished=("Rw9",))
# goal by zoldy with an assist from borja, aerial, at 128 km/h
feed(MP.GoalScored, score=(1, 0), remaining=262, ball_speed=0)
stats["zoldy !"]["goals"] = 1
feed(MP.GoalScored, score=(1, 0), remaining=262, acc={"zoldy !": ["Goal", "AerialGoal", "Shot"], "borja": ["Assist"]})
feed(MP.GoalScored, score=(1, 0), remaining=262, dt=0.5)
feed(MP.Replay, score=(1, 0), remaining=262)
feed(MP.Countdown, score=(1, 0), remaining=262)
feed(MP.Active, score=(1, 0), remaining=61)
feed(MP.Active, score=(1, 0), remaining=59.5)
feed(MP.Active, score=(1, 0), remaining=59)
# equaliser with no accolade seen: resolved by timeout
feed(MP.Active, score=(1, 0), remaining=40, ball_speed=100)
feed(MP.GoalScored, score=(1, 1), remaining=40)
feed(MP.GoalScored, score=(1, 1), remaining=40, dt=1.6)
feed(MP.Countdown, score=(1, 1), remaining=0, ot=True)
feed(MP.Active, score=(1, 1), remaining=0, ot=True, ball_speed=70)
feed(MP.GoalScored, score=(2, 1), remaining=0, ot=True, acc={"rookie": ["Goal", "OvertimeGoal"]})
feed(MP.GoalScored, score=(2, 1), remaining=0, ot=True, dt=0.5)
feed(MP.Ended, score=(2, 1), remaining=0, ot=True, acc={"rookie": ["Win", "MVP"]})

kinds = [e["k"] for e in events]
fails = []


def check(cond, msg):
    if not cond:
        fails.append(msg)


check(kinds[0] == "roster" and len(events[0]["players"]) == 6, "roster first")
check("start" in kinds, "start")
saves = [e for e in events if e["k"] == "save"]
check(len(saves) == 1 and saves[0]["epic"] and saves[0]["name"] == "rookie", "one epic save: %r" % saves)
demo = [e for e in events if e["k"] == "demo"]
check(len(demo) == 1 and demo[0]["victim"] == "Rw9", "demo with victim: %r" % demo)
goals = [e for e in events if e["k"] == "goal"]
check(len(goals) == 3, "three goals: %r" % goals)
if len(goals) == 3:
    g1, g2, g3 = goals
    check(g1["scorer"] == "zoldy !" and g1["assist"] == "borja" and "AerialGoal" in g1["tags"] and g1["team"] == 0 and g1["speed"] == 128 and g1["score"] == [1, 0], "goal 1: %r" % g1)
    check(g2["scorer"] is None and g2["team"] == 1 and g2["score"] == [1, 1], "goal 2 by timeout: %r" % g2)
    check(g3["scorer"] == "rookie" and "OvertimeGoal" in g3["tags"] and g3["ot"], "OT goal: %r" % g3)
check([e["left"] for e in events if e["k"] == "clock"] == [60], "only the 60s call (30/10 skipped by jumps): %r" % [e for e in events if e["k"] == "clock"])
check(kinds.count("overtime") == 1, "overtime once")
check(kinds.count("kickoff") >= 1, "kickoff after goal")
end = [e for e in events if e["k"] == "end"]
check(len(end) == 1 and end[0]["score"] == [2, 1], "end: %r" % end)
check(kinds.index("goal") < kinds.index("end"), "goals before end")

for e in events:
    json.dumps(e)
print(json.dumps({"ok": not fails, "fails": fails, "events": len(events), "kinds": kinds}))
sys.exit(1 if fails else 0)
