import json, sys, os
d = json.load(open(sys.argv[1], encoding="utf-8"))
res = d.get("result", d)
allp = res.get("all", [])
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
json.dump({"all": allp, "kept": [x for x in allp if x.get("keep")]},
          open(os.path.join(root, "tools", "curation.json"), "w", encoding="utf-8"), ensure_ascii=False)
print("picks:", len(allp), "| kept:", sum(1 for x in allp if x.get('keep')), "| unique stems:", len(set(x['stem'] for x in allp)))
