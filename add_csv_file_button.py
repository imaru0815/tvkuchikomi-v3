#!/usr/bin/env python3
from pathlib import Path

p = Path("src/main.jsx")
s = p.read_text(encoding="utf-8")

old = """<h2>番組表CSV取り込み</h2>
  <p className="help">CSV形式：date,time,title,station,genre,episodeTitle</p>
  <form onSubmit={importGuideCsv}>
    <textarea
      value={guideCsv}
      onChange={e=>setGuideCsv(e.target.value)}
      placeholder={'date,time,title,station,genre,episodeTitle\\n2026-06-26,20:00,それSnow Manにやらせて下さい,TBS系,バラエティ,6/26(金)放送回'}
    />
    <button className="primary">番組表を取り込む</button>
  </form>"""

new = """<h2>番組表CSV取り込み</h2>
  <p className="help">CSV形式：date,time,title,station,genre,episodeTitle</p>

  <label>CSVファイルを選択</label>
  <input
    type="file"
    accept=".csv,text/csv"
    onChange={async e=>{
      const file = e.target.files?.[0];
      if(!file) return;
      const text = await file.text();
      setGuideCsv(text);
    }}
  />

  <form onSubmit={importGuideCsv}>
    <label>またはCSVを貼り付け</label>
    <textarea
      value={guideCsv}
      onChange={e=>setGuideCsv(e.target.value)}
      placeholder={'date,time,title,station,genre,episodeTitle\\n2026-06-26,20:00,それSnow Manにやらせて下さい,TBS系,バラエティ,6/26(金)放送回'}
    />
    <button className="primary">番組表を取り込む</button>
  </form>"""

if old not in s:
    print("対象箇所が見つかりませんでした。すでに変更済みか、コードが想定と違います。")
else:
    s = s.replace(old, new)
    p.write_text(s, encoding="utf-8")
    print("OK: CSVファイル選択ボタンを追加しました。")
