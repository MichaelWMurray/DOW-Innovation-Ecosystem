import {getWorkbookRefresh, refreshWorkbook, subscribeWorkbookRefresh} from './workbook-refresh';
import { lendingViewEnabled, subscribeToLendingView, toggleLendingView } from './lending-view';
import './treemap.js';
import {rollups, procurement, procurementByBranch, lendingAuthority} from './model';
import approvedActivityData from './approved-activities.json';
import React, {useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore} from 'react';
import {createRoot} from 'react-dom/client';
import {acronym, alphabetical, byId, color, components, history, layout, logos, levelLayout, placeholderLogo, money, organizations, orgTypes, overview, search, type Circle} from './model';
import './style.css';
import {zoom, zoomIdentity, type ZoomBehavior} from 'd3-zoom';
import {select as selectElement} from 'd3-selection';

function formatRollup(amount: number, ambiguousPools: number) {
  return (ambiguousPools ? 'At least ' : '') + '$' + amount.toLocaleString(undefined, {maximumFractionDigits:3}) + 'M';
}

type View = {focus:string; selected:string; query:string; components:string[]; types:string[]};
const overviewBranches = ['view:unresolved'];
const initial: View = {focus:overview, selected:'', query:'', components:[], types:[]};
function readView(): View {
  const params = new URLSearchParams(location.hash.slice(1));
  const requested = params.get('org') ?? '';
  const selected = requested === 'IEORG-0240' ? '' : requested;
  return {selected, focus: params.get('focus') ?? overview,
    query:params.get('q') ?? '', components:params.getAll('component'), types:params.getAll('type')};
}
function updateUrl(view: View, replace: boolean) {
  const params = new URLSearchParams();
  if(view.focus !== overview) params.set('focus', view.focus);
  if(view.selected) params.set('org',view.selected);
  if(view.query) params.set('q',view.query);
  view.components.forEach(value => params.append('component',value));
  view.types.forEach(value => params.append('type',value));
  window.history[replace ? 'replaceState':'pushState'](null,'',params.size ? '#'+params : location.href.split('#')[0]);
}
function App() {
  const [view,setView] = useState(readView);
  const [expanded,setExpanded] = useState(new Set(overviewBranches));
  const [drawer,setDrawer] = useState(false);
  const [filters,setFilters] = useState(false);
  const [searchOpen,setSearchOpen] = useState(false);
  const [searchIndex,setSearchIndex] = useState(-1);
  const [failedLogos,setFailedLogos] = useState(new Set<string>());
  const [notice,setNotice] = useState('');
  const [treeKey,setTreeKey] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const drawerButton = useRef<HTMLButtonElement>(null);
  const filterButton = useRef<HTMLButtonElement>(null);
  const detailOpener = useRef<HTMLElement | null>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomBehavior = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [camera,setCamera] = useState({x:0,y:0,k:1});
  const [size,setSize] = useState({width:800,height:650});
  const focus = byId.get(view.focus) ?? layout;
  const selected = byId.get(view.selected);
  const org = selected?.data.org;
  const approvedActivities = approvedActivityData[view.selected as keyof typeof approvedActivityData] ?? [];

  const amount = org && money.get(org.id);
  const rollup = org && rollups.get(org.id);
  const spendPlan = org && procurement.get(org.id);
  const branchProcurement = org && procurementByBranch.get(org.id);
  const authority = org && lendingAuthority.get(org.id);
  const isFiltered = !!(view.components.length || view.types.length);
  const matches = new Set(organizations.filter(record => (
    (!view.components.length || view.components.includes(record.type ?? 'Unspecified')) &&
    (!view.types.length || view.types.includes(record.orgType ?? 'Unspecified'))
  )).map(record => record.id));
  const context = new Set([...matches].flatMap(id => byId.get(id)!.ancestors().map(node => node.data.id)));
  const results = search(view.query);
  const openResults = searchOpen && !!view.query.trim();
  const {width,height} = size;
  const showLending = useSyncExternalStore(subscribeToLendingView, lendingViewEnabled);
  const workbook = useSyncExternalStore(subscribeWorkbookRefresh, getWorkbookRefresh);
  useEffect(() => {void refreshWorkbook();}, []);
  const packed = useMemo(() => levelLayout(focus, showLending), [focus, showLending, workbook.revision]);
  const scale = Math.max(1, Math.min(width,height)-90) / (packed.radius*2);
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = selectElement(svgRef.current);
    const behavior = zoom<SVGSVGElement, unknown>().scaleExtent([.05,1024])
      .on('zoom',event => setCamera({x:event.transform.x,y:event.transform.y,k:event.transform.k}));
    zoomBehavior.current = behavior;
    svg.call(behavior).on('dblclick.zoom',null);
    svg.call(behavior.transform,zoomIdentity);
    return () => {svg.on('.zoom',null);};
  },[focus,width,height,showLending,workbook.revision]);
  function zoomBy(factor:number) {
    if(svgRef.current && zoomBehavior.current) selectElement(svgRef.current).call(zoomBehavior.current.scaleBy,factor);
  }
  function fitView() {
    if(svgRef.current && zoomBehavior.current) selectElement(svgRef.current).call(zoomBehavior.current.transform,zoomIdentity);
  }

  function update(next: View, replace = false) {
    setView(next);
    updateUrl(next,replace);
  }
  function select(node: Circle) {
    const id = node.data.id;
    const shouldClear = !!node.data.org && !matches.has(id);
    detailOpener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setNotice(shouldClear ? 'Filters cleared to show this organization.' : '');
    setExpanded(old => new Set([...old,...node.ancestors().map(item => item.data.id)]));
    setTreeKey(id);
    update({...view,
      selected:node.data.org ? id : '', ...(shouldClear ? {components:[],types:[]} : {})});
    setSearchOpen(false);
    setDrawer(false);
  }
  function closeDetails() {
    update({...view,selected:''});
    if (detailOpener.current?.isConnected) detailOpener.current.focus();
    else drawerButton.current?.focus();
  }
  function go(node: Circle) {
    setSearchOpen(false);
    setExpanded(old => new Set([...old,...node.ancestors().map(item => item.data.id)]));
    update({...view,focus:node.data.id,selected:''});
  }
  function toggleFilter(key:'components'|'types', value:string) {
    const values = view[key].includes(value) ? view[key].filter(item => item !== value) : [...view[key],value];
    update({...view,[key]:values});
  }

  useEffect(() => {
    const restore = () => {setView(readView());setSearchOpen(false);};
    window.addEventListener('popstate',restore);
    window.addEventListener('hashchange',restore);
    return () => {window.removeEventListener('popstate',restore);window.removeEventListener('hashchange',restore);};
  },[]);
  useEffect(() => {
    setExpanded(old => new Set([...old,...focus.ancestors().map(node => node.data.id)]));
  },[focus]);
  useLayoutEffect(() => {
    const observer = new ResizeObserver(([entry]) => setSize({width:entry.contentRect.width,height:entry.contentRect.height}));
    if(canvas.current) observer.observe(canvas.current);
    return () => observer.disconnect();
  },[]);
  useEffect(() => {
    const escape = (event:KeyboardEvent) => {
      if(event.key !== 'Escape' || event.defaultPrevented) return;
      if(searchOpen) setSearchOpen(false);
      else if(filters) {setFilters(false);filterButton.current?.focus();}
      else if(drawer) {setDrawer(false);drawerButton.current?.focus();}
      else if(view.selected) closeDetails();
    };
    window.addEventListener('keydown',escape);
    return () => window.removeEventListener('keydown',escape);
  });

  const visibleRows: Circle[] = [];
  function addRows(parent: Circle) {
    for (const node of [...(parent.children ?? [])].sort(alphabetical)) {
      if(isFiltered && !context.has(node.data.id)) continue;
      visibleRows.push(node);
      if(expanded.has(node.data.id)) addRows(node);
    }
  }
  addRows(layout);
  const currentRow = visibleRows.find(node => node.data.id === treeKey) ?? visibleRows[0];
  function toggleBranch(node: Circle) {
    setExpanded(old => {
      const next = new Set(old);
      if(next.has(node.data.id)) next.delete(node.data.id); else next.add(node.data.id);
      return next;
    });
  }
  const nodes = packed.circles;
  const screenNodes=nodes.map(node=>({node,x:camera.x+(width/2+node.x*scale)*camera.k,y:camera.y+(height/2+node.y*scale)*camera.k,r:node.r*scale*camera.k}));
  const visibleLabels:{id:string;x:number;y:number;w:number;text:string;top:boolean}[]=[];
  const shortNames:Record<string,string>={'IEORG-0259':'R&E','IEORG-0006':'Army','IEORG-0236':'Navy','IEORG-0001':'Air Force','IEORG-0242':'Space Force'};
  for(const {node,x,y,r} of [...screenNodes].sort((a,b)=>a.node.depth-b.node.depth||b.r-a.r)){
    const top=node.depth===1;if(r<(top?15:32))continue;
    const raw=shortNames[node.data.id]||node.data.org?.acronym||node.data.label;
    const lending = showLending ? lendingAuthority.get(node.data.id) : undefined;
    const name = raw.length > 28 ? raw.slice(0,27)+'…' : raw;
    const id = node.data.id;
    const rollup = rollups.get(id);
    const direct = money.get(id);
    const rdte = rollup?.amountMillions ??
      (direct?.status === 'supported' ? Number(direct.amountMillionsDecimal) : 0);
    const amount = lending?.amount ?? (rdte + (procurementByBranch.get(id) ?? 0));
    if (amount > 0) continue;
    const text = name;
    const w = text.length * (top ? 8 : 7) + 14;
    const ancestors=new Set(byId.get(node.data.id)!.ancestors().map(n=>n.data.id));
    const positions=top?[{x,y:y-r-27},{x,y:y+r+7},{x:x+r+w/2+8,y:y-10},{x:x-r-w/2-8,y:y-10}]:[{x,y:node.children?.length?y-r+7:y+r+5}];
    for(const pos of positions){const lx=pos.x,ly=pos.y;
      if(lx+w/2<0||lx-w/2>width||ly<0||ly+23>height)continue;
      if(visibleLabels.some(b=>Math.abs(b.x-lx)<(b.w+w)/2+5&&Math.abs(b.y-ly)<28))continue;
      if(screenNodes.some(o=>!ancestors.has(o.node.data.id)&&Math.hypot(o.x-Math.max(lx-w/2,Math.min(o.x,lx+w/2)),o.y-Math.max(ly,Math.min(o.y,ly+23)))<o.r))continue;
      visibleLabels.push({id:node.data.id,x:lx,y:ly,w,text,top});break;
    }
  }

  return <div className="app">
    <header className="top">
      <div className="brand"><span className="mark" aria-hidden="true">◎</span><div><h1>DoW Innovation Ecosystem</h1></div></div>
      <div className="search" onBlur={event => {if(!event.currentTarget.contains(event.relatedTarget)) setSearchOpen(false);}}>
        <label className="sr" htmlFor="search">Find an organization</label>
        <span aria-hidden="true" className="searchIcon">⌕</span>
        <input id="search" ref={searchRef} placeholder="Find an organization…" role="combobox" aria-autocomplete="list"
          aria-expanded={openResults} aria-controls="search-results" aria-activedescendant={openResults && searchIndex>=0 && results[searchIndex] ? 'result-'+searchIndex : undefined}
          value={view.query} onFocus={() => setSearchOpen(true)}
          onChange={e => {update({...view,query:e.target.value},true);setSearchOpen(true);setSearchIndex(-1);}}
          onKeyDown={e => {
            if(e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();setSearchOpen(true);
              setSearchIndex(i => Math.max(0,Math.min(results.length-1,i+(e.key==='ArrowDown'?1:-1))));
            } else if(e.key === 'Enter' && openResults && results.length) {
              e.preventDefault();select(results[Math.max(0,searchIndex)]); 
            } else if(e.key==='Escape' && openResults) {e.preventDefault();setSearchOpen(false);}
          }}/>
        {openResults && <div className="results" id="search-results" role="listbox">
          {results.length===0 && <p>No organizations found.</p>}
          {results.map((node,i) => <div id={'result-'+i} key={node.data.id} role="option" aria-selected={i===searchIndex}
            onMouseDown={e => e.preventDefault()} onClick={() => select(node)}>
            <strong>{node.data.label}</strong><small>{node.data.id} · {node.data.org?.type ?? 'Unspecified'} · {node.parent?.data.label}</small></div>)}
        </div>}
      </div>
      <span className="badge">PHASE 4 DRAFT</span>
      <button onClick={() => {update(initial);fitView();setExpanded(new Set(overviewBranches));setTreeKey('');setNotice('');setSearchOpen(false);}}>Overview</button>
    </header>

    <nav className="crumb" aria-label="Hierarchy path">
      {[...focus.ancestors()].reverse().map((node,i) => <React.Fragment key={node.data.id}>
        {i>0 && <span aria-hidden="true">›</span>}
        <button aria-current={node===focus?'location':undefined} onClick={() => go(node)}>{node.data.label}</button>
      </React.Fragment>)}
    </nav>

    <main>
      <aside className={'left'+(drawer?' opened':'')} aria-label="Organization navigation">
        <div className="sideHeader"><div className="kicker">DIRECTORY</div><h2>Organizations</h2>
          <button className="mobile close" onClick={() => {setDrawer(false);drawerButton.current?.focus();}} aria-label="Close directory">×</button>
          <p aria-live="polite">{isFiltered ? matches.size+' matches / ' : ''}{organizations.length} displayed organizations</p></div>
        {matches.size===0 && <p className="empty">No matches. Clear or adjust filters.</p>}
        <div role="tree" aria-label="Organizations" className="tree" onKeyDown={e => {
          const index = visibleRows.findIndex(node => node.data.id === currentRow?.data.id);
          if(index<0) return;
          const node = visibleRows[index];
          let target:Circle|undefined;
          if(e.key==='ArrowDown') target=visibleRows[index+1];
          else if(e.key==='ArrowUp') target=visibleRows[index-1];
          else if(e.key==='Home') target=visibleRows[0];
          else if(e.key==='End') target=visibleRows.at(-1);
          else if(e.key==='ArrowRight' && node.children) {
            if(!expanded.has(node.data.id)) toggleBranch(node); else target=visibleRows[index+1]?.parent===node?visibleRows[index+1]:undefined;
          } else if(e.key==='ArrowLeft') {
            if(expanded.has(node.data.id) && node.children) toggleBranch(node); else target=node.parent===layout?undefined:node.parent??undefined;
          } else if(e.key==='Enter' || e.key===' ') select(node);
          else return;
          e.preventDefault();
          if(target) {setTreeKey(target.data.id);document.getElementById('tree-'+target.data.id)?.focus();}
        }}>
          {visibleRows.map(node => <div key={node.data.id} role="treeitem" id={'tree-'+node.data.id}
            aria-level={node.depth} aria-selected={view.selected===node.data.id}
            aria-expanded={node.children ? expanded.has(node.data.id) : undefined}
            tabIndex={currentRow===node ? 0 : -1} onFocus={() => setTreeKey(node.data.id)}
            style={{paddingInlineStart:8+Math.min(8,node.depth-1)*12}}>
            <span className="chevron" aria-hidden="true" onClick={node.children ? () => toggleBranch(node) : undefined}>
              {node.children ? (expanded.has(node.data.id)?'▾':'▸') : '·'}</span>
            <span className="treeLabel" onClick={() => select(node)}>{node.data.label}</span>
          </div>)}
        </div>
      </aside>

      <section className="stage" aria-label="Nested bubble view">
        <div className="stageTop">
          <div><div className="kicker">FY2026 FUNDING · NESTED ORGANIZATIONS</div><h2>{focus===layout ? 'Innovation ecosystem' : focus.data.label}</h2><small role="status">{workbook.message}</small></div>
          <div className="tools">
            <button className="mobile" ref={drawerButton} onClick={() => setDrawer(!drawer)}>Directory</button>
            <button ref={filterButton} aria-expanded={filters} onClick={() => setFilters(!filters)}>Filters{isFiltered?' •':''}</button>
            <button disabled={workbook.loading} onClick={() => void refreshWorkbook()}>Refresh</button>
            <button aria-pressed={showLending} onClick={toggleLendingView}>Size by OSC lending authority</button>
            <button onClick={() => zoomBy(1.5)} aria-label="Zoom in">+</button><button onClick={() => zoomBy(1/1.5)} aria-label="Zoom out">−</button><button onClick={fitView}>Fit</button>
            <button disabled={focus===layout} onClick={() => focus.parent && go(focus.parent)} aria-label="Up one organization level">↑</button>
          </div>
        </div>
        {filters && <section className="filterPanel" aria-label="Filters">
          <div className="filterHead"><strong>Highlight organizations</strong><button onClick={() => {setFilters(false);filterButton.current?.focus();}}>Close</button></div>
          <div className="filterGrid">{([[components,'components','Component'],[orgTypes,'types','Organization type']] as const).map(([options,key,title]) =>
            <fieldset key={key}><legend>{title}</legend>{options.map(value => <label key={value}><input type="checkbox" checked={view[key].includes(value)} onChange={() => toggleFilter(key,value)}/>{value}</label>)}</fieldset>)}</div>
          <button onClick={() => update({...view,components:[],types:[]})}>Clear filters</button>
          <span className="filterCount">{matches.size} matches</span>
        </section>}
        <div className="canvas" ref={canvas} onClick={() => view.selected && update({...view,selected:''})}>
          <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" style={{touchAction:'none',cursor:'grab'}}>
            <g transform={`translate(${camera.x} ${camera.y}) scale(${camera.k})`}>
              {nodes.map(node => {
                const id = node.data.id;
                const x = width/2 + node.x*scale;
                const y = height/2 + node.y*scale;
                const r = node.r*scale;
                const amount = money.get(id);
                const branchFunding = rollups.get(id);
                const procurementAmount = procurementByBranch.get(id) ?? 0;
                const quantified = procurementAmount > 0 || !!branchFunding || (amount?.status==='supported' && Number(amount.amountMillionsDecimal)>0);
                const muted = isFiltered && !context.has(id);
                const href = logos[id] && !failedLogos.has(id) ? logos[id] : placeholderLogo(node);
                const lending = showLending ? lendingAuthority.get(id) : undefined;
                const displayAmount = lending ? '$'+(lending.amount/1000)+'B' : branchFunding ? formatRollup(branchFunding.amountMillions, branchFunding.ambiguousPools) + ' RDT&E hierarchy scope' : amount?.status==='supported' ? '$'+Number(amount!.amountMillionsDecimal).toLocaleString(undefined,{maximumFractionDigits:3})+'M' :
                  amount?.status==='supported' ? '$0M' : 'Scope unavailable';
                return <g key={id} opacity={muted ? .18 : 1} className="logoBubble"
                  onClick={event => {event.stopPropagation();select(byId.get(id)!);}} onDoubleClick={event=>{event.stopPropagation();go(byId.get(id)!);}}>
                  <defs><clipPath id={'clip-'+id}><circle cx={x} cy={y} r={r}/></clipPath></defs>
                  <circle cx={x} cy={y} r={r} fill="white"/>
                  <image href={href} x={x-r} y={y-r} width={2*r} height={2*r}
                    opacity={node.children?.length ? .16 : 1} preserveAspectRatio="xMidYMid slice" clipPath={'url(#clip-'+id+')'}
                    onError={() => setFailedLogos(old => new Set([...old,id]))}/>
                  <circle cx={x} cy={y} r={r} fill="none" stroke={view.selected===id?'#14243a':color(node)[1]}
                    strokeWidth={view.selected===id?3:1.7} vectorEffect="non-scaling-stroke"
                    strokeDasharray={quantified?undefined:'4 3'}/>
                  <title>{node.data.label+' · '+(procurementAmount ? formatRollup(procurementAmount, 0)+' procurement spend plan'+(branchFunding ? ' · '+displayAmount : '') : displayAmount)+(node.children?' · Zoom to organization':'')}</title>
                </g>;
              })}
            </g>
            <g pointerEvents="none">{visibleLabels.map(l=><g key={l.id} transform={`translate(${l.x} ${l.y})`}><rect x={-l.w/2} y="-3" width={l.w} height="23" rx="4" fill="white" fillOpacity=".9"/><text y="13" textAnchor="middle" className={l.top?'componentLabel':'leafLabel'}>{l.text}</text></g>)}</g>
          </svg>
        </div>
        <footer>{showLending && <strong>OSC size uses cumulative lending authority. </strong>}All organizations remain nested and visible. Circle area reflects identified FY2026 funding, including the APFIT procurement spend plan. Parent circles expand when needed to contain children. Dashed circles indicate missing scope or zero. Pinch or scroll to zoom · drag to pan · click for details · double-click to zoom.</footer>
        {focus.data.id.startsWith('view:') && focus!==layout && <div className="groupNote">Display grouping only. It does not indicate an organizational relationship.</div>}
        <span className="sr" aria-live="polite">{notice || (org ? 'Selected '+org.label : focus.data.label)}</span>
        {notice && <div className="notice">{notice}<button aria-label="Dismiss notice" onClick={() => setNotice('')}>×</button></div>}
      </section>

      {view.selected && <aside className="details" aria-label="Organization details">
        <button className="close" aria-label="Close details" onClick={closeDetails}>×</button>
        {org && selected ? <>
<button className="zoomTo" onClick={()=>go(selected)}>Zoom to organization</button>
          <div className="identity"><div className="acronym" style={{background:color(selected)[0]}}>
            {logos[org.id] && !failedLogos.has(org.id) ? <img src={logos[org.id]} alt={org.label+' logo'} width="52" height="52"
              style={{objectFit:'contain'}} onError={() => setFailedLogos(old => new Set([...old,org.id]))}/> : acronym(org)}</div>
          <div className="kicker">{org.id}</div></div>
          <h2>{org.label}</h2>
          <div className="tags">{[org.type,org.orgType].filter(Boolean).map((label,index) => <span key={index}>{label}</span>)}</div>
          <dl className="relations">
            {([['Parent',org.parentId,org.rawParent],['Manager',org.managerId,org.rawManager]] as const).map(([label,key,raw]) =>
              (key||raw) && key !== 'IEORG-0240' && <div key={label}><dt>{label}</dt><dd>{key && byId.has(key) ?
                <button className="textButton" onClick={() => select(byId.get(key)!)}>{byId.get(key)!.data.label}</button> : <>{raw} <small>· unresolved reference</small></>}</dd></div>)}
          </dl>
          {org.description && <p className="description">{org.description}</p>}
          <section className="funding">
            {!!branchProcurement && <>
              <div className="kicker">FY2026 PROCUREMENT SPEND PLAN</div>
              <strong>{formatRollup(branchProcurement, 0)}</strong>
              {spendPlan ? <p>{spendPlan.components.map(c => c.label + ' ' + formatRollup(c.amount, 0)).join(' · ')}. {spendPlan.basis}.</p> : <p>Includes APFIT within this branch.</p>}
            </>}
            {authority && <>
              <div className="kicker">CUMULATIVE LENDING AUTHORITY</div>
              <strong>Approximately ${authority.amount/1000}B</strong>
              <p>Reported as of May 2026. The sizing toggle uses lending authority for OSC. Funding totals report it separately.</p>
            </>}
            {rollup && <>
              <div className="kicker">FY2026 RDT&E HIERARCHY REQUEST SCOPE</div>
              <strong>{formatRollup(rollup.amountMillions, rollup.ambiguousPools)}</strong>
              <p>Includes this organization and its descendants. Full program element and project scopes include their lower-level amounts.</p>
              {rollup.ambiguousPools > 0 && <p>Conservative estimate due to possible overlap in {rollup.ambiguousPools} funding {rollup.ambiguousPools === 1 ? 'pool' : 'pools'}.</p>}
            </>}
            <div className="kicker">{rollup ? 'ORGANIZATION RDT&E REQUEST SCOPE' : 'SUPPORTED FY2026 RDT&E REQUEST SCOPE'}</div>
            <strong>{amount?.status==='supported' ? '$'+amount.amountMillionsDecimal+'M' :
              amount?.status==='source_exception'?'Source review needed':'No supported FY2026 request scope recorded'}</strong>
            {amount?.status==='supported' && amount.scope && <p>{amount.scope}</p>}
            {amount?.overlapNote && <p>Overlapping organizations · {amount.overlapNote}</p>}
            <small>Published request scope attributed in the crosswalk. It may differ from the organization’s total budget or enacted funding. Parent and child figures must not be added.</small>
            {amount?.sourceLocator && <a href={'https://docs.google.com/spreadsheets/d/'+amount.sourceLocator.fileId+'/edit#gid=1245809201&range=A'+amount.sourceLocator.row} target="_blank" rel="noreferrer">Funding workbook · row {amount.sourceLocator.row} ↗</a>}
            {approvedActivities.length > 0 && <details className="approvedActivities">
              <summary>Approved funding activities ({approvedActivities.length})</summary>
              <p>These program management attributions are included in the total above. They describe requested funding scope.</p>
              <ul>{approvedActivities.map(activity => <li key={activity.activityId}>
                <b>{activity.activityId}</b> · {activity.pe} / {activity.project} · ${activity.amountMillions.toFixed(3)}M
                <br />{activity.decision} · {activity.confidence} confidence
                <br />PE Relationships rows {activity.ledgerRow} (allocation) and {activity.auditRow} (decision)
              </li>)}</ul>
            </details>}
          </section>
          {(org.location || org.year || org.website) && <p className="meta">{[org.location,org.year].filter(Boolean).join(' · ')}
            {org.website && <a href={org.website} target="_blank" rel="noreferrer">Organization website ↗</a>}</p>}
          {!!selected.children?.length && <section className="children"><h3>Direct children <span>{selected.children.length}</span></h3>
            {[...selected.children].sort(alphabetical).map(node => <button className="textButton" key={node.data.id} onClick={() => select(node)}>{node.data.label} ›</button>)}</section>}
          <button onClick={async () => {
            try {
              const url=new URL(location.href);url.hash=new URLSearchParams({org:org.id}).toString();
              await navigator.clipboard.writeText(url.href);setNotice('Organization link copied.');
            } catch {setNotice('Copy the organization link from your address bar.');}
          }}>Copy organization link</button>
        </> : <><h2>{history.get(view.selected)?.state==='retired'?'Retired organization':'Organization unavailable'}</h2><p>{view.selected}</p>
          {history.get(view.selected)?.successorId && byId.has(history.get(view.selected)!.successorId!) &&
            <button onClick={() => select(byId.get(history.get(view.selected)!.successorId!)!)}>Open successor</button>}</>}
      </aside>}
    </main>
  </div>;
}

createRoot(document.getElementById('root')!).render(<App/>);
