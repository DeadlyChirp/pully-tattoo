import json, sys, os, glob

def find(obj, keys):
    if isinstance(obj, dict):
        if all(k in obj for k in keys):
            return obj
        for v in obj.values():
            r = find(v, keys)
            if r: return r
    elif isinstance(obj, list):
        for v in obj:
            r = find(v, keys)
            if r: return r
    return None

def find_all(obj, keys, acc):
    if isinstance(obj, dict):
        if all(k in obj for k in keys):
            acc.append(obj)
        for v in obj.values():
            find_all(v, keys, acc)
    elif isinstance(obj, list):
        for v in obj:
            find_all(v, keys, acc)

wfdir = sys.argv[1]
plan_cands, lane_cands = [], []
for fp in glob.glob(os.path.join(wfdir, "agent-*.jsonl")):
    for line in open(fp, encoding="utf-8"):
        line = line.strip()
        if not line: continue
        try: obj = json.loads(line)
        except: continue
        find_all(obj, ["summary", "upgrades"], plan_cands)
        find_all(obj, ["lane", "findings"], lane_cands)

# richest plan = most upgrades
plan = max(plan_cands, key=lambda p: len(p.get("upgrades", [])), default=None)
# dedupe lanes by name, keep richest per lane
best = {}
for f in lane_cands:
    k = f.get("lane", "")
    if k not in best or len(f.get("findings", [])) > len(best[k].get("findings", [])):
        best[k] = f
findings = list(best.values())

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = {"plan": plan, "lanes": findings}
json.dump(out, open(os.path.join(root, "tools", "research_plan.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("plan found:", bool(plan), "| upgrades:", len(plan.get("upgrades", [])) if plan else 0, "| lanes:", len(findings))
if plan:
    print("stack:", (plan.get("stackRecommendation","") or "")[:300])
