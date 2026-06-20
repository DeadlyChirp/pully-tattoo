import json, sys, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cur = json.load(open(os.path.join(root, "tools", "curation.json"), encoding="utf-8"))
all1 = cur.get("all", [])
d = json.load(open(sys.argv[1], encoding="utf-8"))
all2 = d.get("result", d).get("all", [])
seen, out = set(), []
for x in all1 + all2:
    s = x.get("stem")
    if not s or s in seen: continue
    seen.add(s); out.append(x)
json.dump({"all": out, "kept": [x for x in out if x.get("keep")]},
          open(os.path.join(root, "tools", "curation.json"), "w", encoding="utf-8"), ensure_ascii=False)
print("merged total:", len(out), "| kept:", sum(1 for x in out if x.get('keep')))
