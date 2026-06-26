#!/usr/bin/env python3
from pathlib import Path

p = Path("src/main.jsx")
s = p.read_text(encoding="utf-8")

changed = False

# 1) buildPrograms() がCSV取込データも読むようにする
old_return = "return [...map.values()].map(p => ({ ...p, episodes:p.episodes.sort((a,b)=>`${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)) }));"
new_return = """const basePrograms = [...map.values()].map(p => ({ ...p, episodes:p.episodes.sort((a,b)=>`${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)) }));
  return mergePrograms(basePrograms, loadImportedGuide());"""
if old_return in s and "return mergePrograms(basePrograms, loadImportedGuide());" not in s:
    s = s.replace(old_return, new_return)
    changed = True

# 2) CSV入力欄用の状態を追加
old_state = "const [revealed,setRevealed] = React.useState({});"
new_state = "const [revealed,setRevealed] = React.useState({});\n  const [guideCsv,setGuideCsv] = React.useState('');"
if old_state in s and "const [guideCsv,setGuideCsv]" not in s:
    s = s.replace(old_state, new_state)
    changed = True

# 3) 番組追加画面の上にCSV取込フォームを追加
old_admin = '<section className="card"><h2>番組候補に追加</h2><form onSubmit={addProgram}>'
new_admin = """<section className="card">
  <h2>番組表CSV取り込み</h2>
  <p className="help">CSV形式：date,time,title,station,genre,episodeTitle</p>
  <form onSubmit={importGuideCsv}>
    <textarea
      value={guideCsv}
      onChange={e=>setGuideCsv(e.target.value)}
      placeholder={'date,time,title,station,genre,episodeTitle\\n2026-06-26,20:00,それSnow Manにやらせて下さい,TBS系,バラエティ,6/26(金)放送回'}
    />
    <button className="primary">番組表を取り込む</button>
  </form>
  <button className="secondary" onClick={clearGuideCsv}>取り込み番組表を削除</button>
</section><section className="card"><h2>番組候補に追加</h2><form onSubmit={addProgram}>"""
if old_admin in s and "番組表CSV取り込み" not in s:
    s = s.replace(old_admin, new_admin)
    changed = True

p.write_text(s, encoding="utf-8")

if changed:
    print("OK: CSV取り込み画面を追加しました。")
else:
    print("変更なし: すでに反映済み、または想定と違うコードです。src/main.jsxを確認してください。")
