'use client';
import { useId, useState } from 'react';
import { MapPin, MagnifyingGlass, X } from '@phosphor-icons/react';
import { places, type Place } from '@/data/demo/places';

export function PlaceSearch({ label, value, onChange, kind }: { label: string; value?: Place; onChange: (place?: Place) => void; kind: 'pickup' | 'destination' }) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const results = places.filter(place => `${place.name} ${place.city} ${place.address}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())).slice(0, 6);
  const select = (place: Place) => { onChange(place); setQuery(''); setOpen(false); setActive(0); };
  return <div className={`place-field ${kind}`} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false); }}>
    <span className="location-dot" />
    <div className="place-input-wrap"><label htmlFor={id}>{label}</label><input id={id} role="combobox" aria-expanded={open} aria-autocomplete="list" aria-controls={`${id}-results`} aria-activedescendant={open && results[active] ? `${id}-${active}` : undefined} autoComplete="off" placeholder={kind === 'pickup' ? 'Where from?' : 'Where to?'} value={open ? query : value?.name || query} onFocus={() => { setQuery(''); setOpen(true); setActive(0); }} onChange={event => { setQuery(event.target.value); onChange(undefined); setOpen(true); setActive(0); }} onKeyDown={event => {
      if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActive(index => Math.max(0, Math.min(index + 1, results.length - 1))); }
      if (event.key === 'ArrowUp') { event.preventDefault(); setActive(index => Math.max(0, index - 1)); }
      if (event.key === 'Enter' && open) { event.preventDefault(); if (results[active]) select(results[active]); }
      if (event.key === 'Escape') { setQuery(''); setOpen(false); }
    }} />{value && !open && <span className="place-city">{value.city}</span>}</div>
    {value ? <button type="button" className="clear-place" aria-label={`Clear ${label.toLowerCase()}`} onClick={() => { onChange(undefined); setQuery(''); }}><X size={16} /></button> : <MagnifyingGlass className="input-search-icon" size={19} />}
    {open && <div className="place-options" id={`${id}-results`} role="listbox" aria-label={`${label} demo destinations`}><div className="options-label">Metro Manila demo destinations</div>{results.map((place, index) => <button type="button" role="option" aria-selected={index === active} id={`${id}-${index}`} className={index === active ? 'place-option selected' : 'place-option'} key={place.id} onMouseDown={event => event.preventDefault()} onClick={() => select(place)}><MapPin size={20} /><span><strong>{place.name}</strong><small>{place.address} · {place.city}</small></span></button>)}{!results.length && <p className="no-results">No matching demo landmark. Try a city name, such as Makati or Pasig.</p>}</div>}
  </div>;
}
