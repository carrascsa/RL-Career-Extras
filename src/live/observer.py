"""RL Career Extras - live caster observer.

Runs with the Python that ships with RL Career Hub. Connects read-only to the RLBot server the Hub
starts for a real match (no agent id: it controls nothing and is not part of the match) and prints
one JSON object per line on stdout for every play worth calling: kickoffs, goals (scorer, assist,
speed, kind), saves, demolitions, big hits, the last minute, overtime and the final whistle.

Usage: python observer.py            (finds the RLBot server by itself and reconnects between matches)
       python observer.py --selftest (feeds synthetic packets through the detector)
"""

import json
import math
import sys
import time

GOAL_KINDS = ("OvertimeGoal", "BicycleGoal", "AerialGoal", "BackwardsGoal", "TurtleGoal", "LongGoal", "BulletGoal", "PoolShot")
HIT_KINDS = ("BicycleHit", "AerialHit", "JuggleHit", "BulletHit")


def emit(obj):
    sys.stdout.write(json.dumps(obj, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def speed_kmh(ball):
    v = ball.physics.velocity
    return math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) * 0.036  # uu/s (cm/s) -> km/h


class Detector:
    """Turns a stream of GamePackets into caster events. Pure: no I/O besides the out() callback."""

    def __init__(self, out, phases):
        self.out = out
        self.P = phases  # dict name -> MatchPhase value
        self.reset()

    def reset(self):
        self.phase = None
        self.score = (0, 0)
        self.roster_key = None
        self.overtime = False
        self.last_speed = 0.0
        self.pending_goal = None
        self.clock_calls = set()
        self.recent = {}  # (kind, name) -> time of last call
        self.goals = {}
        self.t = 0.0
        self.started = False

    def _throttle(self, key, gap):
        last = self.recent.get(key)
        if last is not None and self.t - last < gap:
            return False
        self.recent[key] = self.t
        return True

    def _players(self, p):
        return [{"name": pl.name, "team": int(pl.team), "bot": bool(pl.is_bot)} for pl in p.players]

    def _score(self, p):
        s = [0, 0]
        for t in p.teams:
            if 0 <= t.team_index <= 1:
                s[t.team_index] = int(t.score)
        return tuple(s)

    def feed(self, p, now=None):
        self.t = now if now is not None else time.monotonic()
        self.wall = time.monotonic()
        mi = p.match_info
        P = self.P
        phase = mi.match_phase
        score = self._score(p)
        remaining = float(mi.game_time_remaining)

        key = tuple(sorted((pl.name, int(pl.team)) for pl in p.players))
        if key != self.roster_key and len(p.players) >= 2:
            self.roster_key = key
            self.reset_match_state()
            self.out({"k": "roster", "players": self._players(p)})

        # ball speed while the ball is in play (the goal itself resets it)
        if phase in (P["Active"], P["Kickoff"]) and len(p.balls):
            self.last_speed = speed_kmh(p.balls[0])

        # joined a match already under way (observer restarted, Hub reopened mid-game): pick it up from here
        if not self.started and self.phase is None and phase in (P["Kickoff"], P["Active"], P["GoalScored"], P["Replay"], P["Paused"]):
            self.started = True
            self.score = score
            self.out({"k": "start", "score": list(score), "remaining": round(remaining), "mid": True})

        prev = self.phase
        if phase != prev:
            if phase == P["Countdown"]:
                if not self.started:
                    self.started = True
                    self.out({"k": "start", "score": list(score), "remaining": round(remaining)})
                else:
                    self.out({"k": "kickoff", "score": list(score), "remaining": round(remaining), "ot": bool(mi.is_overtime)})
            elif phase == P["GoalScored"]:
                team = 0 if score[0] > self.score[0] else 1 if score[1] > self.score[1] else None
                self.pending_goal = {"t0": self.t, "team": team, "score": list(score), "speed": round(self.last_speed),
                                     "scorer": None, "assist": None, "tags": [], "own": False, "ot": bool(mi.is_overtime),
                                     "remaining": round(remaining)}
            elif phase == P["Ended"] and self.started:
                self._flush_goal(force=True)
                top = sorted(p.players, key=lambda pl: -pl.score_info.score)
                self.out({"k": "end", "score": list(score), "mvp": top[0].name if top else None,
                          "stats": [{"name": pl.name, "team": int(pl.team), "goals": pl.score_info.goals, "saves": pl.score_info.saves,
                                     "assists": pl.score_info.assists, "shots": pl.score_info.shots, "score": pl.score_info.score} for pl in p.players]})
                self.started = False
            self.phase = phase

        if mi.is_overtime and not self.overtime:
            self.overtime = True
            self.out({"k": "overtime", "score": list(score)})

        # accolades of this tick
        for pl in p.players:
            acc = list(pl.accolades or [])
            if not acc:
                continue
            g = self.pending_goal
            if g is not None:
                if any(a in ("Goal", "OwnGoal") or a in GOAL_KINDS for a in acc):
                    if "OwnGoal" in acc:
                        g["own"] = True
                    if g["scorer"] is None:
                        g["scorer"] = pl.name
                        if g["team"] is None:
                            g["team"] = int(pl.team) if not g["own"] else 1 - int(pl.team)
                    for a in acc:
                        if a in GOAL_KINDS or a == "HatTrick":
                            g["tags"].append(a)
                if "Assist" in acc:
                    g["assist"] = pl.name
                if "HatTrick" in acc and "HatTrick" not in g["tags"]:
                    g["tags"].append("HatTrick")
            if "EpicSave" in acc or "Save" in acc or "FreezeSave" in acc:
                epic = "EpicSave" in acc
                if self._throttle(("save", pl.name), 2.0):
                    self.out({"k": "save", "name": pl.name, "team": int(pl.team), "epic": epic, "score": list(score), "remaining": round(remaining)})
            if "Demolish" in acc:
                victim = next((o.name for o in p.players if o.team != pl.team and o.demolished_timeout > 0), None)
                if self._throttle(("demo", pl.name), 3.0):
                    self.out({"k": "demo", "name": pl.name, "team": int(pl.team), "victim": victim})
            for h in HIT_KINDS:
                if h in acc and phase == P["Active"] and self._throttle(("hit", h), 10.0) and self._throttle(("anyhit",), 6.0):
                    self.out({"k": "hit", "kind": h, "name": pl.name, "team": int(pl.team), "speed": round(self.last_speed)})
            if "Shot" in acc and phase == P["Active"] and self.last_speed >= 95 and self._throttle(("shot",), 12.0):
                self.out({"k": "shot", "name": pl.name, "team": int(pl.team), "speed": round(self.last_speed)})

        self._flush_goal(force=False)

        # the clock
        if phase == P["Active"] and not mi.is_overtime and not mi.is_unlimited_time:
            for mark in (60, 30, 10):
                if remaining <= mark and mark not in self.clock_calls and remaining > mark - 3:
                    self.clock_calls.add(mark)
                    self.out({"k": "clock", "left": mark, "score": list(score)})

        self.score = score

    def reset_match_state(self):
        self.phase = None
        self.overtime = False
        self.pending_goal = None
        self.clock_calls = set()
        self.started = False
        self.score = (0, 0)

    def _flush_goal(self, force):
        g = self.pending_goal
        if g is None:
            return
        age = self.t - g["t0"]
        if force or (g["scorer"] is not None and age >= 0.35) or age >= 1.5:
            g = dict(g)
            g.pop("t0", None)
            g["k"] = "goal"
            self.pending_goal = None
            self.out(g)


def watch_parent():
    """Exit as soon as the Hub (our parent) is gone, even while blocked inside mm.run()."""
    import os
    import threading
    if "--parent" not in sys.argv:
        return
    try:
        ppid = int(sys.argv[sys.argv.index("--parent") + 1])
    except (ValueError, IndexError):
        return
    import psutil

    def loop():
        while True:
            time.sleep(2.0)
            if not psutil.pid_exists(ppid):
                os._exit(0)

    threading.Thread(target=loop, daemon=True).start()


def phases_from_flat(flat):
    return {n: getattr(flat.MatchPhase, n) for n in ("Inactive", "Countdown", "Kickoff", "Active", "GoalScored", "Replay", "Paused", "Ended")}


def run():
    import threading
    import rlbot.flat as flat
    from rlbot.managers import MatchManager
    from rlbot.utils.gateway import find_server_process
    from rlbot.utils.os_detector import RLBOT_SERVER_NAME

    emit({"k": "hello", "pid": __import__("os").getpid()})
    watch_parent()
    while True:
        proc, port = find_server_process(RLBOT_SERVER_NAME)
        if proc is None:
            time.sleep(2.0)
            continue
        det = Detector(emit, phases_from_flat(flat))
        det.wall = time.monotonic()
        # Rocket League closed or the match was left: packets stop coming. Say so, so the Hub can let the
        # crowd and the casters go quiet, and so the next match starts fresh.
        alive = {"on": True}

        def idle_watch(d=det, a=alive):
            while a["on"]:
                time.sleep(1.0)
                if d.started and time.monotonic() - d.wall > 4.0:
                    emit({"k": "idle"})
                    d.reset_match_state()
                    d.roster_key = None
        threading.Thread(target=idle_watch, daemon=True).start()
        mm = MatchManager(None)
        # RLBot keeps its handler lists on the class: give this connection its own list, or every reconnect
        # (the Hub restarts the server for each game) would add another detector and repeat every call
        mm.rlbot_interface.packet_handlers = [det.feed]
        try:
            mm.connect(wants_match_communications=False, wants_ball_predictions=False, close_between_matches=False, rlbot_server_port=port)
            # RLBotServer only streams GamePackets to a connection after it says it is initialised
            mm.rlbot_interface.send_msg(flat.InitComplete())
            emit({"k": "connected", "port": port})
            mm.run()
        except Exception as exc:  # server not ready, closed, restarted...
            emit({"k": "disconnected", "why": repr(exc)[:200]})
        finally:
            try:
                mm.disconnect()
            except Exception:
                pass
        alive["on"] = False
        if det.started:
            emit({"k": "idle"})
        time.sleep(2.0)


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        import os
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import selftest  # noqa: F401  (src/live/selftest.py)
    else:
        try:
            run()
        except KeyboardInterrupt:
            pass
