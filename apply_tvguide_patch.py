#!/usr/bin/env python3
from pathlib import Path

p = Path("src/main.jsx")
s = p.read_text(encoding="utf-8")

helper = """
const GUIDE_STORAGE_KEY = 'tv_program_guide_v1';

function parseGuideCsv(text){
  const lines = text.trim().split(/\\r?\\n/).filter(Boolean);
  const body = lines[0]?.includes('date') ? lines.slice(1) : lines;
  return body.map((line, idx) => {
    const cols = line.split(',').map(v => v.trim().replace(/^"|"$|^'|'$/g, ''));
    const [date, time, title, station, genre='未分類', episodeTitle=''] = cols;
    if(!date || !time || !title || !station) return null;
    const id = `import_${slug(title)}_${idx}`;
    return {
      id,
      title,
      station,
      genre,
      episodes: [{
        id: `episode_${slug(title)}_${date}_${time.replace(':','')}`,
        program_id: id,
        date,
        time,
        title: episodeTitle || `${dateLabel(date)}放送回`
      }]
    };
  }).filter(Boolean);
}

function loadImportedGuide(){
  try {
    const raw = localStorage.getItem(GUIDE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function mergePrograms(basePrograms, importedPrograms){
  const map = new Map();
  [...basePrograms, ...importedPrograms].forEach(p => {
    const key = `${p.title}_${p.station}`;
    if(!map.has(key)){
      map.set(key, { ...p, episodes: [...p.episodes] });
    }else{
      const current = map.get(key);
      current.episodes.push(...p.episodes);
      current.episodes = current.episodes
        .filter((e, i, arr) => arr.findIndex(x => x.id === e.id) === i)
        .sort((a,b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
    }
  });
  return [...map.values()];
}
"""

if "const GUIDE_STORAGE_KEY" not in s:
    s = s.replace("function buildPrograms(){", helper + "\nfunction buildPrograms(){")

old_return = """return [...map.values()].map(p => ({
    ...p,
    episodes: p.episodes.sort((a,b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
  }));"""
new_return = """const basePrograms = [...map.values()].map(p => ({
    ...p,
    episodes: p.episodes.sort((a,b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
  }));
  return mergePrograms(basePrograms, loadImportedGuide());"""
s = s.replace(old_return, new_return)

s = s.replace(
    "const [revealed, setRevealed] = React.useState({});",
    "const [revealed, setRevealed] = React.useState({});\n  const [guideCsv, setGuideCsv] = React.useState('');"
)

fn = """  function importGuideCsv(e){
    e.preventDefault();
    const imported = parseGuideCsv(guideCsv);
    if(!imported.length){
      alert('取り込める番組がありません。CSV形式を確認してください。');
      return;
    }
    localStorage.setItem(GUIDE_STORAGE_KEY, JSON.stringify(imported));
    setPrograms(buildPrograms());
    setGuideCsv('');
    alert(`${imported.length}件の番組表を取り込みました。`);
  }

  function clearGuideCsv(){
    if(!confirm('取り込んだ番組表を削除しますか？')) return;
    localStorage.removeItem(GUIDE_STORAGE_KEY);
    setPrograms(buildPrograms());
  }

"""
if "function importGuideCsv" not in s:
    s = s.replace("  function addProgram(e){", fn + "  function addProgram(e){")

old_ui = """<section className="card">
              <h2>番組候補に追加</h2>
              <form onSubmit={addProgram}>"""
new_ui = """<section className="card">
              <h2>番組表CSV取り込み</h2>
              <p className="help">正確な番組表をCSVで取り込みます。形式：date,time,title,station,genre,episodeTitle</p>
              <form onSubmit={importGuideCsv}>
                <textarea
                  value={guideCsv}
                  onChange={e=>setGuideCsv(e.target.value)}
                  placeholder={'date,time,title,station,genre,episodeTitle\\n2026-06-26,20:00,それSnow Manにやらせて下さい,TBS系,バラエティ,6/26(金)放送回'}
                />
                <button className="primary">番組表を取り込む</button>
              </form>
              <button className="secondary" onClick={clearGuideCsv}>取り込み番組表を削除</button>
            </section>
            <section className="card">
              <h2>番組候補に追加</h2>
              <form onSubmit={addProgram}>"""
s = s.replace(old_ui, new_ui)

p.write_text(s, encoding="utf-8")
print("番組表CSV取り込み機能を追加しました。")
