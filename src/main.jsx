import React from 'react';
import { createRoot } from 'react-dom/client';
import { Tv, Search, Heart, Trophy, MessageCircle } from 'lucide-react';
import { supabase, hasSupabase } from './lib/supabase';
import './style.css';

const WEEKLY = [
  [0,'07:30','シューイチ','日本テレビ系','情報'],[0,'19:00','ザ！鉄腕！DASH!!','日本テレビ系','バラエティ'],[0,'19:58','世界の果てまでイッテQ！','日本テレビ系','バラエティ'],[0,'21:00','日曜劇場','TBS系','ドラマ'],[0,'22:00','Mr.サンデー','フジテレビ系','報道・情報'],[0,'23:00','情熱大陸','MBS/TBS系','ドキュメンタリー'],
  [1,'19:00','有吉ゼミ','日本テレビ系','バラエティ'],[1,'20:00','世界まる見え！テレビ特捜部','日本テレビ系','バラエティ'],[1,'21:00','しゃべくり007','日本テレビ系','バラエティ'],[1,'21:54','報道ステーション','テレビ朝日系','報道'],[1,'23:00','news zero','日本テレビ系','報道'],
  [2,'20:55','マツコの知らない世界','TBS系','バラエティ'],[2,'21:00','ザ！世界仰天ニュース','日本テレビ系','バラエティ'],[2,'21:54','報道ステーション','テレビ朝日系','報道'],[2,'23:00','news zero','日本テレビ系','報道'],
  [3,'19:00','世界くらべてみたら','TBS系','バラエティ'],[3,'20:00','有吉の壁','日本テレビ系','バラエティ'],[3,'21:00','上田と女が吠える夜','日本テレビ系','バラエティ'],[3,'22:00','水曜日のダウンタウン','TBS系','バラエティ'],[3,'21:54','報道ステーション','テレビ朝日系','報道'],[3,'23:00','news zero','日本テレビ系','報道'],
  [4,'19:00','プレバト!!','MBS/TBS系','バラエティ'],[4,'19:00','突破ファイル','日本テレビ系','バラエティ'],[4,'22:00','櫻井・有吉THE夜会','TBS系','バラエティ'],[4,'21:54','報道ステーション','テレビ朝日系','報道'],[4,'23:00','news zero','日本テレビ系','報道'],
  [5,'20:00','それSnow Manにやらせて下さい','TBS系','バラエティ'],[5,'20:00','沸騰ワード10','日本テレビ系','バラエティ'],[5,'23:00','A-Studio+','TBS系','トーク'],[5,'21:54','報道ステーション','テレビ朝日系','報道'],[5,'23:30','news zero','日本テレビ系','報道'],
  [6,'19:00','嗚呼!!みんなの動物園','日本テレビ系','バラエティ'],[6,'21:00','出没！アド街ック天国','テレビ東京系','情報・街'],[6,'22:00','情報7daysニュースキャスター','TBS系','報道・情報']
];

const TAGS = ['神回','笑った','泣けた','考えさせられた','演出が良い','出演者が良い','惜しい'];
const WD = ['日','月','火','水','木','金','土'];
const slug = s => encodeURIComponent(s).replaceAll('%','').slice(0,28);
const ymd = d => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`; };
const dateLabel = s => { const d = new Date(`${s}T00:00:00`); return `${d.getMonth()+1}/${d.getDate()}(${WD[d.getDay()]})`; };
const stars = n => '★★★★★'.slice(0,Number(n||0)) + '☆☆☆☆☆'.slice(0,5-Number(n||0));
const avg = list => list.length ? list.reduce((sum, r) => sum + Number(r.rating), 0) / list.length : 0;
const fmt = n => n ? n.toFixed(1) : '-';
const getLS = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } };
const setLS = (key, value) => localStorage.setItem(key, JSON.stringify(value));


const GUIDE_STORAGE_KEY = 'tv_program_guide_v1';

function parseGuideCsv(text){
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
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

function buildPrograms(){
  const today = new Date(); today.setHours(0,0,0,0);
  const map = new Map();
  for(let i=-7; i<=7; i++){
    const d = new Date(today); d.setDate(today.getDate()+i);
    const date = ymd(d);
    WEEKLY.filter(row => row[0] === d.getDay()).forEach(([dow,time,title,station,genre]) => {
      const id = `p_${slug(title)}`;
      if(!map.has(id)) map.set(id, { id, title, station, genre, episodes: [] });
      map.get(id).episodes.push({ id:`e_${slug(title)}_${date}`, program_id:id, date, time, title:`${dateLabel(date)}放送回` });
    });
  }
  const basePrograms = [...map.values()].map(p => ({ ...p, episodes:p.episodes.sort((a,b)=>`${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)) }));
  return mergePrograms(basePrograms, loadImportedGuide());
}

function App(){
  const [view,setView] = React.useState('schedule');
  const [mode,setMode] = React.useState('today');
  const [programs,setPrograms] = React.useState(buildPrograms());
  const [reviews,setReviews] = React.useState([]);
  const [liked,setLiked] = React.useState(getLS('tv_liked_v3', []));
  const [selected,setSelected] = React.useState(null);
  const [search,setSearch] = React.useState('');
  const [filter,setFilter] = React.useState('');
  const [revealed,setRevealed] = React.useState({});
  const [guideCsv,setGuideCsv] = React.useState('');

  React.useEffect(()=>{ loadReviews(); },[]);
  React.useEffect(()=>{ setLS('tv_liked_v3', liked); },[liked]);

  async function loadReviews(){
    if(hasSupabase){
      const { data, error } = await supabase.from('reviews').select('*').order('created_at', { ascending:false });
      if(!error) setReviews(data || []);
    } else setReviews(getLS('tv_reviews_v3', []));
  }
  function saveLocal(next){ setReviews(next); setLS('tv_reviews_v3', next); }
  const allEpisodes = () => programs.flatMap(p => p.episodes.map(e => ({ program:p, episode:e }))).sort((a,b)=>`${a.episode.date}${a.episode.time}`.localeCompare(`${b.episode.date}${b.episode.time}`));
  function isOnAir(e){ const now = new Date(); const start = new Date(`${e.date}T${e.time}:00`); const end = new Date(start); end.setMinutes(end.getMinutes()+60); return now>=start && now<=end; }
  function scheduleEpisodes(){ const today = ymd(new Date()); if(mode==='now') return allEpisodes().filter(x=>isOnAir(x.episode)); if(mode==='today') return allEpisodes().filter(x=>x.episode.date===today); return allEpisodes(); }
  const episodeReviews = (pid,eid) => reviews.filter(r => r.program_id===pid && r.episode_id===eid);
  const programReviews = pid => reviews.filter(r => r.program_id===pid);

  function selectProgram(program, episode=null){ const today=ymd(new Date()); const ep=episode || program.episodes.find(e=>e.date>=today) || program.episodes.at(-1); setSelected({program, episode:ep}); setSearch(program.title); setView('post'); }
  async function submitReview(form){
    if(!selected) return alert('先に番組を選択してください。');
    if(!form.comment.trim()) return alert('感想を入力してください。');
    const payload = { program_id:selected.program.id, episode_id:selected.episode.id, rating:Number(form.rating), tag:form.tag, spoiler:form.spoiler==='true', comment:form.comment.trim(), likes:0, created_at:new Date().toISOString() };
    if(hasSupabase){ const { error } = await supabase.from('reviews').insert(payload); if(error) return alert('投稿に失敗しました。'); await loadReviews(); }
    else saveLocal([{...payload, id:`r_${Date.now()}`}, ...reviews]);
    setView('reviews');
  }
  async function toggleLike(review){
    const already = liked.includes(review.id); const nextLikes = Math.max(0,(review.likes||0)+(already?-1:1));
    setLiked(already ? liked.filter(id=>id!==review.id) : [...liked, review.id]);
    if(hasSupabase){ await supabase.from('reviews').update({likes:nextLikes}).eq('id',review.id); await loadReviews(); }
    else saveLocal(reviews.map(r=>r.id===review.id?{...r,likes:nextLikes}:r));
  }
  function importGuideCsv(e){
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

  function addProgram(e){
    e.preventDefault(); const fd = new FormData(e.currentTarget); const title=fd.get('title').trim(); const station=fd.get('station').trim();
    if(!title || !station) return alert('番組名と系列・局を入力してください。');
    const date=ymd(new Date()); const id=`custom_${Date.now()}`;
    setPrograms([...programs, { id, title, station, genre:fd.get('genre')||'未分類', episodes:[{ id:`episode_${Date.now()}`, program_id:id, date, time:fd.get('time')||'20:00', title:fd.get('episodeTitle') || `${dateLabel(date)}放送回` }] }]);
    e.currentTarget.reset();
  }
  const ranking = React.useMemo(()=>{
    const rows=[]; programs.forEach(p=>p.episodes.forEach(e=>{ const list=episodeReviews(p.id,e.id); if(list.length) rows.push({program:p, episode:e, count:list.length, average:avg(list), score:avg(list)*list.length}); })); return rows;
  },[programs,reviews]);
  const filteredReviews = reviews.filter(r => { const p=programs.find(x=>x.id===r.program_id); const q=filter.toLowerCase(); return !q || p?.title.toLowerCase().includes(q) || p?.station.toLowerCase().includes(q) || r.tag.toLowerCase().includes(q); });

  return <>
    <header className="header"><div className="brand"><Tv/><div><b>TV口コミログ</b><span>{hasSupabase?'Supabase接続中':'localStorage版'}</span></div></div></header>
    <main className="container">
      <section className="hero"><h1>テレビ番組の「神回」を記録する。</h1><p>番組候補から選んで、放送回ごとに口コミ・平均評価・いいね・ランキングを集計します。</p></section>
      <nav className="tabs">{[['schedule','番組表'],['post','口コミを書く'],['reviews','最新口コミ'],['ranking','ランキング'],['admin','番組追加']].map(([k,l])=><button key={k} className={view===k?'active':''} onClick={()=>setView(k)}>{l}</button>)}</nav>
      {view==='schedule' && <div className="grid"><section className="card"><div className="head"><h2>番組表</h2><span>前後1週間・主要全国ネット番組</span></div><div className="tabs small">{[['now','📺 放送中'],['today','📅 今日'],['week','🗓 前後1週間']].map(([k,l])=><button key={k} className={mode===k?'active':''} onClick={()=>setMode(k)}>{l}</button>)}</div><EpisodeList mode={mode} items={scheduleEpisodes()} episodeReviews={episodeReviews} programReviews={programReviews} onSelect={selectProgram}/></section><aside><Ranking title="神回ランキング" rows={[...ranking].sort((a,b)=>b.average-a.average).slice(0,5)}/><Ranking title="口コミ数ランキング" rows={[...ranking].sort((a,b)=>b.count-a.count).slice(0,5)} type="count"/></aside></div>}
      {view==='post' && <div className="grid"><section className="card"><h2>口コミを書く</h2>{selected && <div className="selected">選択中：{selected.program.title} ／ {selected.episode.date} {selected.episode.time}</div>}<label>番組検索</label><div className="search"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="例：水曜日、情熱大陸、報道"/></div>{search && <div className="suggest">{programs.filter(p=>`${p.title}${p.station}${p.genre}`.toLowerCase().includes(search.toLowerCase())).slice(0,8).map(p=><button key={p.id} onClick={()=>selectProgram(p)}>{p.title}<span>{p.station} ／ {p.genre}</span></button>)}</div>}<ReviewForm selected={selected} setSelected={setSelected} onSubmit={submitReview}/></section><aside className="card"><h2>候補番組</h2>{programs.slice(0,12).map(p=><ProgramCard key={p.id} program={p} average={avg(programReviews(p.id))} count={programReviews(p.id).length} onClick={()=>selectProgram(p)}/>)}</aside></div>}
      {view==='reviews' && <section className="card"><div className="head"><h2>最新口コミ</h2><span>ネタバレはタップで表示</span></div><input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="番組名・局名・タグで検索"/>{filteredReviews.length ? filteredReviews.map(r=><Review key={r.id} review={r} programs={programs} liked={liked.includes(r.id)} onLike={()=>toggleLike(r)} revealed={revealed[r.id]} onReveal={()=>setRevealed({...revealed,[r.id]:true})}/>) : <Empty text="まだ口コミがありません。"/>}</section>}
      {view==='ranking' && <div className="grid"><Ranking title="神回ランキング" rows={[...ranking].sort((a,b)=>b.average-a.average).slice(0,10)}/><Ranking title="急上昇ランキング" rows={[...ranking].sort((a,b)=>b.score-a.score).slice(0,10)} type="rising"/><Ranking title="口コミ数ランキング" rows={[...ranking].sort((a,b)=>b.count-a.count).slice(0,10)} type="count"/><section className="card"><h2>いいねランキング</h2>{[...reviews].sort((a,b)=>(b.likes||0)-(a.likes||0)).slice(0,10).map((r,i)=><ReviewRank key={r.id} review={r} index={i} programs={programs}/>)}{!reviews.length && <Empty text="まだランキングはありません。"/>}</section></div>}
      {view==='admin' && <div className="grid"><section className="card">
  <h2>番組表CSV取り込み</h2>
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
      placeholder={'date,time,title,station,genre,episodeTitle\n2026-06-26,20:00,それSnow Manにやらせて下さい,TBS系,バラエティ,6/26(金)放送回'}
    />
    <button className="primary">番組表を取り込む</button>
  </form>
  <button className="secondary" onClick={clearGuideCsv}>取り込み番組表を削除</button>
</section><section className="card"><h2>番組候補に追加</h2><form onSubmit={addProgram}><label>番組名</label><input name="title"/><label>系列・局</label><input name="station"/><label>ジャンル</label><input name="genre"/><label>放送時刻</label><input name="time" placeholder="20:00"/><label>放送回タイトル</label><input name="episodeTitle"/><button className="primary">追加</button></form></section><section className="card"><h2>番組マスター</h2>{programs.map(p=><ProgramCard key={p.id} program={p} average={avg(programReviews(p.id))} count={programReviews(p.id).length}/>)}</section></div>}
    </main>
  </>;
}
function EpisodeList({items,mode,episodeReviews,programReviews,onSelect}){ let last=''; if(!items.length) return <Empty text="該当する番組がありません。「今日」または「前後1週間」を見てください。"/>; return items.map(({program,episode})=>{ const show=mode==='week' && last!==episode.date; last=episode.date; return <React.Fragment key={episode.id}>{show && <h3 className="datehead">{dateLabel(episode.date)}</h3>}<ProgramCard program={program} episode={episode} average={avg(episodeReviews(program.id,episode.id))} count={episodeReviews(program.id,episode.id).length} programAverage={avg(programReviews(program.id))} onClick={()=>onSelect(program,episode)}/></React.Fragment>; }); }
function ProgramCard({program,episode,average,count,programAverage,onClick}){ return <article className="program" onClick={onClick}><h3>{episode ? `${episode.time}　` : ''}{program.title}</h3><p>{program.station} ／ {program.genre}{episode ? ` ／ ${episode.title}` : ''}</p><div className="badges"><span>⭐ {fmt(average)}</span><span><MessageCircle size={13}/> {count}</span>{programAverage!==undefined && <span>番組平均 {fmt(programAverage)}</span>}</div></article>; }
function ReviewForm({selected,setSelected,onSubmit}){ const [form,setForm]=React.useState({rating:'5',tag:'神回',spoiler:'false',comment:''}); if(!selected) return <Empty text="先に番組を選んでください。"/>; return <form onSubmit={e=>{e.preventDefault(); onSubmit(form); setForm({...form,comment:''});}}><label>放送回</label><select value={selected.episode.id} onChange={e=>setSelected({...selected,episode:selected.program.episodes.find(x=>x.id===e.target.value)})}>{selected.program.episodes.map(e=><option key={e.id} value={e.id}>{e.date} {e.time} {e.title}</option>)}</select><div className="formgrid"><div><label>評価</label><select value={form.rating} onChange={e=>setForm({...form,rating:e.target.value})}>{[5,4,3,2,1].map(n=><option key={n} value={n}>{stars(n)}</option>)}</select></div><div><label>タグ</label><select value={form.tag} onChange={e=>setForm({...form,tag:e.target.value})}>{TAGS.map(t=><option key={t}>{t}</option>)}</select></div></div><label>ネタバレ</label><select value={form.spoiler} onChange={e=>setForm({...form,spoiler:e.target.value})}><option value="false">ネタバレなし</option><option value="true">ネタバレあり</option></select><label>感想</label><textarea value={form.comment} onChange={e=>setForm({...form,comment:e.target.value})}/><button className="primary">投稿する</button></form>; }
function Review({review,programs,liked,onLike,revealed,onReveal}){ const p=programs.find(x=>x.id===review.program_id); const e=p?.episodes.find(x=>x.id===review.episode_id); return <article className="review"><div className="reviewhead"><div><b>{p?.title || '不明な番組'}</b><p>{p?.station} ／ {e?.date} {e?.time} {e?.title}</p></div><strong className="stars">{stars(review.rating)}</strong></div><div className="badges"><span>#{review.tag}</span><span>{review.spoiler?'ネタバレあり':'ネタバレなし'}</span></div><p className={review.spoiler && !revealed ? 'blur' : ''} onClick={onReveal}>{review.comment}</p><button className={liked?'like liked':'like'} onClick={onLike}><Heart size={16}/> {review.likes || 0}</button></article>; }
function Ranking({title,rows,type}){ return <section className="card"><h2><Trophy size={18}/> {title}</h2>{rows.length ? rows.map((r,i)=><div className="rankitem" key={`${r.program.id}_${r.episode.id}`}><b>{i+1}</b><div><strong>{r.program.title}</strong><p>{r.episode.date} {r.episode.time} ／ {type==='count'?`口コミ ${r.count}`:type==='rising'?`勢い ${r.score.toFixed(1)}`:`平均 ${fmt(r.average)}`} ／ {r.count}件</p></div></div>) : <Empty text="まだランキングはありません。"/>}</section>; }
function ReviewRank({review,index,programs}){ const p=programs.find(x=>x.id===review.program_id); return <div className="rankitem"><b>{index+1}</b><div><strong>{p?.title}</strong><p>❤️ {review.likes || 0} ／ {stars(review.rating)}</p></div></div>; }
function Empty({text}){ return <div className="empty">{text}</div>; }
createRoot(document.getElementById('root')).render(<App/>);
