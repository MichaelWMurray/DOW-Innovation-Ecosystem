import json, math, io, base64, html, collections, re
from pathlib import Path
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader

OUT=Path('dated_revision'); OUT.mkdir(exist_ok=True)
LANE_ORDER=json.load(open('lane_order.json')) if Path('lane_order.json').exists() else {}
rows=json.load(open('live_sheet_dated.json'))['values'][1:]
d={r[0]:{'label':r[0],'parent':r[2] if len(r)>2 else None,'acro':r[4] if len(r)>4 else None,'image':r[8] if len(r)>8 else None,'type':r[12] if len(r)>12 else None,'priority':r[14] if len(r)>14 else None,'row':i+2} for i,r in enumerate(rows) if r and r[0]}
V={n for n,r in d.items() if (r['priority'] or '2') in ('1','2')}
for n in list(V):
 seen=set()
 while n in d and n not in seen:
  seen.add(n);V.add(n);n=d[n]['parent']
ROOT='Secretary of War';RE=next(n for n in V if 'Research and Engineering (USW' in n)
roots={n for n in V if d[n]['parent']==ROOT and n!=ROOT}
children=collections.defaultdict(list)
for n in V:
 if d[n]['parent']!=n:children[d[n]['parent']].append(n)
for a in children:children[a].sort(key=lambda n:d[n]['row'])
def descendants(n):
 return [c for ch in children[n] for c in [ch]+descendants(ch)]
def find(s):return next(n for n in V if s in n)
SOURCE_EXPECTED=set(V)
nga=next(n for n in V if d[n]['acro']=='NGA')
CHART_OMISSIONS=[]
V-=set(CHART_OMISSIONS)
for p in list(children):children[p]=[n for n in children[p] if n in V]
W=3220;H=W*11/17;CW=192;CH=50;DX=284;DY=55;X0=66;YROOT=115;YBODY=175
pos={};groups=[];component={};notes=[]
def place(n,col,y,comp):
 assert n not in pos,n
 pos[n]=(X0+col*DX,y);component[n]=comp
def height(n):return 1+max([height(k) for k in children[n]] or [0])
def order(n):return sorted(children[n],key=lambda k:(height(k),len(descendants(k)),d[k]['row']))
def tree(n):return [n]+[a for k in order(n) for a in tree(k)]
def seq(ns,col,y,comp):
 for n in ns:place(n,col,y,comp);y+=(54 if comp==RE else DY)
 return y
def panel(title,ns,col,y,comp):
 step=54 if comp==RE else DY
 y+=22;top=y-18;y=seq(ns,col,y,comp);groups.append((title,col,top,y-step+CH+3,ns));return y+2
execs=[next(n for n in V if d[n]['acro']==a) for a in ['DARPA','DIU','MDA','SCO','TRMC','OSC']]
ST=find('Assistant Secretary of War for Science');CT=find('Assistant Secretary of War for Critical');MC=find('Assistant Secretary of War for Mission')
u=[n for n in children[ST] if d[n]['type']=='University Affiliated Research Center'];f=[n for n in children[ST] if d[n]['type']=='Federally Funded Research and Development Center'];m=children['ManTech'];commons='Microelectronics Commons'
IS=find('Under Secretary of War for Intelligence');POL=find('Under Secretary of War for Policy')
def small(n,col):place(n,col,YROOT,n);seq(tree(n)[1:],col,YBODY,n)
place(RE,0,YROOT,RE)
y=panel('Innovation Execution Organizations',execs,0,YBODY,RE)
y=seq([a for e in execs for a in descendants(e)],0,y,RE)
y=seq([ST],0,y,RE);y=panel('UARCs',u,0,y,RE)
y=seq(['ManTech'],0,y,RE);panel('Manufacturing Innovation Institutes (MIIs)',m,0,y,RE)
small('TRANSCOM',1)
y=seq([a for n in order(RE) if n not in execs+[ST,CT,MC] for a in tree(n)],1,YBODY+3*DY+12,RE)
y=panel('FFRDCs',f,1,y,RE);seq([a for n in order(ST) if n not in u+f+['ManTech'] for a in tree(n)],1,y,RE)
small(IS,2)
y=seq(tree(MC),2,YBODY+(len(descendants(IS))+1)*DY,RE);y=seq([CT]+[n for n in order(CT) if n!=commons],2,y,RE);panel('Microelectronics Commons',[commons]+children[commons],2,y,RE)
place('Army',3,YROOT,'Army');t2=next(n for n in V if d[n]['acro']=='T2COM');seq([a for n in order('Army') if n!=t2 for a in tree(n)],3,YBODY,'Army');seq(tree(t2),4,YBODY+3*DY,'Army');small('CYBERCOM',4)
NAVSEA=next(n for n in V if d[n]['acro']=='NAVSEA');place('Navy',5,YROOT,'Navy');nav_leaves=[n for n in order('Navy') if not children[n]][:3];seq(nav_leaves,5,YBODY,'Navy');seq(tree(NAVSEA),5,YBODY+3*DY+12,'Navy')
navroots=[n for n in order('Navy') if n!=NAVSEA and n not in nav_leaves]
# Keep whole branches together; balance the two remaining Navy columns.
best=None
for mask in range(1<<len(navroots)):
 a=[n for i,n in enumerate(navroots) if mask>>i&1];b=[n for n in navroots if n not in a];na=sum(len(tree(n)) for n in a)+4;nb=sum(len(tree(n)) for n in b)+4
 score=(max(na,nb),abs(na-nb))
 if best is None or score<best[0]:best=(score,a,b)
for col,ns,offset in [(6,best[1],4),(7,best[2],4)]:seq([a for n in ns for a in tree(n)],col,YBODY+offset*DY,'Navy')
small('SOCOM',7);small(POL,6)
af='United States Air Force (USAF)';AFMC=next(n for n in V if d[n]['acro']=='AFMC');AFLCMC=next(n for n in V if d[n]['acro']=='AFLCMC');place(af,8,YROOT,af)
seq([AFMC]+[a for n in order(AFMC) if n!=AFLCMC for a in tree(n)],8,YBODY,af)
seq([a for n in order(af) if n!=AFMC for a in tree(n)]+tree(AFLCMC),9,YBODY+3*DY,af);small('Deputy Secretary of War',9)
SF='United States Space Force (USSF)';NG='National Guard Bureau (NGB)';AS='USW(A&S)'
small(NG,10)
seq(tree(AS),10,YBODY+(len(descendants(NG))+2)*DY,AS)
af_end=max(y+CH for n,(x,y) in pos.items() if component[n]==af and x==X0+8*DX)
sf_y=YBODY+(math.ceil((af_end-YBODY)/DY)+1)*DY
seq(tree(SF),8,sf_y,SF)
for n in descendants(SF)+descendants(AS):
 x,y=pos[n];pos[n]=(x,y+8)
place(ROOT,7,25,ROOT)
pos[ROOT]=((W-CW)/2,25)
EMPHASIZED=roots|{ROOT}
def card_box(n):
 x,y=pos[n]
 return (x-10,y-2,CW+20,CH+4) if n in EMPHASIZED else (x,y,CW,CH)
# Reserve actual routing space, including the larger component cards.
old_pos=dict(pos)
for col_x in sorted({x for n,(x,y) in pos.items() if n!=ROOT}):
 column=sorted((n for n in pos if n!=ROOT and pos[n][0]==col_x),key=lambda n:pos[n][1])
 shift=0;previous=None
 for n in column:
  x,y=old_pos[n];pos[n]=(x,y+shift)
  if previous:
   bx,by,bw,bh=card_box(previous);nx,ny,nw,nh=card_box(n)
   kids=children[previous]
   needs_turn=bool(kids) and not(len(kids)==1 and kids[0]==n)
   parent=d[n]['parent'];siblings=children[parent]
   top_turn=len(siblings)==1 and parent!=previous
   gap=12 if needs_turn or top_turn else 5
   if ny<by+bh+gap:
    extra=by+bh+gap-ny;shift+=extra;pos[n]=(x,y+shift)
  previous=n
# Keep each wrapper aligned to its moved member cards.
groups=[(t,col,top+pos[ns[0]][1]-old_pos[ns[0]][1],bottom+pos[ns[-1]][1]-old_pos[ns[-1]][1],ns) for t,col,top,bottom,ns in groups]
unplaced=sorted(V-set(pos));assert not unplaced,unplaced
assert max(y+CH for x,y in pos.values())<H-30,(max(y+CH for x,y in pos.values()),H)
pdfmetrics.registerFont(TTFont('DejaVu',str(Path(__file__).resolve().parent/'fonts'/'DejaVuSans.ttf')))
pdfmetrics.registerFont(TTFont('DejaVuBold',str(Path(__file__).resolve().parent/'fonts'/'DejaVuSans-Bold.ttf')))
PURPLE='#542b7c';GRAY='#b8bdc5';BLUE='#6f9fbd';INK='#344257'
SECOND_LINE='#ad7944'
CONNECTOR_COLORS={}
BORDER_COLORS={
 'Partnership Intermediary Agreement':'#008577',
 'Consortium':'#cb7016',
 'Center of Excellence':'#365bb3',
 'Software Factory':'#b23c75',
}
GROUP_COLORS={
 'Innovation Execution Organizations':('#eee3fa','#a480c2','#66338b'),
 'FFRDCs':('#deecfc','#78a4ce','#285e91'),
 'UARCs':('#e3f1d8','#91b971','#3f6d29'),
 'Manufacturing Innovation Institutes (MIIs)':('#fff0d2','#d5ab54','#875d12'),
 'Microelectronics Commons':('#fbe3e3','#cc9090','#974e56'),
}
def wrap(txt,size,width):
 words=[];lines=[];line=''
 for token in txt.split():
  while pdfmetrics.stringWidth(token,'DejaVu',size)>width:
   k=max(i for i in range(1,len(token)+1) if pdfmetrics.stringWidth(token[:i],'DejaVu',size)<=width)
   breaks=[i+1 for i,ch in enumerate(token[:k]) if ch in '-/']
   if breaks and breaks[-1]>=k/2:k=breaks[-1]
   words.append(token[:k]);token=token[k:]
  if token:words.append(token)
 for w in words:
  trial=(line+' '+w).strip()
  if pdfmetrics.stringWidth(trial,'DejaVu',size)>width and line:lines.append(line);line=w
  else:line=trial
 if line:lines.append(line)
 return lines

def calculate_routes(selected,lane_order=None):
 routes=[];reqs=[]
 for p in sorted(selected,key=lambda n:(pos[n][1],pos[n][0])):
  kids=[n for n in children[p] if n in selected];px,py=pos[p];bycol=collections.defaultdict(list)
  for n in kids:
   x,y=pos[n]
   if p==ROOT:
    if n in [SF,AS]:
     gx=x-38
     routes.append({'parent':p,'points':[(px+CW/2,py+CH),(px+CW/2,100),(gx,100),(gx,y-6),(x+CW/2,y-6),(x+CW/2,y)]})
    else:routes.append({'parent':p,'points':[(px+CW/2,py+CH),(px+CW/2,100),(x+CW/2,100),(x+CW/2,y)]})
   elif len(kids)==1 and x==px and y>py and not any(ax==x and py<ay<y for ax,ay in pos.values()):routes.append({'parent':p,'points':[(px+CW/2,py+CH),(x+CW/2,y)]})
   else:bycol[x].append(n)
  for x,ns in bycol.items():
   assert min(pos[n][1] for n in ns)>py,(p,ns)
   reqs.append({'parent':p,'x':x,'children':ns,'start':py+CH+(8 if p in EMPHASIZED else 6),'end':max(pos[n][1]+CH/2 for n in ns),'single':len(kids)==1})
 lanes=collections.defaultdict(list)
 for r in sorted(reqs,key=lambda r:(r['x'],r['start'],-r['end'])):
  lane=0;x=r['x']
  while any(l==lane and not(r['end']<a or r['start']>b) for l,a,b in lanes[x]):lane+=1
  lanes[x].append((lane,r['start'],r['end']));r['gx']=x-30+lane*8
  if r['parent']==AFMC and x==X0+9*DX:r['gx']=x-34
  if x==X0+1*DX and r['parent']==ST:r['gx']=x-38
  if x==X0+2*DX and r['parent']==RE:r['gx']=x-38
 for r in reqs:
  p=r['parent'];px,py=pos[p];gx=r['gx'];sy=r['start']
  for n in r['children']:
   x,y=pos[n];pts=[(px+CW/2,py+CH),(px+CW/2,sy),(gx,sy)]
   if p==RE and x in [X0+DX,X0+2*DX]:
    own=next(q for q in reqs if q['parent']==RE and q['x']==X0)
    turn=pos[execs[2]][1]+CH+2.5
    pts=[(px+CW/2,py+CH),(px+CW/2,own['start']),(own['gx'],own['start']),(own['gx'],turn),(gx,turn)]
    if x==X0+2*DX:
     middle=next(q for q in reqs if q['parent']==RE and q['x']==X0+DX)
     mx=middle['gx'];late=max(pos[k][1]+CH for k in middle['children'] for k in [k]+descendants(k))+6
     pts=[(px+CW/2,py+CH),(px+CW/2,own['start']),(own['gx'],own['start']),(own['gx'],turn),(mx,turn),(mx,late),(gx,late)]
   if p=='Navy' and x in [X0+6*DX,X0+7*DX]:
    own=next(q for q in reqs if q['parent']=='Navy' and q['x']==X0+5*DX)
    turn=max(card_box(k)[1]+card_box(k)[3] for k in nav_leaves+descendants(POL)+descendants('SOCOM'))+6
    pts=[(px+CW/2,py+CH),(px+CW/2,own['start']),(own['gx'],own['start']),(own['gx'],turn),(gx,turn)]
   if r['single']:pts +=[(gx,y-6),(x+CW/2,y-6),(x+CW/2,y)]
   else:pts +=[(gx,y+CH/2),(x,y+CH/2)]
   routes.append({'parent':p,'points':pts})
 for route in routes:
  if route['parent'] in EMPHASIZED:
   x,y=route['points'][0];route['points'][0]=(x,y+2)
  if route['parent']==ROOT:
   x,y=route['points'][-1];route['points'][-1]=(x,y-2)
 return routes

ACRO_COUNTS=collections.Counter((d[n]['acro'] or '').strip() for n in V)
def display(n):
 if n==ROOT:return 'Secretary of War'
 if 'MIT Artificial Intelligence Accelerator' in n:return 'DAF–MIT AI Accelerator'
 a=(d[n]['acro'] or '').strip()
 if a and len(a)<=30 and ACRO_COUNTS[a]==1:return a
 short=n.replace('United States','U.S.').replace('Department of the','Dept. of the').replace('Assistant Secretary of the Army for Acquisition, Logistics and Technology','ASA(ALT)').replace('Under Secretary of War for','USW').replace('Assistant Secretary of War for','ASW')
 return short

def render(stem,only_re=False):
 selected={n for n in pos if component[n]==RE} if only_re else set(pos)
 width=4*DX+60 if only_re else W;height=H
 c=canvas.Canvas(str(OUT/(stem+'.pdf')),pagesize=(1224,792) if not only_re else (width*.4,height*.4))
 scale=1224/W if not only_re else .4;c.scale(scale,scale)
 svg=[f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{width}" height="{height}" viewBox="0 0 {width} {height}">']
 def rect(x,y,w,h,fill,stroke=None,sw=1):
  c.setFillColor(fill);c.setStrokeColor(stroke or fill);c.setLineWidth(sw);c.rect(x,height-y-h,w,h,fill=1,stroke=bool(stroke))
  svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" stroke="{stroke or "none"}" stroke-width="{sw}"/>')
 def txt(x,y,t,size=12,color=INK,bold=False):
  font='DejaVuBold' if bold else 'DejaVu';c.setFillColor(color);c.setFont(font,size);c.drawString(x,height-y,t)
  svg.append(f'<text x="{x}" y="{y}" font-family="DejaVu Sans" font-size="{size}" fill="{color}" font-weight="{700 if bold else 400}">{html.escape(t)}</text>')
 segments=[]; routed=[]; active_parent=None
 def line(points):
  segments.extend(zip(points,points[1:]));routed.append({'parent':active_parent,'points':points})
 def draw_bundles():
  bundles=collections.defaultdict(lambda:collections.defaultdict(list))
  for route in routed:
   for (x1,y1),(x2,y2) in zip(route['points'],route['points'][1:]):
    if (x1,y1)==(x2,y2):continue
    axis,fixed,a,b=('v',x1,y1,y2) if x1==x2 else ('h',y1,x1,x2)
    bundles[route['parent']][axis,fixed].append(tuple(sorted((a,b))))
  for parent,axes in bundles.items():
   commands=[];p=c.beginPath()
   for (axis,fixed),intervals in axes.items():
    merged=[]
    for a,b in sorted(intervals):
     if merged and a<=merged[-1][1]:merged[-1][1]=max(b,merged[-1][1])
     else:merged.append([a,b])
    for a,b in merged:
     x1,y1,x2,y2=(fixed,a,fixed,b) if axis=='v' else (a,fixed,b,fixed)
     p.moveTo(x1,height-y1);p.lineTo(x2,height-y2)
     commands.append(f'M {x1} {y1} L {x2} {y2}')
   # Draw each parent's complete union, so halos never erase sibling junctions.
   for color,sw in [('#ffffff',3.8),([BLUE,SECOND_LINE,'#496983'][CONNECTOR_COLORS.get(parent,0)],1.8)]:
    c.setStrokeColor(color);c.setLineWidth(sw);c.drawPath(p)
    svg.append(f'<path d="{" ".join(commands)}" fill="none" stroke="{color}" stroke-width="{sw}"/>')
 rect(0,0,width,height,'#ffffff')
 if not only_re:
  txt(X0,48,'DoW Innovation Ecosystem',40,PURPLE,True)
  txt(X0,69,f'Live sheet • 28 September 2026 • Priority 1–2 + structural ancestors • {len(V)} organization cards',13,'#ffffff')
  update_label='September 2026'
  txt(W-66-pdfmetrics.stringWidth(update_label,'DejaVuBold',28),48,update_label,28,PURPLE,True)
  legend_x=W-560;legend_y=1700
  txt(legend_x,legend_y,'Innovation Organization Types',16,INK,True)
  lx=legend_x;ly=legend_y+25
  for label,(fill,border,heading) in GROUP_COLORS.items():
   short=label.replace('Manufacturing Innovation Institutes (MIIs)','MIIs').replace('Innovation Execution Organizations','Innovation Execution')
   rect(lx,ly-13,16,16,fill,border,1);txt(lx+23,ly,short,12,heading,True)
   ly+=21
  lx=legend_x+280;ly=legend_y+25
  for label,border in BORDER_COLORS.items():
   short={'Partnership Intermediary Agreement':'PIAs','Consortium':'Consortiums','Center of Excellence':'Centers of Excellence','Software Factory':'Software Factories'}[label]
   rect(lx,ly-13,22,16,'#ffffff',border,2.7);txt(lx+29,ly,short,12,border,True)
   ly+=21
  rect(lx,ly-6,12,3,BLUE);rect(lx+17,ly-6,12,3,SECOND_LINE);rect(lx+34,ly-6,12,3,'#496983')
  txt(lx+54,ly,'Parent branches',12)
  txt(legend_x,1848,'Created and maintained by Michael Murray',18,PURPLE,True)
  import qrcode
  qr_destinations=[('Interactive map','https://kumu.io/mwmurray/innovationecosystem#innovation-ecosystem',legend_x+5,160),('LinkedIn','https://www.linkedin.com/in/michael-w-murray',legend_x+290,148)]
  for label,url,qx,size in qr_destinations:
   qr=qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M,border=4,box_size=10)
   qr.add_data(url);qr.make(fit=True);matrix=qr.get_matrix();unit=size/len(matrix);qy=1870
   rect(qx,qy,size,size,'#ffffff')
   for row,cells in enumerate(matrix):
    for col,on in enumerate(cells):
     if on:rect(qx+col*unit,qy+row*unit,unit,unit,'#000000')
   c.linkURL(url,(qx,height-qy-size,qx+size,height-qy),relative=1,thickness=0)
   label_x=qx+(size-pdfmetrics.stringWidth(label,'DejaVuBold',15))/2
   txt(label_x,2050,label,15,PURPLE,True)
  txt(legend_x,2071,'Independent reference • Not an official DoW publication',12,INK)
 for title,col,top,bottom,members in groups:
  if not set(members)&selected:continue
  fill,border,heading=GROUP_COLORS[title]
  x=X0+col*DX;rect(x-6,top-3,CW+12,bottom-top+3,fill,border,1.4)
  titlelines=wrap(title,10.2,CW)
  if len(titlelines)>1:titlelines=[title.replace('Manufacturing Innovation Institutes (MIIs)','Manufacturing Innovation Institutes')]
  group_title={'Innovation Execution Organizations':'Innovation Execution Organizations','Manufacturing Innovation Institutes (MIIs)':'MIIs'}.get(title,title)
  heading_size=min(13,CW/pdfmetrics.stringWidth(group_title,'DejaVuBold',1))
  txt(x,top+11,group_title,heading_size,heading,True)
 routes0=calculate_routes(selected,LANE_ORDER)
 graph=collections.defaultdict(set);vertical=[]
 for r in routes0:
  for a,b in zip(r['points'],r['points'][1:]):
   col=round((a[0]-X0)/DX)
   if a[0]==b[0] and abs(a[1]-b[1])>1 and X0+col*DX-55<=a[0]<X0+col*DX:
    vertical.append((r['parent'],a[0],min(a[1],b[1]),max(a[1],b[1])))
 for p,x,a,b in vertical:
  for q,z,lo,hi in vertical:
   if p!=ROOT and q!=ROOT and p!=q and 0<abs(x-z)<40 and max(a,lo)<min(b,hi):graph[p].add(q)
 CONNECTOR_COLORS[ROOT]=2
 for n in sorted(graph,key=lambda n:-len(graph[n])):
  if n in CONNECTOR_COLORS:continue
  CONNECTOR_COLORS[n]=0;queue=[n]
  for p in queue:
   for q in sorted(graph[p]):
    if q not in CONNECTOR_COLORS:CONNECTOR_COLORS[q]=1-CONNECTOR_COLORS[p];queue.append(q)
 for route in routes0:
  active_parent=route['parent'];line(route['points'])
 draw_bundles()
 imagefails=[];textfails=[]
 for n in sorted(selected,key=lambda n:d[n]['row']):
  x,y,cw,ch=card_box(n);svg.append(f'<g id="org-row-{d[n]["row"]}" data-label="{html.escape(n,quote=True)}"><title>{html.escape(n)}</title>')
  border='#000000' if n in EMPHASIZED else BORDER_COLORS.get(d[n]['type'],GRAY)
  rect(x,y,cw,ch,'#ffffff',border,3.8 if n in EMPHASIZED else (2.7 if d[n]['type'] in BORDER_COLORS else .9))
  image=d[n]['image'];has=False
  if image and image.startswith('data:image'):
   try:
    b=base64.b64decode(image.split(',',1)[1]);im=Image.open(io.BytesIO(b)).convert('RGBA')
    from PIL import ImageChops
    bg=Image.new('RGBA',im.size,'white');bg.alpha_composite(im)
    bbox=ImageChops.difference(bg.convert('RGB'),Image.new('RGB',im.size,'white')).point(lambda z:255 if z>28 else 0).getbbox()
    if bbox:im=im.crop(bbox)
    iw,ih=im.size;factor=min(70/iw,(ch-6)/ih);iw*=factor;ih*=factor;ix=x+4;iy=y+(ch-ih)/2
    c.drawImage(ImageReader(im),ix,height-iy-ih,iw,ih,mask='auto')
    logo_buf=io.BytesIO();im.save(logo_buf,format='PNG');logo_uri='data:image/png;base64,'+base64.b64encode(logo_buf.getvalue()).decode()
    svg.append(f'<image x="{ix}" y="{iy}" width="{iw}" height="{ih}" preserveAspectRatio="xMinYMid meet" xlink:href="{logo_uri}"/>');has=True
   except Exception as e:imagefails.append([n,str(e)])
  tx=x+79;avail=cw-85;size=19
  label=n
  while size>7.0:
   lines=wrap(label,size,avail)
   if len(lines)*size*1.12<=ch-10:break
   size-=.2
  if len(lines)*size*1.12>ch-8:textfails.append(n)
  yy=y+(ch-len(lines)*size*1.12)/2+size*.86
  for t in lines:txt(tx,yy,t,size,PURPLE);yy+=size*1.12
  svg.append('</g>')
 if not only_re:
  if unplaced:
   txt(X0+14*DX,1898,'Source relationships requiring resolution',15,INK,True)
   txt(X0+14*DX,1919,'Shown without inferred parents; live sheet unchanged.',12)
  for n in unplaced:
   x,y=pos[n];p=d[n]['parent'];note=('Parent not found: '+p) if p and p not in d else ('Parent: '+p if p else 'Parent blank in source')
   for j,t in enumerate(wrap(note,10,CW)):txt(x,y+CH+15+j*12,t,10)
  txt(X0+DX,H-33,'Read top to bottom, then left to right. Connectors preserve source relationships. Full organization names retained.',12,'#ffffff')
  txt(X0+DX,H-16,f'{len(V)} organization cards • 11 columns • 17 × 11 inches • Print at actual size / 100%.',11,'#ffffff')
 c.showPage();c.save();svg.append('</svg>');(OUT/(stem+'.svg')).write_text('\n'.join(svg))
 (OUT/'connector_colors.json').write_text(json.dumps(CONNECTOR_COLORS,indent=2))
 return {'image_failures':imagefails,'text_overflows':textfails,'segments':segments,'routed':routed}

if __name__=='__main__':
 import sys
 if '--re' in sys.argv:render('re_block_inspection',True)
 else:
  result=render('defense_innovation_ecosystem_11x17')
  (OUT/'connector_routes.json').write_text(json.dumps(result['routed']))
  overlaps=[]
  for i,a in enumerate(pos):
   for b in list(pos)[i+1:]:
    ax,ay,aw,ah=card_box(a);bx,by,bw,bh=card_box(b)
    if max(ax,bx)<min(ax+aw,bx+bw) and max(ay,by)<min(ay+ah,by+bh):overlaps.append([a,b])
  counts={t:[n for n in V if d[n]['type']==t] for t in ['Manufacturing Innovation Institute','University Affiliated Research Center','Federally Funded Research and Development Center']}
  crossings=[]
  for (x1,y1),(x2,y2) in result['segments']:
   for n in pos:
    x,y,cw,ch=card_box(n)
    if (x1==x2 and x<x1<x+cw and max(min(y1,y2),y)<min(max(y1,y2),y+ch)) or (y1==y2 and y<y1<y+ch and max(min(x1,x2),x)<min(max(x1,x2),x+cw)):crossings.append(n)
  report={'live_filter_count':len(SOURCE_EXPECTED),'chart_only_omissions':CHART_OMISSIONS,'source_rows':len(d),'expected_visible':len(V),'rendered_cards':len(pos),'missing':sorted(V-set(pos)),'duplicates':[],'card_overlaps':overlaps,'connector_card_crossings':crossings,'image_failures':result['image_failures'],'text_overflows':result['text_overflows'],'groups':counts,'microelectronics_hubs':children[commons],'innovation_execution':execs,'unresolved_or_unparented_cards':unplaced,'source_parent_missing':sorted({d[n]['parent'] for n in V if d[n]['parent'] and d[n]['parent'] not in d}),'visible_organizations':[{'label':n,'row':d[n]['row'],'parent':d[n]['parent'],'position':pos[n]} for n in sorted(V,key=lambda n:d[n]['row'])]}
  (OUT/'validation.json').write_text(json.dumps(report,indent=2));print(json.dumps({k:v for k,v in report.items() if k not in ['visible_organizations','groups']},indent=2))
