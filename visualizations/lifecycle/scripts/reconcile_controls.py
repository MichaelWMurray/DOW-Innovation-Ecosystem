"""Reconcile request controls without inventing project allocations or transfer destinations."""
from decimal import Decimal
R1='https://comptroller.war.gov/Portals/45/Documents/defbudget/FY2026/FY2026_r1.pdf'
OSD='https://comptroller.war.gov/Portals/45/Documents/defbudget/FY2026/budget_justification/pdfs/03_RDT_and_E/RDTE_OSD_PB_2026.pdf'
SF='https://www.saffm.hq.af.mil/Portals/84/documents/FY26/FY26%20Space%20Force%20Research%20and%20Development%20Test%20and%20Evaluation.pdf?ver=zaaWCAiIUa6XVMOcGxpo4w%3D%3D'
def reconcile(D,catalog,relationship,approve,questions):
 def pe(num,ba):return next(r for r in catalog.values() if r['number']==num and r['ba']==ba)
 ledger=[]
 # The PE control is independently stated in the R-1 and the R-2 change explanation.
 r=pe('0603941D8Z',3);pub=Decimal(str(r['amount']));assert pub==Decimal('1095.772')
 published_projects=sum(Decimal(str(p['amount'])) for p in r['projects']);assert published_projects==pub
 corrections={'091':Decimal('579.223'),'098':Decimal('14.762')}
 corrected=sum(corrections.get(p['number'],Decimal(str(p['amount']))) for p in r['projects']);variance=corrected-pub
 assert variance==Decimal('359.000')
 trmc={'id':'TRMC-PE-control','pe':r['number'],'status':'PE control reconciled; project notes remain inconsistent','publishedDiscretionary':float(pub),'mandatoryRequest':550.0,'combinedRequest':float(pub+Decimal('550')),'activeDiscretionary':float(pub),'publishedProjectSum':float(published_projects),'noteCorrectedDiscretionaryProjectSum':float(corrected),'unresolvedProjectVariance':float(variance),'note':'R-1 and R-2 change explanation both establish $1,095.772M discretionary plus $550M mandatory. Changing projects 091 and 098 as directed by the R-2 note would exceed the discretionary PE control by $359M. Use the PE control for the bubble; do not invent a balancing reduction to project 112. Mandatory request is recorded separately and not added to the discretionary display.','sources':[R1,OSD,'https://www.trmc.osd.mil/']}
 approve('TRMC',r,evidence=r['mission'][-1000:],basis='Official TRMC program list establishes management of T&E S&T. R-1 and the R-2 change explanation reconcile the discretionary PE control; conflicting project corrections are not summed into it.')
 for n in D['nodes']:
  for z in n['relationships']:
   if z['number']==r['number'] and z['ba']==3:
    z['reconciliation']=trmc
    for p in z['projects']:
     if p['number'] in corrections:p['reconciliation']={'publishedAmount':p['amount'],'sourceNoteAmount':float(corrections[p['number']]),'status':'Source correction does not reconcile with the PE control; original table value preserved.'}
     if p['number']=='112':p['reconciliation']={'publishedAmount':p['amount'],'separateMandatoryRequest':550.0,'status':'Mandatory request is separate from the discretionary table. Do not add it to the displayed discretionary PE total.'}
 ledger.append(trmc)
 # Keep a published PB request as a request. The note does not identify an approved destination.
 r=pe('1206601SF',2);assert r['amount']==245.497
 approve('AFRL',r,evidence='This program is executed by the Air Force Research Laboratory (AFRL). '+r['mission'][-1800:],basis='Published R-1 and R-2 request agree. The source identifies a future $10M outgoing realignment but no destination. Preserve it once in the published source PE, flagged pending; do not fabricate a destination or a completed transfer.')
 af={'id':'SF-unlocated-transfer','pe':r['number'],'status':'Published request reconciled; $10M destination not specified','publishedDiscretionary':245.497,'activeDiscretionary':245.497,'pendingOutgoing':10.0,'destination':None,'transferApplied':False,'note':'R-1 and R-2 agree on the $245.497M published request. The R-2 says $10M was programmed here erroneously and will be realigned after enactment, without naming a destination. It remains counted once in its published PE; no invented recipient or second amount. This is a request snapshot, not a claim that the transfer has occurred.','sources':[R1,SF]}
 ledger.append(af)
 for n in D['nodes']:
  for z in n['relationships']:
   if z['number']==r['number']:z['reconciliation']=af
 # A fully specified same-PE BA transfer: subtract from source BA and add once to destination BA.
 src=pe('1206616SF',2);dst=pe('1206616SF',3);assert src['amount']==2.591 and dst['amount']==128.588
 moved=Decimal(str(src['amount']));after=Decimal(str(dst['amount']))+moved
 transfer={'id':'SF-BA2-to-BA3','pe':src['number'],'status':'Source-noted intended BA realignment normalized; total conserved','publishedBA2':src['amount'],'publishedBA3':dst['amount'],'activeBA2':0.0,'activeBA3':float(after),'amountMoved':float(moved),'sourceProject':'621010','destinationProject':'634868','note':'Normalize the explicitly specified source-noted realignment for display: $2.591M from BA2 / project 621010 into BA3 / project 634868. Published amounts remain in the source records. Combined PE request remains $131.179M. This depicts the book’s stated intended alignment, not verified post-enactment execution.','sources':[R1,SF]}
 approve('AFRL',dst,evidence=dst['mission'][:2000],basis='Source explicitly executes the program through AFRL. The specified BA2-to-BA3 realignment is normalized with both legs and preserved original values.')
 z=relationship('AFRL',dst);z['contextComponents']=[{'id':dst['id']+'-published-base','number':dst['number']+' / published BA3','title':'Published BA3 request','ba':3,'amount':dst['amount'],'scopeLevel':'PE-component','basis':'Published BA3 base retained; BA2 transfer is a separate component.'},{'id':src['id']+'-transfer-to-BA3','number':src['number']+' / BA2 transfer','title':'Source-noted BA2 to BA3 realignment','ba':3,'amount':src['amount'],'scopeLevel':'transfer','projectNumber':'634868','basis':transfer['note'],'originPeKey':'3620|1206616SF|2'}]
 for n in D['nodes']:
  for rr in n['relationships']:
   if rr['number']==src['number']:
    rr['reconciliation']=transfer;rr['reconciledAmount']=float(after) if rr['ba']==3 else 0
    if rr['ba']==2:rr['contextScope']=False;rr['contextComponents']=[];rr['contextBasis']='Source-noted BA2 funding displayed once in destination BA3; excluded here to prevent duplication.'
    for q in rr['projects']:
     if rr['ba']==3 and q['number']=='634868':q['reconciliation']={'publishedAmount':q['amount'],'intendedAlignedAmount':float(Decimal(str(q['amount']))+moved),'status':'Source-noted incoming BA2 transfer; intended alignment, not confirmed execution.'}
 ledger.append(transfer)
 questions=[q for q in questions if not(q['pe'] in ['1206601SF','1206616SF','0603941D8Z'] and ('correction' in q['reason'].lower() or 'realign' in q['reason'].lower() or 'erroneous' in q['reason'].lower()))]
 return ledger,questions
