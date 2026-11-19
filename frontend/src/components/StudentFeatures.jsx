import { useEffect, useId, useMemo, useState } from 'react';
import {
  BookOpen,
  Bug,
  Award,
  Flame,
  GitBranch,
  GraduationCap,
  Lightbulb,
  Map,
  MessageSquare,
  Package,
  Repeat2,
  Star,
  Trophy,
} from 'lucide-react';
import {
  getLearningSections,
  purchaseAvatarItem,
  saveGameReview,
  saveLessonProgress,
  submitLearningExam,
  updateStudentProfile,
} from '../services/api';
import './StudentFeatures.css';

const animalNames = { fox: 'Zorro astuto', panda: 'Oso panda', penguin: 'Pingüino explorer', cat: 'Gato tech' };
const animalIcons = { fox: '🦊', panda: '🐼', penguin: '🐧', cat: '🐱' };
const emptyCatalog = [];
const getCatalogPrice = (item) => {
  const rawPrice = item?.price ?? item?.cost ?? item?.points ?? item?.puntos ?? item?.costo;
  const price = Number(rawPrice);
  return rawPrice !== null && rawPrice !== undefined && Number.isFinite(price) && price >= 0 ? price : null;
};
const reviewGames = [
  ['logic-game', 'Algoritmos del explorador'],
  ['sequence-game', 'Red de servidores'],
  ['patch-cable', 'Patch Cable'],
  ['stack-balancer', 'Stack Balancer'],
  ['bug-game', 'Clínica de código'],
];
const reviewTags = ['¡Súper divertido!', 'Muy difícil', 'Aprendí mucho', 'Quiero más niveles', 'Me gustó el reto'];

export function AnimalAvatar({ pet = 'fox', equippedItems = {}, className = '' }) {
  const accessories = new Set(Object.values(equippedItems));
  const gradientId = `fur-${useId().replace(/:/g, '')}`;
  const palette = {
    fox: { fur: '#f39b45', light: '#fff0d9', dark: '#7d482c' },
    panda: { fur: '#f4f7fb', light: '#ffffff', dark: '#35465b' },
    penguin: { fur: '#67a8dc', light: '#f8fcff', dark: '#294b6a' },
    cat: { fur: '#9b8ad3', light: '#f7eafd', dark: '#514675' },
  }[pet] || { fur: '#f39b45', light: '#fff0d9', dark: '#7d482c' };
  const isPanda = pet === 'panda';
  const isPenguin = pet === 'penguin';
  const isFox = pet === 'fox';
  return <span className={`kidcode-animal ${className}`} role="img" aria-label={`${animalNames[pet] || animalNames.fox}${accessories.length ? ` con ${accessories.length} accesorios` : ''}`}>
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <defs><linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="1"><stop stopColor={palette.fur} /><stop offset="1" stopColor={isPanda ? '#d9e3ed' : palette.fur} /></linearGradient></defs>
      {isPanda ? <><circle cx="31" cy="35" r="18" fill={palette.dark} /><circle cx="89" cy="35" r="18" fill={palette.dark} /></>
        : isPenguin ? <><ellipse cx="60" cy="74" rx="43" ry="38" fill="#466f9b" /><ellipse cx="60" cy="70" rx="35" ry="39" fill={`url(#${gradientId})`} /></>
          : <><path d={isFox ? 'M27 48 20 9 51 31ZM93 48 100 9 69 31Z' : 'M25 48 26 12 53 34ZM95 48 94 12 67 34Z'} fill={`url(#${gradientId})`} stroke={palette.dark} strokeWidth="3" strokeLinejoin="round" /><path d="M29 34 27 18 42 32ZM91 34 93 18 78 32Z" fill={palette.light} /></>}
      {accessories.has('hoodie') && <path d="M23 91q8-11 20-12h34q12 1 20 12l12 29H11Z" fill="#6488c8" stroke="#405f99" strokeWidth="3" strokeLinejoin="round" />}
      <ellipse cx="60" cy="65" rx="43" ry="39" fill={`url(#${gradientId})`} stroke={palette.dark} strokeWidth="3" />
      {isPanda && <><ellipse cx="44" cy="58" rx="11" ry="15" fill={palette.dark} transform="rotate(32 44 58)" /><ellipse cx="76" cy="58" rx="11" ry="15" fill={palette.dark} transform="rotate(-32 76 58)" /></>}
      <ellipse cx="60" cy="78" rx="25" ry="18" fill={palette.light} />
      <circle cx="46" cy="58" r="4.3" fill={palette.dark} /><circle cx="74" cy="58" r="4.3" fill={palette.dark} />
      {isPenguin ? <path d="m52 68 8 7 8-7Z" fill="#f3bd4d" stroke="#d69432" strokeWidth="2" strokeLinejoin="round" />
        : <><ellipse cx="60" cy="76" rx="5" ry="3.5" fill={isFox ? '#56364a' : palette.dark} /><path d="M60 79q-7 9-13 2m13-2q7 9 13 2" fill="none" stroke={palette.dark} strokeWidth="2.4" strokeLinecap="round" /></>}
      {isFox && <><path d="M23 77q-9-8-16 0 8 2 11 8m79-8q9-8 16 0-8 2-11 8" fill={palette.light} /><path d="M31 88h10m48 0h-10" stroke={palette.dark} strokeWidth="1.5" strokeLinecap="round" /></>}
      {pet === 'cat' && <><path d="M39 79 15 73m25 11-27 4m68-9 24-6M82 84l27 4" stroke={palette.dark} strokeWidth="1.7" strokeLinecap="round" /></>}
      {isPanda && <path d="M55 91q5 4 10 0" fill="none" stroke={palette.dark} strokeWidth="2" strokeLinecap="round" />}
      {accessories.has('cap') && <g className="avatar-layer avatar-layer-cap"><path d="M31 38q3-24 29-25 26 1 29 25v6H31Z" fill="#e95769" stroke="#a93849" strokeWidth="3" /><path d="M27 42q24-9 67 0-4 9-33 10-25-1-34-10Z" fill="#ff7885" stroke="#a93849" strokeWidth="3" /></g>}
      {accessories.has('goggles') && <g className="avatar-layer avatar-layer-goggles" fill="none" stroke="#3b536f" strokeWidth="4"><path d="M22 58h9m58 0h9" /><rect x="31" y="49" width="25" height="19" rx="7" fill="#8fe0f2" fillOpacity=".72" /><rect x="64" y="49" width="25" height="19" rx="7" fill="#8fe0f2" fillOpacity=".72" /><path d="M56 57q4-4 8 0" /></g>}
      {accessories.has('laptop') && <g className="avatar-layer avatar-layer-laptop"><rect x="77" y="83" width="30" height="21" rx="3" fill="#5277b8" stroke="#344e7d" strokeWidth="2" /><rect x="81" y="87" width="22" height="13" rx="1" fill="#bceaff" /><path d="m73 106 39 0-4 5H77Z" fill="#8098c7" stroke="#344e7d" strokeWidth="2" strokeLinejoin="round" /></g>}
      {accessories.has('medal') && <g className="avatar-layer avatar-layer-medal"><path d="m48 88 12 9 12-9-3 23H51Z" fill="#6385cb" /><circle cx="60" cy="91" r="9" fill="#ffd45c" stroke="#c38b24" strokeWidth="2" /><path d="m60 85 2 4 4 .5-3 3 .7 4.2-3.7-2-3.7 2 .7-4.2-3-3 4-.5Z" fill="#fff5c9" /></g>}
    </svg>
  </span>;
}

function AvatarFace({ pet = 'fox', equippedItems = {}, catalog = [] }) {
  return <AnimalAvatar pet={pet} equippedItems={equippedItems} catalog={catalog} />;
}

export function StudentProfileModal({ user, token, profile, rank, nextRank, progressValue, onClose, onSaved }) {
  const [nickname, setNickname] = useState(profile.nickname || '');
  const [pet, setPet] = useState(profile.pet || 'fox');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const pets = profile.pets || [];

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await updateStudentProfile(token, { nickname, pet });
      if (response.error) throw new Error(response.error);
      onSaved({ ...profile, nickname: nickname.trim(), pet });
    } catch (requestError) {
      setError(requestError.message || 'No se pudo actualizar tu perfil.');
    } finally {
      setSaving(false);
    }
  };

  return <div className="feature-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="feature-modal profile-modal" role="dialog" aria-modal="true" aria-labelledby="student-profile-title">
      <button className="feature-close" type="button" onClick={onClose} aria-label="Cerrar perfil">×</button>
      <div className="profile-hero"><div className="profile-avatar"><AvatarFace pet={pet} equippedItems={profile.equippedItems} catalog={profile.catalog} /></div><div><span className="feature-kicker">TU PERFIL KIDCODE</span><h2 id="student-profile-title">{nickname || user.name}</h2><p>{user.name} · {rank.icon} {rank.title}</p></div></div>
      <form onSubmit={save} className="profile-form">
        <label className="feature-label" htmlFor="student-nickname">Apodo</label>
        <input id="student-nickname" maxLength="24" value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="¿Cómo te llamamos?" />
        <span className="feature-label">Elige tu mascota</span>
        <div className="pet-picker">{pets.filter((item) => item.unlocked).map((item) => <button type="button" key={item.id} className={`pet-choice ${pet === item.id ? 'selected' : ''}`} onClick={() => setPet(item.id)}><span>{item.icon}</span><small>{item.name}</small></button>)}</div>
        <small>Desbloquea más personajes en el vestidor.</small>
        <div className="profile-rank-progress"><div className="profile-rank-copy"><strong>{nextRank ? `Camino a ${nextRank.title}` : '¡Rango máximo alcanzado!'}</strong><span>{nextRank ? `${progressValue.current}/${progressValue.required} niveles · faltan ${Math.max(0, progressValue.required - progressValue.current)}` : 'Explorador de leyenda'}</span></div><div className="feature-progress-track"><i style={{ width: `${progressValue.percent}%` }} /></div></div>
        <div className="profile-stat-grid"><div><strong><Star aria-hidden="true" /> {profile.points || 0}</strong><span>Puntos disponibles</span></div><div><strong><Trophy aria-hidden="true" /> {profile.completedLevels || 0}</strong><span>Niveles completados</span></div><div><strong><Flame aria-hidden="true" /> {profile.activeDays || 0}</strong><span>Racha de días</span></div></div>
        {error && <div className="alert error" role="alert">{error}</div>}
        <button className="primary-btn full" disabled={saving}>{saving ? 'Guardando…' : 'Guardar mi perfil'}</button>
      </form>
    </section>
  </div>;
}

export function AvatarStore({ token, profile, onProfileChange }) {
  const [pendingPet, setPendingPet] = useState(null);
  const [pendingNickname, setPendingNickname] = useState(null);
  const [activeTab, setActiveTab] = useState('Personaje');
  const pet = pendingPet || profile.pet || 'fox';
  const nickname = pendingNickname ?? profile.nickname ?? '';
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const owned = new Set(profile.ownedItems || []);
  const catalog = profile.catalog || emptyCatalog;

  const saveIdentity = async () => {
    setBusy('profile');
    setError('');
    setMessage('');
    try {
      const response = await updateStudentProfile(token, { pet, nickname });
      if (response.error) throw new Error(response.error);
      onProfileChange({ ...profile, pet, nickname: nickname.trim() });
      setPendingPet(null);
      setPendingNickname(null);
      setMessage('¡Tu mascota y apodo ya están guardados!');
    } catch (requestError) {
      setError(requestError.message || 'No pudimos guardar tu avatar.');
    } finally {
      setBusy('');
    }
  };

  const buy = async (item) => {
    setBusy(item.id);
    setError('');
    setMessage('');
    try {
      const response = await purchaseAvatarItem(token, item.id);
      if (response.error) throw new Error(response.error);
      onProfileChange({
        ...profile,
        points: response.points,
        ownedItems: response.ownedItems,
        pets: item.pet
          ? (profile.pets || []).map((availablePet) => availablePet.id === item.pet ? { ...availablePet, unlocked: true } : availablePet)
          : profile.pets,
      });
      if (item.pet) setPendingPet(item.pet);
      setMessage(`¡${item.name} ya es tuyo!`);
    } catch (requestError) {
      setError(requestError.message || 'No se pudo comprar el accesorio.');
    } finally {
      setBusy('');
    }
  };

  const equip = async (item) => {
    const equippedItems = { ...(profile.equippedItems || {}) };
    if (equippedItems[item.category] === item.id) delete equippedItems[item.category];
    else equippedItems[item.category] = item.id;
    setBusy(item.id);
    setError('');
    setMessage('');
    try {
      const response = await updateStudentProfile(token, { equippedItems });
      if (response.error) throw new Error(response.error);
      onProfileChange({ ...profile, equippedItems });
      setMessage(equippedItems[item.category] === item.id
        ? `${item.name} equipado. ¡Tu mascota tiene nuevo estilo!`
        : `${item.name} retirado del avatar.`);
    } catch (requestError) {
      setError(requestError.message || 'No se pudo equipar el accesorio.');
    } finally {
      setBusy('');
    }
  };

  const groupedCatalog = useMemo(() => catalog.filter((item) => item.category !== 'Personaje').reduce((groups, item) => {
    groups[item.category] = [...(groups[item.category] || []), item];
    return groups;
  }, {}), [catalog]);

  return <section className="feature-page">
    <div className="feature-page-heading"><div><span className="feature-kicker">MI ESPACIO · PERSONALIZACIÓN</span><h1>Tu avatar programador</h1><p>Elige una mascota y gana puntos jugando para desbloquear accesorios.</p></div><div className="points-wallet"><Star aria-hidden="true" /> {profile.points || 0}<small>puntos</small></div></div>
    <div className="avatar-workshop panel">
      <div className="workshop-pet"><div className="workshop-orbit"><AvatarFace pet={pet} equippedItems={profile.equippedItems} catalog={catalog} /></div><strong>{animalNames[pet]}</strong><span>{nickname || 'Tu próxima identidad coder'}</span></div>
      <div className="workshop-controls">
        <div className="avatar-tabs" role="tablist" aria-label="Personalización del avatar">
          {['Personaje', 'Accesorios'].map((tab) => <button type="button" role="tab" aria-selected={activeTab === tab} className={activeTab === tab ? 'active' : ''} key={tab} onClick={() => setActiveTab(tab)}>{tab}</button>)}
        </div>
        {activeTab === 'Personaje' ? <>
          <label className="feature-label" htmlFor="shop-nickname">Tu apodo</label>
          <input id="shop-nickname" maxLength="24" value={nickname} onChange={(event) => setPendingNickname(event.target.value)} placeholder="Pixel, Kiko, CodeKid..." />
          <div className="shop-grid character-grid">{(profile.pets || []).map((item) => {
            const isOwned = item.unlocked || owned.has(item.itemId);
            const isSelected = pet === item.id;
            const catalogItem = item.itemId ? catalog.find((entry) => entry.id === item.itemId) : null;
            const price = getCatalogPrice(item) ?? getCatalogPrice(catalogItem);
            const isAffordable = price !== null && Number(profile.points) >= price;
            const pointsMissing = price === null ? null : Math.max(0, price - Number(profile.points || 0));
            return <article className={`shop-item character-item ${isSelected ? 'selected' : ''} ${isOwned ? 'owned' : ''}`} key={item.id}>
              <div className="character-preview"><AnimalAvatar pet={item.id} equippedItems={profile.equippedItems} catalog={catalog} /></div>
              <strong>{item.name}</strong>
              <span>{isSelected ? 'En vista previa' : isOwned ? (price === 0 ? 'Gratis' : 'Desbloqueado') : price === null ? 'Precio no disponible' : <><Star aria-hidden="true" /> {price} puntos</>}</span>
              {isOwned
                ? <button className={isSelected ? 'secondary-btn' : 'primary-btn'} type="button" disabled={isSelected} onClick={() => setPendingPet(item.id)}>{isSelected ? 'Seleccionado ✓' : 'Elegir'}</button>
                : <><button className="primary-btn" type="button" title={price === null ? 'El precio no está disponible.' : pointsMissing > 0 ? `Te faltan ${pointsMissing} puntos.` : 'Desbloquear personaje'} disabled={busy === item.itemId || !isAffordable || !catalogItem} onClick={() => buy(catalogItem)}>{busy === item.itemId ? 'Comprando…' : 'Desbloquear'}</button>{pointsMissing > 0 && <small className="shop-shortage">Te faltan {pointsMissing} puntos</small>}</>}
            </article>;
          })}</div>
          <button className="primary-btn" type="button" disabled={busy === 'profile'} onClick={saveIdentity}>{busy === 'profile' ? 'Guardando…' : 'Guardar avatar'}</button>
        </> : <>
          <p className="feature-label">Elige un accesorio comprado para colocarlo sobre tu personaje.</p>
          {Object.entries(groupedCatalog).map(([category, items]) => <section key={category} className="shop-category"><h3>{category}</h3><div className="shop-grid">{items.map((item) => {
            const isOwned = owned.has(item.id);
            const isEquipped = profile.equippedItems?.[item.category] === item.id;
            const price = getCatalogPrice(item);
            const isAffordable = price !== null && Number(profile.points) >= price;
            const pointsMissing = price === null ? null : Math.max(0, price - Number(profile.points || 0));
            return <article className={`shop-item ${isOwned ? 'owned' : ''} ${isEquipped ? 'selected' : ''}`} key={item.id}>
              <div className="shop-item-icon">{item.icon}</div><strong>{item.name}</strong>
              <span>{isEquipped ? 'En uso' : isOwned ? 'Desbloqueado' : price === null ? 'Precio no disponible' : <><Star aria-hidden="true" /> {price} puntos</>}</span>
              {isOwned
                ? <button className={isEquipped ? 'secondary-btn' : 'primary-btn'} type="button" disabled={busy === item.id} onClick={() => equip(item)}>{isEquipped ? 'Quitar' : 'Probar en avatar'}</button>
                : <><button className="primary-btn" type="button" title={price === null ? 'El precio no está disponible.' : pointsMissing > 0 ? `Te faltan ${pointsMissing} puntos.` : 'Comprar accesorio'} disabled={busy === item.id || !isAffordable} onClick={() => buy(item)}>{busy === item.id ? 'Comprando…' : 'Comprar'}</button>{pointsMissing > 0 && <small className="shop-shortage">Te faltan {pointsMissing} puntos</small>}</>}
            </article>;
          })}</div></section>)}
        </>}
      </div>
    </div>
    {message && <div className="alert success" role="status">{message}</div>}
    {error && <div className="alert error" role="alert">{error}</div>}
    <div className="shop-intro"><div><h2>Personaliza tu estilo</h2><p>Los puntos se ganan al completar niveles: Fácil 30–50, Medio 70–90 y Difícil 150–200.</p></div><span><Package aria-hidden="true" /> ¡Colecciona a tu ritmo!</span></div>
  </section>;
}

export function StudentReviews({ token }) {
  const [game, setGame] = useState(reviewGames[0][0]);
  const [stars, setStars] = useState(0);
  const [tag, setTag] = useState(reviewTags[0]);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const response = await saveGameReview(token, { game_name: game, stars, tag, comment });
      if (response.error) throw new Error(response.error);
      setMessage(response.message || '¡Gracias por compartir tu opinión!');
      setComment('');
    } catch (requestError) {
      setError(requestError.message || 'No se pudo guardar tu opinión.');
    } finally {
      setBusy(false);
    }
  };

  return <section className="feature-page">
    <div className="feature-page-heading"><div><span className="feature-kicker">MI ESPACIO · TU VOZ CUENTA</span><h1>Valoraciones y opiniones</h1><p>Cuéntale a tu profe qué te gustó y qué reto quieres probar después.</p></div><span className="feature-heading-art"><MessageSquare aria-hidden="true" /></span></div>
    <form className="review-card panel" onSubmit={submit}>
      <label className="feature-label" htmlFor="review-game">¿Qué juego quieres valorar?</label>
      <select id="review-game" value={game} onChange={(event) => setGame(event.target.value)}>{reviewGames.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
      <span className="feature-label">¿Cuántas estrellas le das?</span>
      <div className="star-picker" role="radiogroup" aria-label="Calificación de 1 a 5 estrellas">{[1, 2, 3, 4, 5].map((star) => <button key={star} type="button" role="radio" aria-checked={stars === star} aria-label={`${star} estrellas`} className={star <= stars ? 'active' : ''} onClick={() => setStars(star)}>★</button>)}</div>
      <span className="feature-label">Elige una etiqueta</span>
      <div className="review-tags">{reviewTags.map((item) => <button key={item} type="button" className={tag === item ? 'selected' : ''} onClick={() => setTag(item)}>{item}</button>)}</div>
      <label className="feature-label" htmlFor="review-comment">Tu comentario (opcional)</label>
      <textarea id="review-comment" maxLength="500" rows="4" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="¿Qué aprendiste? ¿Qué cambiarías?" />
      {message && <div className="alert success" role="status">{message}</div>}
      {error && <div className="alert error" role="alert">{error}</div>}
      <button className="primary-btn" disabled={busy || stars < 1}>{busy ? 'Enviando…' : 'Enviar opinión'}</button>
      <small>Tu opinión será visible para tu docente. Puedes actualizarla cuando quieras.</small>
    </form>
  </section>;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}

function printCertificate(user, profile, section, result) {
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) throw new Error('Permite ventanas emergentes para imprimir tu certificado.');
  const displayedName = profile.nickname || user.name;
  printWindow.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Certificado KidCode</title><style>
    *{box-sizing:border-box}body{margin:0;padding:40px;background:#edf5ff;font-family:Arial,sans-serif;color:#173154}.certificate{max-width:900px;margin:auto;padding:62px;border:12px solid #78b9ed;background:#fff;border-radius:26px;text-align:center;outline:3px solid #f6c64e;outline-offset:-25px}.seal{margin:0 auto 18px;width:86px;height:86px;border-radius:50%;display:grid;place-items:center;background:#e8f4ff;color:#1765a6;font-size:43px}.eyebrow{letter-spacing:3px;color:#367bb1;font-weight:bold}.certificate h1{font-size:44px;margin:12px 0}.name{font-size:38px;color:#7454b5;margin:23px 0}.details{font-size:18px;line-height:1.9}.score{font-size:42px;font-weight:bold;color:#248456;margin:12px}.date{margin-top:30px;color:#60768d}@media print{body{padding:0;background:#fff}.certificate{min-height:90vh}}
  </style></head><body><main class="certificate"><div class="seal">✦</div><div class="eyebrow">KIDCODE NEIVA · ACADEMIA DE CÓDIGO</div><h1>Certificado de aprendizaje</h1><p>Se certifica que</p><div class="name">${escapeHtml(displayedName)}</div><p>completó y aprobó la sección</p><h2>${escapeHtml(section.title)}</h2><div class="score">${Number(result.score).toFixed(1)}%</div><div class="details">Respuestas correctas: ${result.correctAnswers} de ${result.totalQuestions}<br>Avatar: ${animalIcons[profile.pet] || animalIcons.fox}</div><div class="date">Neiva · ${new Date(result.completedAt || Date.now()).toLocaleDateString('es-CO')}<br><strong>Sello de aprendizaje KidCode Neiva</strong></div></main><script>window.onload=()=>window.print()</script></body></html>`);
  printWindow.document.close();
}

export function LearningAcademy({ token, user, profile }) {
  const [sections, setSections] = useState([]);
  const [progress, setProgress] = useState({});
  const [selectedId, setSelectedId] = useState('');
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    getLearningSections(token).then((data) => {
      if (!active) return;
      if (data.error) throw new Error(data.error);
      setSections(data.sections || []);
      setProgress(Object.fromEntries((data.progress || []).map((item) => [item.sectionId, item])));
      setSelectedId((current) => current || data.sections?.[0]?.id || '');
    }).catch((loadError) => {
      if (active) setError(loadError.message || 'No se pudo cargar la academia.');
    });
    return () => { active = false; };
  }, [token]);

  const section = sections.find((item) => item.id === selectedId);
  const sectionProgress = progress[selectedId] || { completedLessons: [], passed: false };
  const lessons = section?.lessons || [];
  const questions = section?.questions || [];

  const completeLesson = async (index) => {
    const completedLessons = [...new Set([...(sectionProgress.completedLessons || []), index])].sort((a, b) => a - b);
    setBusy(true);
    setError('');
    try {
      const response = await saveLessonProgress(token, section.id, completedLessons);
      if (response.error) throw new Error(response.error);
      setProgress((current) => ({ ...current, [section.id]: { ...sectionProgress, completedLessons: response.completedLessons } }));
      setNotice(`¡Lección ${index + 1} completada! Sigue con el siguiente paso.`);
    } catch (requestError) {
      setError(requestError.message || 'No se pudo guardar el avance.');
    } finally {
      setBusy(false);
    }
  };

  const submitExam = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    setResult(null);
    try {
      const response = await submitLearningExam(token, section.id, questions.map((_, index) => answers[index]));
      if (response.error) throw new Error(response.error);
      setResult(response);
      setProgress((current) => ({ ...current, [section.id]: { ...sectionProgress, passed: response.passed, lastScore: response.score } }));
      setNotice(response.passed ? '¡Parcial aprobado! Tu diploma está listo.' : '¡Buen intento! Repasa las lecciones y vuelve a intentarlo.');
    } catch (requestError) {
      setError(requestError.message || 'No se pudo registrar el parcial.');
    } finally {
      setBusy(false);
    }
  };

  return <section className="feature-page learning-page">
    <div className="feature-page-heading"><div><span className="feature-kicker">MI ESPACIO · ACADEMIA INTERACTIVA</span><h1>Aprende Código</h1><p>Ideas grandes explicadas paso a paso para mentes curiosas de 5 a 13 años.</p></div><span className="feature-heading-art"><BookOpen aria-hidden="true" /></span></div>
    <div className="learning-layout">
      <nav className="learning-sections" aria-label="Secciones de aprendizaje">{sections.map((item, index) => {
        const SectionIcon = [Map, Repeat2, GitBranch, Bug][index] || Lightbulb;
        return <button type="button" key={item.id} className={selectedId === item.id ? 'active' : ''} onClick={() => { setSelectedId(item.id); setAnswers({}); setResult(null); setNotice(''); }}><span className="learning-section-icon"><SectionIcon aria-hidden="true" /></span><span><strong>{index + 1}. {item.title}</strong><small>{item.ageRange} · {(progress[item.id]?.completedLessons || []).length}/{item.lessons.length} lecciones</small></span><b>{progress[item.id]?.passed ? '✓' : '→'}</b></button>;
      })}</nav>
      {section ? <article className="learning-content panel">
        <span className="badge">{section.ageRange}</span><h2>{section.title}</h2><p>{section.description}</p>
        <div className="lesson-list">{lessons.map((lesson, index) => {
          const complete = sectionProgress.completedLessons?.includes(index);
          return <section className={`lesson-card ${complete ? 'complete' : ''}`} key={`${section.id}-${index}`}><div className="lesson-card-title"><span>{complete ? '✓' : index + 1}</span><h3>{lesson.title}</h3></div><p>{lesson.reading}</p><div className="lesson-example"><strong><Lightbulb aria-hidden="true" /> Ejemplo</strong><p>{lesson.example}</p></div><button className={complete ? 'quiet-btn' : 'secondary-btn'} type="button" disabled={complete || busy} onClick={() => completeLesson(index)}>{complete ? 'Lección completada ✓' : 'Marcar como aprendida'}</button></section>;
        })}</div>
        <section className="exam-card"><div className="exam-heading"><div><span className="feature-kicker">MINIPARCIAL</span><h3>Comprueba lo que aprendiste</h3></div><span>{sectionProgress.passed ? <><Award aria-hidden="true" /> Aprobado</> : 'Se aprueba con 70%'}</span></div>
          {(sectionProgress.completedLessons || []).length < lessons.length ? <p className="exam-lock">🔒 Completa todas las lecciones para activar el parcial.</p> : <form onSubmit={submitExam}>{questions.map((question, questionIndex) => <fieldset className="exam-question" key={`${section.id}-q${questionIndex}`}><legend>{questionIndex + 1}. {question.prompt}</legend>{question.options.map((option, optionIndex) => <label key={option}><input type="radio" name={`question-${questionIndex}`} checked={answers[questionIndex] === optionIndex} onChange={() => setAnswers((current) => ({ ...current, [questionIndex]: optionIndex }))} />{option}</label>)}</fieldset>)}<button className="primary-btn" type="submit" disabled={busy || questions.some((_, index) => !Number.isInteger(answers[index]))}>{busy ? 'Revisando respuestas…' : sectionProgress.passed ? 'Presentar de nuevo' : 'Enviar parcial'}</button></form>}
          {notice && <div className={`alert ${result ? (result.passed ? 'success' : 'error') : 'success'}`} role="status">{notice}{result && <strong> · {result.score.toFixed(1)}%</strong>}</div>}
          {error && <div className="alert error" role="alert">{error}</div>}
          {result?.passed && <div className="certificate-card"><span><GraduationCap aria-hidden="true" /></span><div><strong>¡Certificado desbloqueado!</strong><small>{result.score.toFixed(1)}% · {section.title}</small></div><button className="primary-btn" type="button" onClick={() => { try { printCertificate(user, profile, section, result); } catch (printError) { setError(printError.message); } }}>Descargar / imprimir PDF</button></div>}
        </section>
      </article> : <div className="panel empty-state">Cargando tus contenidos…</div>}
    </div>
  </section>;
}
