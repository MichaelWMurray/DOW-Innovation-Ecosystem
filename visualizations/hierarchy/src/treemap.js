import {zoom, zoomIdentity} from 'd3-zoom';
import {select as d3Select} from 'd3-selection';
import {getAwardEvidence, getReferenceFunding, getWorkbookRefresh, refreshWorkbook, subscribeWorkbookRefresh} from './workbook-refresh';
import nonRdte from './non-rdte.json';
import snapshot from './draft.json';
import logos from './logos.json';
const ADDED_CSS="/* Scope every rule to the independent treemap so the existing circle view remains unchanged. */\n#tm-switcher{position:fixed;bottom:16px;right:16px;z-index:10000;display:flex;gap:3px;padding:5px;border-radius:100px;background:#0e1b2c;box-shadow:0 12px 36px #07111d66;border:1px solid #466179;color:#dce8f6;font:600 12px/1.2 system-ui,sans-serif}\n#tm-switcher button{border:0;background:transparent;color:inherit;padding:11px 14px;border-radius:100px;white-space:nowrap;cursor:pointer;font:inherit}\n#tm-switcher button.active{color:#102438;background:#e8f1ff}\n#tm-switcher button:focus-visible{outline:2px solid #f3c969;outline-offset:2px}\n#tm-root[hidden]{display:none!important}\n#tm-root{--tm-text:#ebf3ff;--tm-muted:#a7bfd3;--tm-card:#182b40;--tm-line:#31475c;position:fixed;z-index:9998;inset:0;overflow-x:hidden;overflow-y:auto;display:flex;flex-direction:column;background:#0d1b2b;color:var(--tm-text);font:14px/1.35 system-ui,-apple-system,Segoe UI,sans-serif;box-sizing:border-box}\n#tm-root *{box-sizing:border-box}\n#tm-root button,#tm-root input,#tm-root select{font:inherit}\n#tm-root button{cursor:pointer}\n#tm-root button:focus-visible,#tm-root input:focus-visible,#tm-root select:focus-visible{outline:2px solid #f3c969;outline-offset:2px}\n#tm-root .tm-header{display:flex;align-items:center;justify-content:space-between;gap:22px;padding:15px 24px 14px;border-bottom:1px solid var(--tm-line);background:#112235}\n#tm-root .tm-brand{display:flex;align-items:center;gap:12px;min-width:250px}\n#tm-root .tm-brand strong{display:block;font-size:19px;letter-spacing:-.3px}\n#tm-root .tm-mark{font-size:26px;color:#9fb6e4}\n#tm-root .tm-kicker,#tm-root .tm-eyebrow{display:block;font-size:10px;letter-spacing:1.4px;color:#9eb5ca;font-weight:700}\n#tm-root .tm-controls{display:flex;gap:9px;align-items:center;flex-wrap:wrap;justify-content:flex-end}\n#tm-root .tm-controls input,#tm-root .tm-controls select,#tm-root .tm-controls button{border:1px solid #456078;border-radius:8px;background:#1a3046;color:#eaf2ff;padding:10px 12px;min-height:39px}\n#tm-root .tm-controls input{min-width:220px;width:min(26vw,330px)}\n#tm-root .tm-controls select{max-width:175px}\n#tm-root .tm-controls input::placeholder{color:#adc0d2}\n#tm-root .tm-summary{padding:16px 26px 13px;display:flex;align-items:end;justify-content:space-between;gap:20px}\n#tm-root .tm-scope-heading{display:flex;gap:10px;align-items:center}\n#tm-root .tm-context{display:block;font-size:13px;font-weight:720;max-width:min(65vw,650px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px}\n#tm-root #tm-hero-logo{width:39px;height:39px;object-fit:contain;border-radius:50%;background:white;padding:2px}\n#tm-root #tm-hero-logo[hidden]{display:none}\n#tm-root .tm-total{display:block;font-size:clamp(29px,3vw,43px);font-weight:750;letter-spacing:-1.2px;line-height:1.16;margin-top:2px}\n#tm-root .tm-subline{color:var(--tm-muted);font-size:12px;margin-top:4px}\n#tm-root .tm-summary-actions{display:flex;flex-direction:column;align-items:flex-end;gap:7px;font-size:11px}\n#tm-root .tm-summary-actions a{color:#bad6ff;text-decoration:none}\n#tm-root .tm-summary-actions a:hover{text-decoration:underline}\n#tm-root .tm-status{color:#aac0d4;text-align:right;max-width:350px}\n#tm-root .tm-bar{display:flex;align-items:center;justify-content:space-between;padding:6px 26px 9px;gap:12px;border-bottom:1px solid #263f55;color:#a9c0d6;font-size:12px}\n#tm-root .tm-breadcrumb{display:flex;align-items:center;gap:7px;max-width:68%;overflow-x:auto;white-space:nowrap}\n#tm-root .tm-breadcrumb button{border:0;background:transparent;color:#c2dbf5;font-weight:600;padding:5px 3px}\n#tm-root .tm-breadcrumb button:last-child{color:#fff}\n#tm-root .tm-layout{display:grid;grid-template-columns:minmax(0,3fr) minmax(260px,1fr);gap:13px;padding:12px 18px 20px;min-height:500px;flex:1}\n#tm-root .tm-funded,#tm-root .tm-unfunded{display:flex;flex-direction:column;min-height:0;min-width:0;background:#15293d;border:1px solid #354d63;border-radius:12px;overflow:hidden}\n#tm-root .tm-section-head{display:flex;justify-content:space-between;align-items:center;gap:12px;font-weight:700;font-size:13px;padding:11px 13px;color:#dfebf8;border-bottom:1px solid #344b61}\n#tm-root .tm-section-head span:last-child{font-size:11px;color:#a6c0d6;font-weight:500}\n#tm-root .tm-funded .tm-canvas{position:relative;min-height:210px;flex:1;overflow:hidden;margin:8px;border-radius:5px}\n#tm-root .tm-hint{font-size:11px;color:#acc0d4;padding:2px 13px 10px}\n#tm-root .tm-tile{position:absolute;overflow:hidden;border:1px solid #d0e4f755;background:color-mix(in srgb,var(--tile-color) 66%,#091726);border-radius:4px;box-shadow:inset 0 0 0 1px #08142116;display:flex;flex-direction:column;padding:7px 8px;gap:3px;color:#fff}\n#tm-root .tm-tile.tm-expandable{cursor:zoom-in;background:color-mix(in srgb,var(--tile-color) 61%,#0c1e30)}\n#tm-root .tm-tile.tm-expandable:hover{z-index:3;border-color:#f1f8ff;box-shadow:inset 0 0 0 2px #ffffff73,0 0 0 2px #e6f7ff55}\n#tm-root .tm-tile-top{display:flex;align-items:center;gap:6px;min-width:0;flex-shrink:0}\n#tm-root .tm-tile-title{font-weight:720;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-shadow:0 1px 2px #07152350;font-size:clamp(10px,1.15vw,15px)}\n#tm-root .tm-logo{display:block;width:30px;height:30px;flex:0 0 30px;object-fit:contain;border-radius:50%;background:#fff;border:1px solid #ffffff90;padding:2px}\n#tm-root .tm-zoom{margin-left:auto;font-size:11px;color:#e1efff}\n#tm-root .tm-tile-sum{display:block;font-weight:650;font-size:13px;letter-spacing:.2px;text-shadow:0 1px 2px #07152361}\n#tm-root .tm-tile-inlineamount{margin-left:auto;font-size:clamp(10px,.85vw,13px);white-space:nowrap;font-weight:750;color:#f6fbff;text-shadow:0 1px 3px #08162180}\n#tm-root .tm-tile-inlineamount+.tm-zoom{margin-left:0}\n#tm-root .tm-tile .tm-tile{border-color:#d5ecff65;background:color-mix(in srgb,var(--tile-color) 83%,#081a2a)}\n#tm-root .tm-tile .tm-tile .tm-tile{background:color-mix(in srgb,var(--tile-color) 72%,#112838)}\n#tm-root .tm-unfunded>p{font-size:11px;color:var(--tm-muted);margin:8px 12px 9px}\n#tm-root .tm-unfunded-grid{padding:0 10px 42px;overflow-y:auto;min-height:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-content:start;gap:7px}\n#tm-root .tm-unfunded-tile{position:relative;aspect-ratio:1/1;border:1.8px dashed color-mix(in srgb,var(--tile-color) 76%,#ccd6e7);border-radius:6px;padding:7px 5px;background:color-mix(in srgb,var(--tile-color) 17%,#14253a);color:#dbe8f5;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;min-width:0}\n#tm-root .tm-unfunded-tile:hover{background:color-mix(in srgb,var(--tile-color) 35%,#14253a)}\n#tm-root .tm-unfunded-tile img{max-height:42%;width:auto;max-width:62%;object-fit:contain;border-radius:50%;background:white;padding:1px}\n#tm-root .tm-unfunded-tile span{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;overflow-wrap:anywhere;line-height:1.18;font-size:10px;font-weight:700;text-align:center}\n#tm-root .tm-searchresults{position:absolute;z-index:999;top:62px;right:248px;width:min(440px,45vw);max-height:350px;overflow:auto;border:1px solid #58718a;border-radius:10px;background:#14283d;box-shadow:0 18px 40px #050e1c8a}\n#tm-root .tm-searchresults[hidden]{display:none}\n#tm-root .tm-searchresults button{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:10px 13px;width:100%;text-align:left;background:transparent;border:0;border-bottom:1px solid #33495e;color:#f1f6fd}\n#tm-root .tm-searchresults button:hover{background:#2b475f}\n#tm-root .tm-searchresults small{font-size:11px;white-space:nowrap;color:#bdd0e2}\n#tm-root #tm-tooltip{position:fixed;z-index:10001;width:305px;border-radius:10px;padding:13px 14px;background:#091a2c;border:1px solid #6a8099;box-shadow:0 12px 30px #0008;pointer-events:none}\n#tm-root #tm-tooltip[hidden]{display:none}\n#tm-root #tm-tooltip strong{display:block;font-size:13px;margin-bottom:4px}\n#tm-root #tm-tooltip small{display:block;color:#aec4d8;margin-bottom:9px;font-size:11px}\n#tm-root #tm-tooltip div{display:flex;justify-content:space-between;gap:10px;border-top:1px solid #284057;padding:6px 0;font-size:11px}\n#tm-root #tm-tooltip b{font-size:12px}\n#tm-root .tm-empty{padding:25px;color:#aec2d5}\n#tm-root #tm-settings{max-width:min(600px,93vw);border:1px solid #52697d;border-radius:14px;background:#14283c;color:#e9f2fb;box-shadow:0 15px 80px #000b}\n#tm-root #tm-settings::backdrop{background:#05121bc9}\n#tm-root .tm-modal{padding:12px;line-height:1.55}\n#tm-root .tm-modal header{display:flex;justify-content:space-between;align-items:center;gap:15px}\n#tm-root .tm-modal h2{margin:0;font-size:21px}\n#tm-root .tm-modal header button{background:transparent;border:0;color:#fff;font-size:28px}\n#tm-root .tm-modal p{font-size:13px;color:#bdcfe0}\n#tm-root .tm-modal label{font-size:12px;display:block;margin:18px 0 9px}\n#tm-root .tm-modal label input{display:block;margin-top:8px;width:100%;background:#0e1c2a;color:white;border:1px solid #53677b;border-radius:6px;padding:10px}\n#tm-root .tm-modal #tm-save-endpoint{background:#dce9fa;color:#14273b;border:0;border-radius:6px;padding:10px 14px;font-weight:650}\n#tm-root .tm-modal .tm-fine{font-size:11px}\n#tm-root .tm-modal a{color:#b7d3f7}\n#tm-root .tm-unfunded-detail{border:1px dashed #7c9ab2;border-radius:7px;padding:12px;margin:12px 0}\n@media(max-width:960px){#tm-root .tm-header{padding:10px 13px;flex-wrap:wrap;gap:7px}#tm-root .tm-controls{width:100%;justify-content:stretch}#tm-root .tm-controls input{flex:1;width:10vw;min-width:125px}#tm-root .tm-layout{grid-template-columns:minmax(0,2fr) minmax(210px,1fr);padding:7px;gap:8px}#tm-root .tm-unfunded-grid{grid-template-columns:repeat(2,minmax(0,1fr))}#tm-root .tm-summary{padding:10px 14px}#tm-root .tm-bar{padding:5px 13px}#tm-root .tm-brand strong{font-size:17px}}\n@media(max-width:640px){#tm-root{overflow:auto}#tm-root .tm-controls input{min-width:150px}#tm-root .tm-layout{display:flex;flex-direction:column;min-height:750px;flex:1}#tm-root .tm-funded{min-height:400px;flex:2}#tm-root .tm-unfunded{min-height:280px;flex:1}#tm-root .tm-unfunded-grid{grid-template-columns:repeat(4,minmax(0,1fr))}#tm-root .tm-summary-actions{display:none}#tm-root .tm-bar #tm-caption{display:none}#tm-root .tm-tile-title{font-size:10px}#tm-switcher{bottom:8px;right:8px}#tm-switcher button{padding:8px 11px;font-size:11px}}\n\n/* Ensure the current parent context is legible in both panel headers. */\n#tm-root .tm-section-head span:first-child{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n#tm-root #tm-unfunded-scope{overflow-wrap:anywhere}\n#tm-root .tm-unfunded-tile span{width:100%;max-width:100%;min-width:0;white-space:normal;overflow-wrap:anywhere;word-break:break-word}\n\n/* Funding navigator keeps sub-million-dollar organizations reachable at every depth. */\n#tm-root .tm-funded-jumpbar{display:flex;align-items:center;gap:12px;padding:7px 12px;border-bottom:1px solid #2d465c;min-width:0}\n#tm-root .tm-funded-jumpbar label{font-size:11px;color:#bed1e4;font-weight:650;white-space:nowrap}\n#tm-root .tm-funded-jumpbar select{flex:1;min-width:0;max-width:100%;border:1px solid #4a6278;border-radius:6px;color:#eaf5ff;background:#1b334b;padding:6px 8px;font-size:12px}\n#tm-root .tm-small-funded{display:flex;align-items:center;gap:10px;padding:6px 13px;min-height:36px;border-top:1px solid #3a5368;background:#122438;flex-shrink:0}\n#tm-root .tm-small-funded[hidden]{display:none}\n#tm-root .tm-small-funded>strong{white-space:nowrap;color:#b9cfe1;font-size:11px}\n#tm-root .tm-small-funded-items{display:flex;gap:6px;overflow-x:auto;min-width:0}\n#tm-root .tm-small-funded-items button{border:1px solid #5c7b94;border-radius:5px;background:#27405a;color:#eef6fc;padding:4px 8px;font-size:11px;white-space:nowrap}\n#tm-root .tm-small-funded-items button:hover{background:#48698a}\n#tm-root .tm-small-funded-items button b{color:white;margin-left:3px}\n#tm-root .tm-search-parent{display:block!important;margin:3px 0 0!important;color:#a6c1d8!important;white-space:normal!important}\n@media(max-width:640px){#tm-root .tm-funded-jumpbar{gap:6px}#tm-root .tm-funded-jumpbar label{display:none}#tm-root .tm-small-funded{align-items:start;flex-direction:column;gap:4px}}\n\n/* Legibility explorer: uses equal-size cards, keeps proportional treemap untouched. */\n#tm-root #tm-small-toggle{flex:0 0 auto;border:1px solid #6e91b1;border-radius:7px;background:#294765;color:#eaf5ff;padding:8px 11px;font-size:12px;font-weight:750;white-space:nowrap}\n#tm-root #tm-small-toggle:hover{background:#386084}\n#tm-root #tm-small-toggle.active{background:#e4efff;color:#11243b;border-color:#e4efff}\n#tm-root #tm-canvas[hidden],#tm-root #tm-small-explorer[hidden]{display:none!important}\n#tm-root .tm-small-explorer{flex:1;min-height:200px;overflow-y:auto;margin:8px;padding:15px;border:1px solid #425e79;border-radius:8px;background:linear-gradient(155deg,#132940,#0e2033)}\n#tm-root .tm-small-explorer-intro{display:flex;align-items:start;justify-content:space-between;gap:15px}\n#tm-root .tm-small-explorer-intro strong{font-size:16px;color:#e9f4ff}\n#tm-root .tm-small-explorer-intro p{font-size:12px;color:#a9bfd5;margin:4px 0 5px}\n#tm-root .tm-small-explorer-intro>span{border-radius:100px;background:#2a4561;color:#d6e7fb;font-size:11px;padding:5px 9px;white-space:nowrap}\n#tm-root .tm-small-scale-warning{font-size:11px;line-height:1.5;color:#c1d6eb;margin:2px 0 13px}\n#tm-root .tm-small-card-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(204px,1fr));gap:10px;padding-bottom:8px}\n#tm-root .tm-small-card{min-width:0;min-height:128px;text-align:left;border:1px solid #466078;border-left:4px solid var(--tm-accent);border-radius:9px;background:#203850;color:#ecf4ff;padding:12px;display:flex;flex-direction:column;gap:9px}\n#tm-root .tm-small-card:hover{background:#2c4b69;border-color:#b9d7f3;border-left-color:var(--tm-accent);transform:translateY(-1px)}\n#tm-root .tm-small-card-heading{display:flex;align-items:center;gap:9px;min-width:0}\n#tm-root .tm-small-card-heading img{height:33px;width:33px;flex:0 0 33px;border-radius:50%;object-fit:contain;background:#fff;padding:2px}\n#tm-root .tm-small-card-fallback{display:flex;align-items:center;justify-content:center;height:33px;width:33px;flex:0 0 33px;border-radius:50%;background:var(--tm-accent);font-size:18px}\n#tm-root .tm-small-card-title{min-width:0;flex:1}\n#tm-root .tm-small-card-title strong{display:block;font-size:14px;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n#tm-root .tm-small-card-title small{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;font-size:11px;line-height:1.2;color:#bdcede;margin-top:3px}\n#tm-root .tm-small-card-arrow{font-size:17px;align-self:start;color:#d9edff}\n#tm-root .tm-small-card-bottom{display:flex;align-items:baseline;justify-content:space-between;gap:8px}\n#tm-root .tm-small-card-bottom b{font-size:18px;color:white}\n#tm-root .tm-small-card-bottom small{font-size:11px;color:#c1d7ea;white-space:nowrap}\n#tm-root .tm-small-card-parent{color:#a9c2d7;font-size:11px;line-height:1.25}\n#tm-root .tm-small-empty{padding:35px 20px;color:#d9e7f7}\n#tm-root .tm-small-empty p{font-size:12px;color:#b2cade}\n@media(max-width:850px){#tm-root .tm-funded-jumpbar{flex-wrap:wrap}#tm-root #tm-small-toggle{flex:1 0 auto}#tm-root .tm-small-card-grid{grid-template-columns:repeat(auto-fill,minmax(170px,1fr))}}\n@media(max-width:640px){#tm-root .tm-small-explorer{padding:10px;margin:5px}#tm-root .tm-small-card-grid{grid-template-columns:repeat(auto-fill,minmax(145px,1fr));gap:7px}#tm-root .tm-small-card{min-height:115px;padding:9px}#tm-root #tm-small-toggle{width:100%}}\n";
/*
 * Innovation Ecosystem treemap add-on (November 2026)
 * Shares the hosted circle view's workbook snapshot and logos.
 * The original nested-circle application is not modified; this mounts a sibling view.
 */
;(() => {
  'use strict';
  const ORIGINAL = snapshot;
  const ORIGINAL_LOGOS = logos;
  const EXCLUDED_ROOT = 'IEORG-0240';
  const OSC_CREDIT_SUBSIDY = 1500;
  const OSC_CREDIT_BASIS = 'Credit subsidy appropriation under P.L.119-21 §§20004(d),20005(b), documented in Non-RDT&E Funding; separate from FY2026 selected RDT&E and cumulative lending authority';
  const COMPONENT_COLORS = {
    'Air Force':'#3970b7', 'Army':'#33977b', 'Navy':'#3c92bc', 'Marine Corps':'#ab7443',
    'Space Force':'#7867b2', 'Combatant Command':'#b56972', 'USW(R&E)':'#8866a9',
    'USW(A&S)':'#a87b41', 'USW(I&S)':'#608b90', 'USW(P)':'#988f56',
    'National Guard Bureau':'#71915a', 'Joint Staff':'#b268a1', 'Secretary of War':'#77889c',
    'NATO':'#6a7fa6', 'Unclassified':'#627489'
  };
  const ORG_TYPE_BORDERS = new Map([
    ['Governance Organization', '#e2e8f0'],
    ['Innovation Organization', '#7dd3fc'],
    ['Federally Funded Research and Development Center', '#fbbf24'],
    ['Manufacturing Innovation Institute', '#fb923c'],
    ['Consortium', '#f472b6'],
    ['Science and Technology Reinvention Laboratory', '#bef264'],
    ['Partnership Intermediary Agreement', '#c4b5fd'],
    ['University Affiliated Research Center', '#2dd4bf'],
    ['Software Factory', '#818cf8'],
    ['Center of Excellence', '#f87171'],
    ['Acquisition Organization', '#fef08a'],
  ]);
  const orgTypeName = node => node.orgType || 'Unclassified';
  const orgTypeBorder = type => ORG_TYPE_BORDERS.get(type) ?? '#94a3b8';
  const MASTER_URL = 'https://docs.google.com/spreadsheets/d/1db8IsJfFm6lozj8g05WwjtKjXmlS0emzZTT_6n6OssU/edit';
  const FUNDING_URL = 'https://docs.google.com/spreadsheets/d/1SMiL7EyX5DM8rE_bPQt_a4Fq_i6Ml4Bqk074IUYgLpE/edit';
  const state = {
    dataset: ORIGINAL, logos: ORIGINAL_LOGOS, nodes: [], byId: new Map(), roots: [],
    view: 'circles', showLending: false, focus: null, component: 'All components', query: '', smallMode: false,
    hover: null
  };
  let mapZoom;
  let mapTransform = zoomIdentity;
  function fitMap(){
    if(mapZoom)d3Select($('#tm-canvas')).call(mapZoom.transform,zoomIdentity);
  }
  const enc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = (million) => {
    const x=Number(million)||0;
    if(x>=1000)return '$'+(x/1000).toLocaleString('en-US',{maximumFractionDigits:2})+'B';
    if(x>=1)return '$'+x.toLocaleString('en-US',{maximumFractionDigits:2})+'M';
    if(x>0)return '$'+(x*1000).toLocaleString('en-US',{maximumFractionDigits:0})+'K';
    return '$0';
  };
  const formatReference = m => '$'+m.toLocaleString('en-US',{maximumFractionDigits:6})+'M';
  const formatPrecise = m => '$'+(Number(m)||0).toLocaleString('en-US',{minimumFractionDigits:3,maximumFractionDigits:3})+'M';
  const $ = (q,root=document) => root.querySelector(q);
  const $$ = (q,root=document) => [...root.querySelectorAll(q)];
  const logo = node => {
    const raw=state.logos?.[node.id]||'';
    if(/^data:image\/(?:png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(raw))return raw;
    if(/^https:\/\/[A-Za-z0-9._~:/?#@!$&'()*+,;=%-]+$/.test(raw))return raw.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
    return '';
  };
  function treeFromData(data){
    const funding = new Map((data.funding||[]).map(row=>[row.orgId,row]));
    const nodes=(data.organizations||[]).map(org=>{
      const f=funding.get(org.id)||{};
      const workbookDirect=Math.max(0,Number(f.amountMillionsDecimal)||0);
      const extra=nonRdte.procurement[org.id];
      const creditSubsidy=org.id==='IEORG-0294'?OSC_CREDIT_SUBSIDY:0;
      const identifiedDirect=workbookDirect+(extra?.amount??0)+creditSubsidy;
      const lending=nonRdte.authority[org.id]?.amount;
      const referenceDirect=getReferenceFunding(org.id);
      const awardAmount=getAwardEvidence(org.id).reduce((sum,award)=>sum+award.amount,0);
      const direct=((state.showLending?lending:undefined) ?? identifiedDirect)+referenceDirect;
      return {...org, type:org.type && org.type !== 'Secretary of War' ? org.type : 'Unclassified', direct, identifiedDirect, referenceDirect, awardAmount, creditSubsidy,
        ba:f.ba||null, evidence:creditSubsidy?OSC_CREDIT_BASIS:extra?extra.basis:(f.scope||''),
        fundingSource:extra?FUNDING_URL:null, fundingOrigin:extra?'Non-RDT&E Funding workbook tab':'Funding workbook',
        isSupplemental:Boolean(extra), overlapNote:f.overlapNote||'', children:[], parent:null, total:0};
    });
    const map=new Map(nodes.map(n=>[n.id,n]));
    const roots=[];
    // Invalid/missing parent links become root entries. A cycle is severed without deleting either organization.
    for(const n of nodes){
      if(n.id===EXCLUDED_ROOT)continue;
      let parent=map.get(n.parentId);
      if(parent===n)parent=null;
      let curr=parent,seen=new Set([n.id]);
      while(curr&&!seen.has(curr.id)){
        seen.add(curr.id);curr=map.get(curr.parentId);
      }
      if(curr)parent=null;
      if(parent){n.parent=parent;parent.children.push(n)} else roots.push(n);
    }
    // Treat the Secretary of War as an invisible organizational root, not a displayed component.
    const secretary=map.get(EXCLUDED_ROOT);
    if(secretary){
      for(const c of secretary.children){c.parent=null;if(!roots.includes(c))roots.push(c)}
      secretary.children=[];
    }
    const calculate=(n)=>{
      n.children.forEach(calculate);
      n.total=n.direct+n.children.reduce((sum,c)=>sum+c.total,0);
      return n.total;
    };
    for(const root of roots)calculate(root);
    state.nodes=nodes.filter(n=>n.id!==EXCLUDED_ROOT);state.byId=map;state.roots=roots;
    if(state.focus&&!map.has(state.focus))state.focus=null;
  }
  treeFromData(ORIGINAL);

  // Proportional binary tiling minimizes thin strips and preserves accurate surface-area weights.
  function rectangles(entries, x,y,w,h){
    const valid=entries.filter(e=>e.weight>0).sort((a,b)=>b.weight-a.weight);
    const out=[];
    function split(rows,rx,ry,rw,rh){
      if(!rows.length||rw<=0||rh<=0)return;
      if(rows.length===1){out.push({item:rows[0],x:rx,y:ry,w:rw,h:rh});return;}
      const total=rows.reduce((s,e)=>s+e.weight,0);
      let sum=0,idx=1,best=Infinity;
      for(let i=1;i<rows.length;i++){
        sum+=rows[i-1].weight;
        const diff=Math.abs(total/2-sum);
        if(diff<best){best=diff;idx=i}
      }
      const left=rows.slice(0,idx),right=rows.slice(idx);
      const ratio=left.reduce((s,e)=>s+e.weight,0)/total;
      if(rw>=rh){const ww=rw*ratio;split(left,rx,ry,ww,rh);split(right,rx+ww,ry,rw-ww,rh)}
      else{const hh=rh*ratio;split(left,rx,ry,rw,hh);split(right,rx,ry+hh,rw,rh-hh)}
    }
    split(valid,x,y,w,h);return out;
  }
  const componentMatch=(n)=>state.component==='All components'||n.type===state.component;
  function selectTotals(n){
    const direct=componentMatch(n)?n.direct:0;
    return direct+n.children.reduce((s,c)=>s+selectTotals(c),0);
  }
  function activeChildren(parent){
    return (parent?parent.children:state.roots).map(n=>({node:n,weight:selectTotals(n)})).filter(e=>e.weight>0);
  }
  function parentsPath(id){
    const items=[];let n=state.byId.get(id),seen=new Set();
    while(n&&!seen.has(n.id)&&n.id!==EXCLUDED_ROOT){seen.add(n.id);items.unshift(n);n=n.parent}
    return items;
  }
  // One hierarchy scope governs BOTH sides of the layout. The selected parent
  // is context, not a subordinate tile in its own right-side list.
  function withinSelectedParent(node,parent){
    if(!parent)return true;
    const seen=new Set();let cursor=node.parent;
    while(cursor&&!seen.has(cursor.id)){
      if(cursor.id===parent.id)return true;
      seen.add(cursor.id);cursor=cursor.parent;
    }
    return false;
  }
  function scopedNodes(){
    const parent=state.focus?state.byId.get(state.focus):null;
    return state.nodes.filter(n=>componentMatch(n)&&withinSelectedParent(n,parent));
  }
  function scopedUnfundedNodes(){
    return scopedNodes().filter(n=>n.total<=0&&!getAwardEvidence(n.id).length);
  }
  function scopeLabel(){
    const n=state.focus?state.byId.get(state.focus):null;
    return n?(n.acronym||n.label):state.component;
  }
  function renderShell(){
    const sheet=document.createElement('style');sheet.id='tm-added-styles';sheet.textContent=ADDED_CSS+`
      #tm-root [style*="--org-border"]{border-color:var(--org-border)}
      #tm-root .tm-tile[style*="--org-border"]{border-width:2px}
      #tm-root .tm-small-links-list button[style*="--org-border"]{border-width:2px;border-color:var(--org-border)}
      #tm-root .tm-org-legend{flex:none;padding:5px 26px;color:var(--tm-muted);font-size:12px}
      #tm-root .tm-org-legend summary{cursor:pointer;width:fit-content}
      #tm-root .tm-org-legend ul{display:flex;flex-wrap:wrap;gap:6px 14px;list-style:none;margin:6px 0 0;padding:0;max-height:100px;overflow:auto}
      #tm-root .tm-org-legend li{display:flex;align-items:center;gap:6px}
      #tm-root .tm-org-legend i{width:12px;height:12px;flex:none;border:2px solid var(--legend-border);border-radius:3px}
      #tm-root .tm-small-links{flex:none;padding:6px 13px 8px;color:var(--tm-muted);font-size:12px}
      #tm-root .tm-small-links-list{display:flex;gap:6px;overflow-x:auto;padding:4px 2px}
      #tm-root .tm-small-links-list button{flex:none;min-height:44px;max-width:100%;overflow-wrap:anywhere;text-align:left;padding:6px 10px;border:1px solid #456078;border-radius:7px;background:#1a3046;color:#eaf2ff}
      #tm-root .tm-small-links-list b{white-space:nowrap}
      #tm-root .tm-tile-visible-label{position:absolute;display:flex;flex-direction:column;gap:3px;pointer-events:none}
      #tm-root .tm-funded-picker{position:relative;flex:1;min-width:170px}
      #tm-root #tm-funded-jump{width:100%;min-height:40px;padding:7px 10px;border:1px solid #456078;border-radius:7px;background:#1a3046;color:#eaf2ff;font-size:16px}
      #tm-root #tm-funded-options{position:absolute;z-index:5;top:100%;left:0;right:0;max-height:220px;overflow:auto;background:#13283c;border:1px solid #456078;border-radius:7px;box-shadow:0 6px 18px #0008}
      #tm-root #tm-funded-options button{display:block;width:100%;min-height:44px;padding:7px 10px;text-align:left;color:#eaf2ff;background:transparent;border:0;border-bottom:1px solid var(--tm-line)}
      #tm-root #tm-funded-options button:hover,#tm-root #tm-funded-options button:focus-visible{background:#274766}
      #tm-root #tm-funded-options small{display:block;color:var(--tm-muted)}
      #tm-root #tm-funded-options p{padding:0 10px}
      @media(max-width:640px){#tm-root .tm-funded-picker{flex-basis:100%}}
      #tm-root .tm-header,#tm-root .tm-summary,#tm-root .tm-bar{flex:none}
      #tm-root .tm-tile.tm-award-tile{border-style:dashed;background:#263c56;text-align:left;font:inherit;cursor:pointer}
      #tm-root .tm-tile.tm-award-tile:hover{background:#35516e}
      #tm-root .tm-award-tile .tm-tile-title{font-size:11px}
      #tm-root .tm-award-tile .tm-tile-sum{font-size:11px}
      #tm-root .tm-funded .tm-canvas,#tm-root .tm-funded .tm-hint{flex-shrink:0}
      #tm-root .tm-tile-title{white-space:normal;overflow-wrap:anywhere;text-overflow:clip;line-height:1.15}
      #tm-root .tm-tile-top{align-items:flex-start}
      #tm-root .tm-tile-top[hidden]{display:none}
      #tm-root .tm-tile.tm-compact{padding:4px}
      #tm-root .tm-small-card-title strong,#tm-root .tm-small-card-title small{display:block;white-space:normal;overflow-wrap:anywhere}
      #tm-root .tm-small-card-bottom{flex-wrap:wrap}
      #tm-root #tm-award-key{margin:0}
      @media(max-width:640px){
        #tm-root .tm-layout{flex:none;min-height:0}
        #tm-root .tm-funded,#tm-root .tm-unfunded{flex:none;min-height:0}
        #tm-root .tm-funded .tm-canvas{flex:none;height:clamp(300px,95vw,460px)}
        #tm-root .tm-context{white-space:normal;overflow-wrap:anywhere}
        #tm-root .tm-unfunded-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
        #tm-root .tm-small-links-list{flex-wrap:wrap;overflow-x:visible}
        #tm-root .tm-small-links-list button{flex:1 1 130px;min-width:0}
      }
      #tm-root #tm-canvas{touch-action:pan-y;cursor:grab}
      #tm-root #tm-canvas.tm-zoomed{touch-action:none}
      #tm-root #tm-canvas:active{cursor:grabbing}
      #tm-root .tm-map-surface{position:absolute;left:0;top:0}
      #tm-root .tm-map-tools{display:flex;align-items:center;gap:6px;padding:4px 13px;flex-wrap:wrap}
      #tm-root .tm-map-tools[hidden]{display:none}
      #tm-root .tm-map-tools button{min-height:44px;min-width:44px;border:1px solid #456078;border-radius:7px;background:#1a3046;color:#eaf2ff}
      #tm-root .tm-map-tools span{font-size:12px;color:#adc0d2}
      @media(max-width:640px){
        #tm-root{padding-bottom:calc(65px + env(safe-area-inset-bottom, 0px))}
        #tm-root .tm-controls{flex-wrap:wrap}
        #tm-root .tm-controls input{font-size:16px;flex-basis:100%}
        #tm-root .tm-controls select{max-width:calc(100% - 54px)}
        #tm-root .tm-small-card-bottom{flex-wrap:wrap}
        #tm-switcher{bottom:calc(8px + env(safe-area-inset-bottom, 0px))}
        #tm-switcher button,#tm-root #tm-small-toggle{min-height:44px}
      }`;document.head.appendChild(sheet);
    const switcher=document.createElement('div');switcher.id='tm-switcher';switcher.innerHTML=`<button type="button" data-view="circles" class="active">◉ Circle view</button><button type="button" data-view="treemap">▦ Treemap view</button>`;
    document.body.appendChild(switcher);
    const panel=document.createElement('div');panel.id='tm-root';panel.hidden=true;
    panel.innerHTML=`
      <header class="tm-header">
        <div class="tm-brand"><span class="tm-mark">▦</span><span><span class="tm-kicker">FY2026 RESOURCE MAP</span><strong>DoW Innovation Ecosystem</strong></span></div>
        <div class="tm-controls"><input id="tm-search" type="search" aria-label="Search organizations" placeholder="Search organizations…" autocomplete="off"/><select id="tm-component" aria-label="Component"><option>All components</option></select><button type="button" id="tm-lending" aria-pressed="false">Size by OSC lending authority</button><button type="button" id="tm-refresh">Refresh</button><button id="tm-help" title="Funding sources and calculation">ⓘ</button></div>
      </header>
      <section class="tm-summary"><div><div class="tm-scope-heading"><img id="tm-hero-logo" alt="" hidden/><div><span class="tm-eyebrow">FY2026 gross identified funding</span><strong id="tm-context" class="tm-context">All components</strong></div></div><strong class="tm-total" id="tm-total">—</strong><div class="tm-subline" id="tm-totalsub">—</div><div class="tm-subline" id="tm-status" role="status"></div></div><div class="tm-summary-actions"><a href="${FUNDING_URL}" target="_blank" rel="noopener">Open funding workbook ↗</a></div></section>
      <div class="tm-bar"><div id="tm-crumbs" class="tm-breadcrumb"></div><span id="tm-caption">Area proportional to direct + descendant funding</span></div>
      <details class="tm-org-legend"><summary>Org Type border legend</summary><ul id="tm-org-legend"></ul></details>
      <main class="tm-layout"><section class="tm-funded"><div class="tm-section-head"><span id="tm-funded-label">Funded hierarchy</span><span id="tm-funded-count"></span></div><div class="tm-funded-jumpbar"><label for="tm-funded-jump">Find a funded organization</label><div class="tm-funded-picker"><input id="tm-funded-jump" type="search" autocomplete="off" placeholder="Search or select a funded organization…" aria-controls="tm-funded-options"/><div id="tm-funded-options" aria-label="Matching funded organizations" hidden></div></div><button type="button" id="tm-small-toggle" aria-pressed="false" title="Inspect the small rectangles as readable equal-size cards, without changing the proportional main chart">🔍 Enlarge small tiles</button></div><div class="tm-small-links" id="tm-small-links" hidden></div><div class="tm-map-tools" role="group" aria-label="Treemap zoom"><button type="button" id="tm-zoom-in" aria-label="Zoom in on treemap">+</button><button type="button" id="tm-zoom-out" aria-label="Zoom out of treemap">−</button><button type="button" id="tm-zoom-fit">Fit</button><span id="tm-zoom-level" role="status">100%</span></div><div id="tm-canvas" class="tm-canvas" aria-label="Organization treemap"></div><p id="tm-award-key" class="tm-hint" hidden>Dashed tiles show reported award evidence. Their areas use space within the parent amount and their dollars stay outside funding totals.</p><div id="tm-small-explorer" class="tm-small-explorer" aria-label="Enlarged small organizations, not proportional to funding" hidden></div><div id="tm-small-funded" class="tm-small-funded" hidden></div><div class="tm-hint">Scroll over the chart, pinch, or use + and − to zoom. Drag the zoomed map to pan, and select Fit to return to the full map. Click a parent to open its branch. Enlarge small tiles shows readable cards. Breadcrumbs return to parent levels.</div></section><aside class="tm-unfunded"><div class="tm-section-head"><span id="tm-unfunded-label">No funding identified</span><span id="tm-unfunded-count"></span></div><p id="tm-unfunded-scope">Same hierarchy scope · equal-size tiles · dashed outlines</p><div id="tm-unfunded-grid" class="tm-unfunded-grid"></div></aside></main>
      <div id="tm-searchresults" class="tm-searchresults" hidden></div><div id="tm-tooltip" role="tooltip" hidden></div>
      <dialog id="tm-settings"><div class="tm-modal"><header><h2>Funding sources</h2><button type="button" id="tm-close" aria-label="Close">×</button></header><p>The treemap sizes tiles using identified funding and documented reference-only awards. Reference awards contribute to chart totals only. Gross totals can include shared funding more than once. The circle view applies overlap rules within each branch.</p><p>APFIT uses the workbook’s FY2026 reported procurement spend plan. OSC includes its $1.5B credit subsidy appropriation under P.L.119-21 plus selected RDT&E. The lending authority toggle sizes OSC using its cumulative lending authority. Turn it off to size OSC by FY2026 identified funding.</p><p><a href="${MASTER_URL}" target="_blank" rel="noopener">Master organizations ↗</a> · <a href="${FUNDING_URL}" target="_blank" rel="noopener">FY2026 workbook ↗</a></p></div></dialog>`;
    document.body.appendChild(panel);
    const select=$('#tm-component');
    Object.keys(COMPONENT_COLORS).filter(k=>state.nodes.some(n=>n.type===k)).sort().forEach(c=>select.add(new Option(c,c)));
    $$('#tm-switcher button').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
    $('#tm-component').addEventListener('change',e=>{state.component=e.target.value;state.focus=null;fitMap();state.smallMode=false;$('#tm-unfunded-grid').scrollTop=0;paint()});
    let workbookRevision = 0;
    function showWorkbookStatus(){
      const {revision, loading, message} = getWorkbookRefresh();
      $('#tm-status').textContent = message;
      $('#tm-refresh').disabled = loading;
      if(revision !== workbookRevision){
        workbookRevision = revision;
        treeFromData(ORIGINAL);
        if(state.view === 'treemap')paint();
      }
    }
    $('#tm-refresh').addEventListener('click',refreshWorkbook);
    subscribeWorkbookRefresh(showWorkbookStatus);
    showWorkbookStatus();
    $('#tm-lending').addEventListener('click',()=>{state.showLending=!state.showLending;treeFromData(ORIGINAL);fitMap();paint()});
    const jump=$('#tm-funded-jump'), options=$('#tm-funded-options');
    jump.addEventListener('focus',paintFundedOptions);
    jump.addEventListener('click',paintFundedOptions);
    jump.addEventListener('input',paintFundedOptions);
    jump.parentElement.addEventListener('focusout',event=>{
      if(!jump.parentElement.contains(event.relatedTarget))options.hidden=true;
    });
    jump.parentElement.addEventListener('keydown',event=>{
      if(event.key==='Escape'){jump.focus();options.hidden=true;}
      if(event.target===jump && (event.key==='ArrowDown'||event.key==='Enter')){
        if(options.hidden)paintFundedOptions();
        const first=$('button',options);
        if(first){event.preventDefault();if(event.key==='Enter')first.click();else first.focus();}
      }
    });
    options.addEventListener('click',event=>{
      const button=event.target.closest('button[data-id]');
      if(button){jump.focus();focusNode(button.dataset.id);}
    });
    $('#tm-small-toggle').addEventListener('click',()=>{state.smallMode=!state.smallMode;paintFunded()});
    $('#tm-small-explorer').addEventListener('click',e=>{const card=e.target.closest('[data-focus]');if(card){if(card.hasAttribute('data-award-card'))showUnfundedDetail(card.dataset.focus);else focusNode(card.dataset.focus)}});
    $('#tm-small-funded').addEventListener('click',e=>{const btn=e.target.closest('[data-id]');if(btn)focusNode(btn.dataset.id)});
    $('#tm-search').addEventListener('input',e=>{state.query=e.target.value.trim().toLowerCase();$('#tm-unfunded-grid').scrollTop=0;paintSearch();paintUnfunded()});
    $('#tm-searchresults').addEventListener('click',e=>{const b=e.target.closest('[data-id]');if(b)focusNode(b.dataset.id)});
    $('#tm-unfunded-grid').addEventListener('click',e=>{const b=e.target.closest('[data-id]');if(b)showUnfundedDetail(b.dataset.id)});
    const mapCanvas=$('#tm-canvas');
    mapZoom=zoom().scaleExtent([1,128])
      .filter(event=>{
        if(event.type==='wheel')return true;
        if(event.type==='touchstart')return event.touches.length>1||mapTransform.k>1;
        return !event.ctrlKey&&!event.button;
      })
      .extent(()=>[[0,0],[mapCanvas.clientWidth,mapCanvas.clientHeight]])
      .translateExtent([[0,0],[mapCanvas.clientWidth,mapCanvas.clientHeight]])
      .clickDistance(6)
      .on('zoom',event=>{
        mapTransform=event.transform;
        mapCanvas.classList.toggle('tm-zoomed',mapTransform.k>1);
        $('#tm-tooltip').hidden=true;
        paintFunded(false);
      });
    d3Select(mapCanvas).call(mapZoom);
    $('#tm-zoom-in').addEventListener('click',()=>d3Select(mapCanvas).call(mapZoom.scaleBy,2));
    $('#tm-zoom-out').addEventListener('click',()=>d3Select(mapCanvas).call(mapZoom.scaleBy,.5));
    $('#tm-zoom-fit').addEventListener('click',fitMap);
    $('#tm-small-links').addEventListener('click',event=>{
      const button=event.target.closest('button[data-focus]');
      if(button)focusNode(button.dataset.focus);
    });
    mapCanvas.addEventListener('click',event=>{
      const award=event.target.closest('[data-award-id]');
      if(award){showUnfundedDetail(award.dataset.awardId);return;}
      const branch=event.target.closest('[data-focus]');
      if(branch)focusNode(branch.dataset.focus);
    });
    $('#tm-canvas').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.dataset.focus){e.preventDefault();focusNode(e.target.dataset.focus)}});
    $('#tm-canvas').addEventListener('pointermove',onMove);
    $('#tm-canvas').addEventListener('pointerleave',()=>$('#tm-tooltip').hidden=true);
    $('#tm-crumbs').addEventListener('click',e=>{const b=e.target.closest('[data-focus]');if(b)focusNode(b.dataset.focus||null)});
    $('#tm-help').addEventListener('click',()=>{$('#tm-settings').showModal()});
    $('#tm-close').addEventListener('click',()=>$('#tm-settings').close());
    window.addEventListener('resize',debounce(()=>{if(state.view==='treemap')paintFunded()},140));
    setView(document.documentElement.dataset.view || 'circles');
    paint();
  }
  function setView(view){
    state.view=view;
    const root=$('#root'),tm=$('#tm-root');
    if(!root||!tm)return;
    root.style.display=view==='treemap'?'none':'';
    tm.hidden=view!=='treemap';
    $$('#tm-switcher button').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);b.setAttribute('aria-pressed',String(b.dataset.view===view))});
    if(view==='treemap')requestAnimationFrame(()=>paint());
  }
  function focusNode(id){
    const organization=id?state.byId.get(id):null;
    if(id && !organization)return;
    if(organization && selectTotals(organization)===0){showUnfundedDetail(id);return}
    state.focus=id||null;
    fitMap();
    // Every zoom selection returns to proportional geometry at the newly selected level.
    state.smallMode=false;
    state.query='';$('#tm-search').value='';$('#tm-searchresults').hidden=true;
    $('#tm-unfunded-grid').scrollTop=0;
    paint();
  }
  function paint(){
    const focusOrg=state.focus?state.byId.get(state.focus):null;
    const direct=state.nodes.filter(n=>n.direct>0 && componentMatch(n));
    const total=focusOrg?selectTotals(focusOrg):direct.reduce((sum,n)=>sum+n.direct,0);
    $('#tm-total').textContent=fmt(total);
    const lendingIncluded=state.showLending && state.nodes.some(n=>
      nonRdte.authority[n.id] && componentMatch(n) &&
      (!focusOrg || n===focusOrg || withinSelectedParent(n,focusOrg)));
    $('#tm-lending').setAttribute('aria-pressed',String(state.showLending));
    const referenceIncluded=direct.some(n=>n.referenceDirect>0 &&
      (!focusOrg||n===focusOrg||withinSelectedParent(n,focusOrg)));
    $('.tm-eyebrow').textContent=referenceIncluded
      ? 'Chart total including reference awards'+(lendingIncluded?' and OSC lending authority':'')
      : lendingIncluded
      ? 'Chart total including OSC lending authority'
      : 'FY2026 gross identified funding';
    $('#tm-context').textContent=focusOrg?focusOrg.label:state.component;
    const hero=$('#tm-hero-logo');const source=focusOrg?logo(focusOrg):'';
    hero.hidden=!source;if(source)hero.src=source;else hero.removeAttribute('src');
    const supplementalIncluded=state.nodes.some(n=>n.id==='IEORG-0334'&&componentMatch(n)&&
      (!focusOrg||n.id===focusOrg.id||withinSelectedParent(n,focusOrg)));
    const provenance=supplementalIncluded?' · includes APFIT’s '+formatPrecise(nonRdte.procurement['IEORG-0334'].amount)+' FY2026 reported procurement spend plan':'';
    $('#tm-totalsub').textContent=(focusOrg?
      `${formatPrecise(focusOrg.identifiedDirect)} ${focusOrg.creditSubsidy?'direct funding across appropriation bases':'FY2026 direct funding'} · ${fmt(total)} chart total including descendants`:
      `${direct.length} organizations with direct amounts · ${state.nodes.length+1} in the master inventory · amounts in USD`)+provenance;
    if(focusOrg?.referenceDirect)$('#tm-totalsub').textContent+=' · '+formatReference(focusOrg.referenceDirect)+' reference-only award funding';
    if(referenceIncluded)$('#tm-totalsub').textContent+=' · reference awards are included in chart totals only';
    const creditIncluded=state.nodes.some(n=>n.creditSubsidy>0&&componentMatch(n)&&
      (!focusOrg||n.id===focusOrg.id||withinSelectedParent(n,focusOrg)));
    if(creditIncluded&&!lendingIncluded)$('#tm-totalsub').textContent+=' · includes OSC’s $1,500M credit subsidy appropriation under P.L.119-21 (separate appropriation basis)';
    const authority=focusOrg&&nonRdte.authority[focusOrg.id];
    if(authority)$('#tm-totalsub').textContent+=' · approx. $'+(authority.amount/1000)+'B cumulative lending authority as of May 2026 (separate)';
    const items=scopedNodes();
    const orgTypes=[...new Set([...items,...(focusOrg?[focusOrg]:[])].map(orgTypeName))].sort();
    $('#tm-org-legend').innerHTML=orgTypes.map(type=>
      `<li><i aria-hidden="true" style="--legend-border:${orgTypeBorder(type)}"></i>${enc(type)}</li>`
    ).join('');
    const label=scopeLabel();
    const scoped=Boolean(focusOrg);
    $('#tm-funded-label').textContent=scoped?'Funded · '+label:'Funded hierarchy';
    $('#tm-unfunded-label').textContent=scoped?'No funding identified · '+label:'No funding identified';
    $('#tm-funded-count').textContent=items.filter(n=>n.total>0).length+' hierarchy nodes';
    $('#tm-unfunded-count').textContent=scopedUnfundedNodes().length+' organizations';
    $('#tm-unfunded-scope').textContent=scoped?
      `Subordinates of ${label} only · equal-size tiles · dashed outlines`:
      'Same hierarchy scope · equal-size tiles · dashed outlines';
    const trail=state.focus?parentsPath(state.focus):[];
    $('#tm-crumbs').innerHTML=`<button type="button" data-focus="">All components</button>`+trail.map(n=>`<span>›</span><button type="button" data-focus="${enc(n.id)}">${enc(n.acronym||n.label)}</button>`).join('');
    const comp=state.component==='All components'?'all components':state.component;
    $('#tm-caption').textContent=`${comp} · FY2026 identified scopes, including the APFIT procurement spend plan · gross amounts may overlap`;
    paintFundedNavigator();paintFunded();paintUnfunded();paintSearch();
  }
  function scopedFundedOptions(){
    return state.nodes.filter(n=>componentMatch(n)&&n.direct>0&&
      (!state.focus||n.id===state.focus||withinSelectedParent(n,state.byId.get(state.focus))))
      .sort((a,b)=>(a.acronym||a.label).localeCompare(b.acronym||b.label));
  }
  function paintFundedOptions(){
    const options=$('#tm-funded-options');
    const query=$('#tm-funded-jump').value.trim().toLowerCase();
    const matches=scopedFundedOptions().filter(n=>`${n.acronym||''} ${n.label}`.toLowerCase().includes(query));
    options.innerHTML=matches.map(n=>{
      const parent=n.parent?(n.parent.acronym||n.parent.label):'Top level';
      return `<button type="button" data-id="${enc(n.id)}">${enc(n.label)}${n.acronym&&!n.label.includes(n.acronym)?' ('+enc(n.acronym)+')':''}<small>${enc(parent)} · ${fmt(n.direct)}</small></button>`;
    }).join('')||'<p>No funded organizations match.</p>';
    options.hidden=false;
  }
  function paintFundedNavigator(){
    const jump=$('#tm-funded-jump'),bar=$('#tm-small-funded');
    if(!jump||!bar)return;
    jump.value='';
    $('#tm-funded-options').hidden=true;
    const scoped=scopedFundedOptions();
    const tiny=scoped.filter(n=>n.direct>0&&n.direct<1).sort((a,b)=>a.direct-b.direct||a.label.localeCompare(b.label));
    bar.hidden=tiny.length===0;
    bar.innerHTML=tiny.length?`<strong>Funded under $1M · selectable</strong><div class="tm-small-funded-items">${tiny.map(n=>`<button type="button" data-id="${enc(n.id)}" title="${enc(parentsPath(n.id).map(x=>x.acronym||x.label).join(' › '))}">${enc(n.acronym||n.label)} <b>${fmt(n.direct)}</b></button>`).join('')}</div>`:'';
  }
  // The explorer is a legibility aid, not a second financial treemap: cards are equal sized,
  // all sums are real, and selecting an organization drills into the proportional treemap.
  function paintSmallExplorer(){
    const container=$('#tm-small-explorer');
    const current=state.focus?state.byId.get(state.focus):null;
    const entries=activeChildren(current);
    const currentTotal=current?selectTotals(current):entries.reduce((s,e)=>s+e.weight,0);
    const minor=entries.filter(e=>currentTotal>0&&e.weight/currentTotal<=.05);
    const smallEntries=new Map(minor.map(entry=>[entry.node.id,entry]));
    // Small direct allocations remain reachable even when nested beneath a large branch.
    for(const node of scopedNodes()){
      if(node.direct>0 && node.direct<1 && !smallEntries.has(node.id)){
        smallEntries.set(node.id,{node,weight:node.direct,directOnly:true});
      }
    }
    const fallback=smallEntries.size===0;
    const awards=scopedNodes().filter(node=>getAwardEvidence(node.id).length)
      .map(node=>({node,weight:node.awardAmount,isAward:true}));
    const list=[...(fallback?entries:smallEntries.values()),...awards]
      .sort((a,b)=>a.weight-b.weight||a.node.label.localeCompare(b.node.label));
    const location=current?(current.acronym||current.label):state.component;
    const explainer=fallback
      ? 'Showing the immediate funded branches at this level.'
      : 'Includes immediate branches at 5% or less of this view and nested organizations with direct funding below $1M.';
    const rows=list.length?list.map(({node:n,weight,directOnly,isAward})=>{
      const img=logo(n);
      const share=currentTotal>0?(100*weight/currentTotal):0;
      const shareText=share<.01&&share>0?'<0.01%':share.toLocaleString('en-US',{maximumFractionDigits:2})+'%';
      const parent=n.parent?(n.parent.acronym||n.parent.label):'Top level';
      return `<button type="button" class="tm-small-card" data-focus="${enc(n.id)}" ${isAward?'data-award-card':''} style="--tm-accent:${COMPONENT_COLORS[n.type]||COMPONENT_COLORS.Unclassified};--org-border:${orgTypeBorder(orgTypeName(n))}" title="${enc(orgTypeName(n))} · Open ${enc(n.label)}"><span class="tm-small-card-heading">${img?`<img alt="" src="${img}" loading="lazy"/>`:'<span class="tm-small-card-fallback">▦</span>'}<span class="tm-small-card-title"><strong>${enc(n.acronym||n.label)}</strong><small>${enc(n.label)}</small></span><span class="tm-small-card-arrow" aria-hidden="true">↗</span></span><span class="tm-small-card-bottom"><b>${isAward?formatReference(weight):formatPrecise(weight)}${directOnly?" direct":""}</b><small>${isAward?'Non-additive award evidence':enc(shareText)+' of view'}</small></span><span class="tm-small-card-parent">Parent: ${enc(parent)}</span></button>`;
    }).join(''):`<div class="tm-small-empty">${current?`<strong>${enc(current.label)}</strong><p>Direct funding: ${fmt(current.direct)}. This organization has no funded subordinates to magnify.</p>`:'No funded branches in this selection.'}</div>`;
    container.innerHTML=`<div class="tm-small-explorer-intro"><div><strong>Small-organization magnifier · ${enc(location)}</strong><p>${enc(explainer)} ${awards.length?' Award evidence is also listed here.':''} Select a card for details.</p></div><span>${list.length} ${list.length===1?'card':'cards'}</span></div><p class="tm-small-scale-warning">Cards enlarged for readability — card areas are <b>not to scale</b>. Dollar amounts and percentages remain actual.</p><div class="tm-small-card-grid">${rows}</div>`;
    container.scrollTop=0;
  }
  function paintSmallLinks(tiles,unreadable){
    const panel=$('#tm-small-links');
    const small=tiles.filter(({item,w,h})=>
      !item.node.isDirect && !item.isAward && (w<=74 || h<=50 || unreadable.has(item.node.id)));
    panel.hidden=!small.length;
    panel.innerHTML=small.length
      ? '<strong>Small funded tiles</strong><div class="tm-small-links-list">'+small.map(({item:{node,weight}})=>
        `<button type="button" data-focus="${enc(node.id)}" style="--org-border:${orgTypeBorder(orgTypeName(node))}" title="${enc(node.label)} · ${enc(orgTypeName(node))}">${enc(node.acronym||node.label)} · <b>${formatPrecise(weight)}</b></button>`
      ).join('')+'</div>'
      : '';
  }
  function paintFunded(updateSmallLinks=true){
    const canvas=$('#tm-canvas');
    const explorer=$('#tm-small-explorer'),toggle=$('#tm-small-toggle');
    if(!canvas||!explorer||!toggle)return;
    toggle.textContent=state.smallMode?'← Back to proportional treemap':'🔍 Enlarge small tiles';
    toggle.setAttribute('aria-pressed',String(state.smallMode));
    toggle.classList.toggle('active',state.smallMode);
    canvas.hidden=state.smallMode;
    $('#tm-award-key').hidden=state.smallMode||!scopedNodes().some(n=>n.awardAmount>0);
    explorer.hidden=!state.smallMode;
    $('.tm-map-tools').hidden=state.smallMode;
    if(state.smallMode)$('#tm-small-links').hidden=true;
    if(state.smallMode){paintSmallExplorer();return;}
    if(canvas.clientWidth===0)return;
    const current=state.focus?state.byId.get(state.focus):null;
    const entries=current?branchEntries(current):activeChildren(null);
    const viewportWidth=canvas.clientWidth,viewportHeight=canvas.clientHeight;
    mapZoom?.translateExtent([[0,0],[viewportWidth,viewportHeight]]);
    const w=viewportWidth*mapTransform.k,h=viewportHeight*mapTransform.k;
    $('#tm-zoom-level').textContent=Math.round(mapTransform.k*100)+'%';
    $('#tm-zoom-out').disabled=mapTransform.k<=1;
    $('#tm-zoom-in').disabled=mapTransform.k>=128;
    canvas.innerHTML='';
    const surface=document.createElement('div');
    surface.className='tm-map-surface';
    surface.style.cssText=`width:${w}px;height:${h}px;transform:translate(${mapTransform.x}px,${mapTransform.y}px)`;
    canvas.appendChild(surface);
    if(!entries.length){canvas.innerHTML='<p class="tm-empty">No funded organizations match this selection.</p>';return}
    const tiles=rectangles(entries,0,0,w,h);
    const unreadable=new Set();
    for(const tile of tiles)drawTile(surface,tile,0,unreadable);
    if(updateSmallLinks)paintSmallLinks(tiles,unreadable);
  }
  function branchEntries(parent){
    const funded=activeChildren(parent);
    const direct=componentMatch(parent)?parent.direct:0;
    const awards=parent.children.filter(node=>componentMatch(node)&&node.awardAmount>0);
    const awardTotal=awards.reduce((sum,node)=>sum+node.awardAmount,0);
    // Keep funded siblings' areas intact. Award tiles use only the parent's direct area.
    // If the evidence exceeds that space, preserve relative award sizes within the cap.
    const awardScale=awardTotal>0?Math.min(1,direct/awardTotal):0;
    const remaining=direct-Math.min(awardTotal,direct);
    if(remaining>0){
      const node={...parent,id:parent.id+'::direct',originalId:parent.id,isDirect:true,
        label:awardScale>0?'Remaining chart area':parent.referenceDirect?'Direct chart amount':'Direct funding',
        acronym:awardScale>0?'Remaining area':parent.referenceDirect?'Reference included':'Direct',
        children:[],direct:remaining,referenceDirect:awardScale>0?0:parent.referenceDirect};
      funded.push({node,weight:remaining,isRemainder:awardScale>0});
    }
    if(awardScale>0){
      for(const node of awards)funded.push({node,weight:node.awardAmount*awardScale,isAward:true,scaled:awardScale<1});
    }
    return funded;
  }
  function drawTile(host,layout,depth,unreadable){
    const {item:{node:n,isAward,isRemainder,scaled},x,y,w,h}=layout;
    if(w<0.7||h<0.7)return;
    const tile=document.createElement(isAward?'button':'div');tile.className='tm-tile';
    const compact=w<125||h<65;
    if(compact)tile.classList.add('tm-compact');
    if(isAward){
      tile.type='button';
      tile.dataset.awardId=n.id;
      tile.classList.add('tm-award-tile');
    }
    const shade=COMPONENT_COLORS[n.type]||COMPONENT_COLORS.Unclassified;
    tile.style.cssText=`left:${x+1}px;top:${y+1}px;width:${Math.max(0,w-2)}px;height:${Math.max(0,h-2)}px;--tile-color:${shade};--tile-depth:${depth};--org-border:${orgTypeBorder(orgTypeName(n))};`;
    const nOriginal=n.originalId?state.byId.get(n.originalId):n;
    const expandable=!isAward&&!n.isDirect&&n.children.some(c=>
      selectTotals(c)>0||(n.direct>0&&componentMatch(c)&&c.awardAmount>0));
    if(expandable)tile.classList.add('tm-expandable');
    const img=logo(nOriginal);
    // Keep a leaf label inside the visible part of its tile when the map is panned.
    const pinLabel=depth===0&&!expandable&&mapTransform.k>1;
    const viewport=host.parentElement;
    const left=pinLabel?Math.max(0,-x-mapTransform.x):0;
    const top=pinLabel?Math.max(0,-y-mapTransform.y):0;
    const labelWidth=pinLabel?Math.min(w-left,viewport.clientWidth-x-mapTransform.x-left):w;
    const labelHeight=pinLabel?Math.min(h-top,viewport.clientHeight-y-mapTransform.y-top):h;
    const showName=labelWidth>36&&labelHeight>22;
    const showAmount=isAward?labelWidth>53&&labelHeight>41:!isRemainder&&labelWidth>74&&labelHeight>50;
    const showLogo=Boolean(img)&&labelWidth>135&&labelHeight>92;
    const name=enc(n.acronym||n.label);
    const longName=enc(n.label);
    const weight=n.isDirect?n.direct:selectTotals(n);
    const amount=isAward?formatReference(n.awardAmount):n.referenceDirect?formatReference(weight):fmt(weight);
    const inlineAmount=expandable&&w>265&&h>55;
    if(showName){
      tile.innerHTML=`<div class="tm-tile-top">${showLogo?`<img class="tm-logo" alt="" src="${img}"/>`:''}<span class="tm-tile-title" title="${longName}">${name}</span>${inlineAmount?`<span class="tm-tile-inlineamount">${amount}</span>`:''}${expandable&&!compact?'<span class="tm-zoom" aria-hidden="true">↗</span>':''}</div>${showAmount&&!inlineAmount?`<span class="tm-tile-sum">${amount}</span>`:''}`;
    }
    if(pinLabel&&showName){
      const label=document.createElement('div');
      label.className='tm-tile-visible-label';
      label.style.cssText=`left:${left+7}px;top:${top+6}px;width:${labelWidth-16}px`;
      label.append(...tile.childNodes);
      tile.appendChild(label);
    }
    if(!isRemainder)tile.dataset.tip=n.originalId||n.id;
    if(isAward){
      tile.title=`${n.label} · ${amount} reported award evidence (non-additive)${scaled?' · area scaled to fit':''}`;
      tile.setAttribute('aria-label',tile.title);
    }
    if(expandable){tile.dataset.focus=n.id;tile.tabIndex=0;tile.setAttribute('role','button');tile.setAttribute('aria-label',`${n.label}, ${amount}, zoom into hierarchy`)}
    else if(!isAward){tile.setAttribute('aria-label',isRemainder?n.label:`${n.label}, ${amount}`)}
    host.appendChild(tile);
    const label=tile.querySelector('.tm-tile-title');
    if(label&&label.getBoundingClientRect().bottom>tile.getBoundingClientRect().bottom-3)label.parentElement.hidden=true;
    if(depth===0&&(!label||label.parentElement.hidden))unreadable.add(n.id);
    if(depth>=2||!expandable)return;
    const entries=branchEntries(n);
    const includesAwards=entries.some(entry=>entry.isAward);
    if(w<(includesAwards?120:160)||h<(includesAwards?85:115))return;
    const labelBottom=tile.lastElementChild?.getBoundingClientRect().bottom;
    const labelSpace=labelBottom===undefined?0:labelBottom-tile.getBoundingClientRect().top+5;
    const inset=Math.max(18,labelSpace);
    const rects=rectangles(entries,6,inset,Math.max(0,w-12),Math.max(0,h-inset-8));
    for(const r of rects)drawTile(tile,r,depth+1,unreadable);
  }
  function paintUnfunded(){
    const grid=$('#tm-unfunded-grid');if(!grid)return;
    const list=scopedUnfundedNodes().filter(n=>!state.query||(n.label+' '+(n.acronym||'')).toLowerCase().includes(state.query));
    list.sort((a,b)=>a.type.localeCompare(b.type)||(a.parent?.label||'').localeCompare(b.parent?.label||'')||a.label.localeCompare(b.label));
    grid.innerHTML=list.map(n=>{const img=logo(n);const name=enc(n.acronym&&n.acronym.length<19?n.acronym:n.label);const parent=enc(n.parent?.label||'Top level');return `<button class="tm-unfunded-tile" data-id="${n.id}" title="${enc(n.label)} · ${enc(orgTypeName(n))} · Parent: ${parent}" style="--tile-color:${COMPONENT_COLORS[n.type]||COMPONENT_COLORS.Unclassified};--org-border:${orgTypeBorder(orgTypeName(n))}">${img?`<img src="${img}" alt="" loading="lazy"/>`:''}<span>${name}</span></button>`}).join('')||'<p class="tm-empty">'+(state.query?'No organizations match your search in this hierarchy.':'No organizations without identified funding in this hierarchy.')+'</p>';
  }
  function paintSearch(){
    const results=$('#tm-searchresults'),q=state.query;
    if(!q){results.hidden=true;return}
    const found=state.nodes.filter(n=>(n.label+' '+(n.acronym||'')).toLowerCase().includes(q)).slice(0,15);
    results.innerHTML=found.map(n=>`<button type="button" data-id="${n.id}"><span>${enc(n.label)}<small class="tm-search-parent">${enc(parentsPath(n.id).slice(0,-1).map(x=>x.acronym||x.label).join(' › '))}</small></span><small>${n.total>0?fmt(n.total):getAwardEvidence(n.id).length?'Reported award evidence':'Funding not identified'}</small></button>`).join('')||'<p>No matching organizations.</p>';
    results.hidden=false;
  }
  function onMove(e){
    const tile=e.target.closest('.tm-tile');const tool=$('#tm-tooltip');if(!tile||!tile.dataset.tip){tool.hidden=true;return}
    const n=state.byId.get(tile.dataset.tip);if(!n){tool.hidden=true;return}
    if(tile.dataset.awardId){tool.hidden=true;return;}
    tool.innerHTML=`<strong>${enc(n.label)}</strong><small>${enc(orgTypeName(n))}</small><small>${enc(parentsPath(n.id).map(x=>x.acronym||x.label).join(' › '))}</small><div><span>${n.creditSubsidy?'Direct funding across appropriation bases':'FY2026 direct funding'}</span><b>${fmt(n.identifiedDirect)}</b></div>${n.referenceDirect?`<div><span>Reference-only awards</span><b>${formatReference(n.referenceDirect)}</b></div>`:''}<div><span>Chart total including descendants</span><b>${fmt(n.total)}</b></div><small>${n.evidence?enc(n.evidence):'Funding scope not identified'}</small>`;
    tool.hidden=false;
    const vw=window.innerWidth,vh=window.innerHeight;
    tool.style.left=Math.max(8,Math.min(e.clientX+18,vw-330))+'px';
    tool.style.top=Math.max(8,Math.min(e.clientY+18,vh-156))+'px';
  }
  function showUnfundedDetail(id){
    const n=state.byId.get(id);if(!n)return;
    const dlg=$('#tm-settings');
    const old=$('.tm-unfunded-detail',dlg);if(old)old.remove();
    const wrap=document.createElement('section');wrap.className='tm-unfunded-detail';
    wrap.innerHTML=`<strong>${enc(n.label)}</strong><p>${enc(n.type)} · ${enc(orgTypeName(n))}</p><p>${n.identifiedDirect>0?formatReference(n.identifiedDirect)+' FY2026 direct funding':'No reconciled FY2026 direct funding recorded'}</p>${n.parent?`<p>Parent: ${enc(n.parent.label)}</p>`:''}`;
    const awards=getAwardEvidence(id);
    if(awards.length){
      const awardRows=awards.map(award=>`<li><strong>${formatReference(award.amount)}</strong>
        <p>${enc(award.basis)}</p><p>${enc(award.treatment)}</p>
        <a href="${FUNDING_URL}#gid=423758257&amp;range=A${award.row}:I${award.row}" target="_blank" rel="noopener">Open workbook record</a></li>`).join('');
      wrap.insertAdjacentHTML('beforeend',`<h3>Reported award evidence (non-additive)</h3><ul>${awardRows}</ul>`);
    }
    $('.tm-modal header',dlg).after(wrap);dlg.showModal();
  }
  function debounce(fn,ms){let handle;return (...args)=>{clearTimeout(handle);handle=setTimeout(()=>fn(...args),ms)}}
  // Defer until the original React app has mounted. No circle nodes or data are rewritten.
  function init(){if(!$('#tm-switcher'))renderShell()}
  if(document.readyState==='complete')setTimeout(init,0);else window.addEventListener('load',init,{once:true});
})();
